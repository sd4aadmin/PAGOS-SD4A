import uuid
import logging
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.responses import Response
from sqlalchemy import select, func as sqlfunc
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from db.session import get_db
from deps import get_current_user, require_roles
from models.user import User, Role
from models.project import Project
from models.project_file import ProjectFile, FolderCategory
from models.payment import Payment, PaymentStatus
from core.drive import list_files, upload_file, delete_file, download_file, get_file_metadata, create_project_folder
from core.audit import log_action

router = APIRouter(prefix="/files", tags=["files"])

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
    "application/x-zip-compressed",
    "image/jpeg", "image/png", "image/webp",
    "application/octet-stream",
    "application/vnd.autodesk.revit",
    "application/x-ifc",
}
MAX_SIZE_MB = 100


def _safe_filename(name: str) -> str:
    """Elimina caracteres que permiten inyección de cabeceras HTTP o rutas."""
    import re
    clean = re.sub(r'[\r\n"\\/\x00-\x1f]', "", name or "archivo").strip()
    return clean[:200] or "archivo"


async def _get_project_or_403(project_id: str, user: User, db: AsyncSession) -> Project:
    proj = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not proj:
        raise HTTPException(404, "Proyecto no encontrado")
    if user.role == Role.CLIENT and proj.client_id != user.id:
        raise HTTPException(403, "Sin acceso")
    # ENGINEER has access to all projects
    return proj


async def _ensure_drive_folders(proj: Project, db: AsyncSession) -> None:
    """Crea carpeta raíz + subcarpetas en Drive si no existen aún."""
    if not proj.drive_folder_id:
        try:
            root_id, subfolders = create_project_folder(proj.code, proj.name)
        except Exception as exc:
            logger.error("Drive folder creation failed: %s", exc, exc_info=True)
            raise HTTPException(500, f"Error al crear carpeta en Google Drive: {exc}")
        proj.drive_folder_id = root_id
        proj.drive_subfolders = subfolders
        await db.commit()


async def _pending_balance(project_id: str, db: AsyncSession) -> Decimal:
    """Retorna el saldo pendiente del proyecto (total_value - pagos confirmados)."""
    proj = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not proj:
        return Decimal("0")
    paid = (await db.execute(
        select(sqlfunc.coalesce(sqlfunc.sum(Payment.amount), 0)).where(
            Payment.project_id == project_id,
            Payment.status == PaymentStatus.CONFIRMED,
        )
    )).scalar_one()
    return proj.total_value - Decimal(str(paid))


# ─── LIST FILES ───────────────────────────────────────────────────────────────

@router.get("/project/{project_id}")
async def list_project_files(
    project_id: str,
    category: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    proj = await _get_project_or_403(project_id, current_user, db)
    if not proj.drive_folder_id:
        return []

    q = select(ProjectFile).where(
        ProjectFile.project_id == project_id,
        ProjectFile.deleted_at.is_(None),
    )
    if category:
        q = q.where(ProjectFile.category == category)
    q = q.order_by(ProjectFile.created_at.desc())

    rows = (await db.execute(q)).scalars().all()

    pending = await _pending_balance(project_id, db)
    can_download = current_user.role != Role.CLIENT or pending <= 0

    return [
        {
            "id": f.id,
            "drive_file_id": f.drive_file_id,
            "filename": f.filename,
            "category": f.category,
            "mime_type": f.mime_type,
            "size_bytes": f.size_bytes,
            "version": f.version,
            "version_label": f.version_label,
            "description": f.description,
            "is_deliverable": f.is_deliverable,
            "uploaded_by": f.uploaded_by,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "can_download": can_download,
        }
        for f in rows
    ]


# ─── UPLOAD FILE ──────────────────────────────────────────────────────────────

@router.post("/project/{project_id}", status_code=status.HTTP_201_CREATED)
async def upload_project_file(
    project_id: str,
    file: UploadFile = File(...),
    category: str = Query(FolderCategory.MEMORIAS.value),
    is_deliverable: bool = Query(False),
    description: str | None = Query(None),
    version_label: str | None = Query(None),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.ENGINEER)),
    db: AsyncSession = Depends(get_db),
):
    if category not in [c.value for c in FolderCategory]:
        raise HTTPException(400, f"Categoría inválida. Opciones: {[c.value for c in FolderCategory]}")

    proj = await _get_project_or_403(project_id, current_user, db)
    await _ensure_drive_folders(proj, db)

    mime_check = file.content_type or "application/octet-stream"
    if mime_check not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, f"Tipo de archivo no permitido: {mime_check}")

    content = await file.read()
    size_bytes = len(content)
    if size_bytes > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"Archivo demasiado grande (máx {MAX_SIZE_MB} MB)")

    subfolders: dict = proj.drive_subfolders or {}
    target_folder = subfolders.get(category, proj.drive_folder_id)

    # Calcular versión: cuántos archivos con el mismo nombre base existen
    base_name = _safe_filename(file.filename or "archivo")
    existing = (await db.execute(
        select(sqlfunc.count()).where(
            ProjectFile.project_id == project_id,
            ProjectFile.filename == base_name,
            ProjectFile.deleted_at.is_(None),
        )
    )).scalar_one()
    version = existing + 1

    mime = file.content_type or "application/octet-stream"
    versioned_name = f"{base_name}" if version == 1 else f"[V{version}] {base_name}"
    try:
        drive_file = upload_file(target_folder, versioned_name, content, mime)
    except Exception as exc:
        logger.error("Drive upload failed: %s", exc, exc_info=True)
        raise HTTPException(500, f"Error al subir a Google Drive: {exc}")

    pf = ProjectFile(
        id=str(uuid.uuid4()),
        project_id=project_id,
        uploaded_by=current_user.id,
        drive_file_id=drive_file["id"],
        drive_folder_id=target_folder,
        category=category,
        filename=base_name,
        mime_type=mime,
        size_bytes=size_bytes,
        version=version,
        version_label=version_label,
        description=description,
        is_deliverable=is_deliverable,
    )
    db.add(pf)

    await log_action(
        db, "FILE_UPLOADED",
        f"Archivo subido: {versioned_name} ({category})",
        user_id=current_user.id, project_id=project_id,
        metadata={"file_id": drive_file["id"], "category": category, "version": version, "size_mb": round(size_bytes / 1024 / 1024, 2)},
    )
    await db.commit()
    return {"id": pf.id, "drive_file_id": drive_file["id"], "filename": base_name, "version": version, "category": category}


# ─── DOWNLOAD FILE ────────────────────────────────────────────────────────────

@router.get("/download/{file_id}")
async def download_project_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pf = (await db.execute(
        select(ProjectFile).where(ProjectFile.id == file_id, ProjectFile.deleted_at.is_(None))
    )).scalar_one_or_none()

    if not pf:
        raise HTTPException(404, "Archivo no encontrado")

    # Verificar acceso al proyecto
    await _get_project_or_403(pf.project_id, current_user, db)

    # Bloquear descarga a clientes con saldo pendiente
    if current_user.role == Role.CLIENT:
        pending = await _pending_balance(pf.project_id, db)
        if pending > 0:
            raise HTTPException(403, f"Debes pagar el saldo pendiente (${pending:,.0f}) para descargar archivos")

    try:
        content, filename = download_file(pf.drive_file_id)
    except Exception:
        raise HTTPException(404, "Archivo no disponible en Drive")

    await log_action(
        db, "FILE_DOWNLOADED", f"Archivo descargado: {pf.filename}",
        user_id=current_user.id, project_id=pf.project_id,
        metadata={"file_id": file_id},
    )
    await db.commit()

    return Response(
        content=content,
        media_type=pf.mime_type or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{_safe_filename(filename)}"'},
    )


# ─── PREVIEW FILE ─────────────────────────────────────────────────────────────

PREVIEW_PDF_PAGES = 1        # páginas visibles sin pagar
PREVIEW_IMG_MAX = 480        # lado máximo en px sin pagar


def _pdf_first_pages(content: bytes, pages: int) -> bytes:
    """Devuelve un PDF nuevo con solo las primeras `pages` páginas."""
    import io
    from pypdf import PdfReader, PdfWriter
    reader = PdfReader(io.BytesIO(content))
    writer = PdfWriter()
    for i in range(min(pages, len(reader.pages))):
        writer.add_page(reader.pages[i])
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def _image_thumbnail(content: bytes, max_side: int) -> tuple[bytes, str]:
    """Reduce la imagen a un tamaño de muestra (baja resolución)."""
    import io
    from PIL import Image as PILImage
    img = PILImage.open(io.BytesIO(content))
    img.thumbnail((max_side, max_side))
    out = io.BytesIO()
    if img.mode in ("RGBA", "P"):
        img.save(out, format="PNG")
        return out.getvalue(), "image/png"
    img.convert("RGB").save(out, format="JPEG", quality=70)
    return out.getvalue(), "image/jpeg"


@router.get("/preview/{file_id}")
async def preview_project_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Vista previa: si el cliente tiene saldo pendiente, solo ve una parte
    (primera página del PDF o imagen en baja resolución)."""
    pf = (await db.execute(
        select(ProjectFile).where(ProjectFile.id == file_id, ProjectFile.deleted_at.is_(None))
    )).scalar_one_or_none()
    if not pf:
        raise HTTPException(404, "Archivo no encontrado")

    await _get_project_or_403(pf.project_id, current_user, db)

    mime = pf.mime_type or "application/octet-stream"
    is_pdf = "pdf" in mime
    is_image = mime.startswith("image/")
    if not (is_pdf or is_image):
        raise HTTPException(400, "Este tipo de archivo no tiene vista previa")

    # ¿Acceso completo o solo muestra?
    full_access = current_user.role != Role.CLIENT or (await _pending_balance(pf.project_id, db)) <= 0

    try:
        content, filename = download_file(pf.drive_file_id)
    except Exception:
        raise HTTPException(404, "Archivo no disponible en Drive")

    limited = False
    out_mime = mime
    if not full_access:
        limited = True
        try:
            if is_pdf:
                content = _pdf_first_pages(content, PREVIEW_PDF_PAGES)
            else:
                content, out_mime = _image_thumbnail(content, PREVIEW_IMG_MAX)
        except Exception as exc:
            logger.error("Preview generation failed: %s", exc, exc_info=True)
            raise HTTPException(500, "No se pudo generar la vista previa")

    return Response(
        content=content,
        media_type=out_mime,
        headers={
            "Content-Disposition": f'inline; filename="{_safe_filename(filename)}"',
            "X-Preview-Limited": "1" if limited else "0",
            "Access-Control-Expose-Headers": "X-Preview-Limited",
        },
    )


# ─── DELETE FILE ──────────────────────────────────────────────────────────────

@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_file(
    file_id: str,
    current_user: User = Depends(require_roles(Role.ADMIN, Role.ENGINEER)),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone

    pf = (await db.execute(
        select(ProjectFile).where(ProjectFile.id == file_id, ProjectFile.deleted_at.is_(None))
    )).scalar_one_or_none()
    if not pf:
        raise HTTPException(404, "Archivo no encontrado")

    try:
        delete_file(pf.drive_file_id)
    except Exception:
        pass  # Si ya no existe en Drive, igual marcamos como eliminado

    pf.deleted_at = datetime.now(timezone.utc).replace(tzinfo=None)

    await log_action(
        db, "FILE_DELETED", f"Archivo eliminado: {pf.filename}",
        user_id=current_user.id, project_id=pf.project_id,
        metadata={"file_id": file_id},
    )
    await db.commit()


# ─── CATEGORÍAS DISPONIBLES ───────────────────────────────────────────────────

@router.get("/categories")
async def get_categories():
    return [{"value": c.value, "label": c.value} for c in FolderCategory]
