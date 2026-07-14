import asyncio
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from deps import get_current_user, require_roles
from models.user import User, Role
from models.project import Project
from models.payment import Payment, PaymentStatus
from models.deliverable import Deliverable
from core.drive import upload_file, download_file, delete_file, create_project_folder
from core.audit import log_action
from core.config import settings
import core.email as mailer

router = APIRouter(prefix="/deliverables", tags=["deliverables"])


def _safe_filename(name: str) -> str:
    """Elimina caracteres que permiten inyección de cabeceras HTTP."""
    import re
    clean = re.sub(r'[\r\n"\\/\x00-\x1f]', "", name or "archivo").strip()
    return clean[:200] or "archivo"

DELIVERABLES_FOLDER_SUFFIX = "_entregables"
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
    "text/plain", "text/csv",
    "application/zip", "application/x-zip-compressed",
    "application/octet-stream",
    "model/gltf-binary", "model/gltf+json",
}


async def _ensure_drive_folder(proj: Project, db: AsyncSession) -> str:
    if not proj.drive_folder_id:
        folder_id = create_project_folder(proj.code, proj.name)
        proj.drive_folder_id = folder_id
        await db.commit()
    return proj.drive_folder_id


async def _client_has_full_payment(project_id: str, user_id: str, db: AsyncSession) -> bool:
    from sqlalchemy import func as sqlfunc
    from decimal import Decimal

    proj = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not proj:
        return False

    result = await db.execute(
        select(sqlfunc.coalesce(sqlfunc.sum(Payment.amount), 0)).where(
            Payment.project_id == project_id,
            Payment.user_id == user_id,
            Payment.status == PaymentStatus.CONFIRMED,
        )
    )
    total_paid = result.scalar() or Decimal("0")
    return Decimal(str(total_paid)) >= Decimal(str(proj.total_value))


# ─── LIST DELIVERABLES ────────────────────────────────────────────────────────

@router.get("/project/{project_id}")
async def list_deliverables(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    proj = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not proj:
        raise HTTPException(404, "Proyecto no encontrado")

    if current_user.role == Role.CLIENT and proj.client_id != current_user.id:
        raise HTTPException(403, "Sin acceso")

    result = await db.execute(
        select(Deliverable).where(
            Deliverable.project_id == project_id,
            Deliverable.is_active == True,
        ).order_by(Deliverable.created_at.desc())
    )
    deliverables = result.scalars().all()

    # For clients: check payment
    has_payment = True
    if current_user.role == Role.CLIENT:
        has_payment = await _client_has_full_payment(project_id, current_user.id, db)

    return {
        "deliverables": [
            {
                "id": d.id,
                "name": d.name,
                "mime_type": d.mime_type,
                "size": d.size,
                "description": d.description,
                "created_at": d.created_at.isoformat(),
                "can_download": current_user.role != Role.CLIENT or has_payment,
            }
            for d in deliverables
        ],
        "has_payment": has_payment,
        "total": len(deliverables),
    }


# ─── UPLOAD DELIVERABLE ───────────────────────────────────────────────────────

@router.post("/project/{project_id}", status_code=status.HTTP_201_CREATED)
async def upload_deliverable(
    project_id: str,
    file: UploadFile = File(...),
    description: str = Form(""),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.ENGINEER)),
    db: AsyncSession = Depends(get_db),
):
    proj = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not proj:
        raise HTTPException(404, "Proyecto no encontrado")

    folder_id = await _ensure_drive_folder(proj, db)
    content = await file.read()
    mime = file.content_type or "application/octet-stream"

    # Validación de tamaño
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, f"Archivo demasiado grande. Máximo permitido: 50 MB")

    # Validación de tipo
    if mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(415, f"Tipo de archivo no permitido: {mime}")

    drive_file = upload_file(folder_id, f"[ENTREGABLE] {file.filename}", content, mime)

    deliverable = Deliverable(
        id=str(uuid.uuid4()),
        project_id=project_id,
        uploaded_by=current_user.id,
        drive_file_id=drive_file["id"],
        name=file.filename,
        mime_type=mime,
        size=str(drive_file.get("size", "")),
        description=description or None,
    )
    db.add(deliverable)
    await log_action(db, "DELIVERABLE_UPLOADED",
                     f"Entregable subido: {file.filename}",
                     user_id=current_user.id, project_id=project_id,
                     metadata={"name": file.filename, "drive_id": drive_file["id"]})
    await db.commit()
    await db.refresh(deliverable)

    # Email al cliente — fire & forget
    client_result = await db.execute(select(User).where(User.id == proj.client_id))
    client = client_result.scalar_one_or_none()
    if client:
        mailer.fire(mailer.send_deliverable_uploaded(
            to=client.email,
            client_name=client.name,
            project_name=proj.name,
            project_code=proj.code,
            file_name=file.filename or "archivo",
            app_url=settings.APP_URL,
            project_id=project_id,
        ))

    return deliverable


# ─── DOWNLOAD DELIVERABLE ─────────────────────────────────────────────────────

@router.get("/{deliverable_id}/download")
async def download_deliverable(
    deliverable_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    d = (await db.execute(select(Deliverable).where(Deliverable.id == deliverable_id))).scalar_one_or_none()
    if not d or not d.is_active:
        raise HTTPException(404, "Entregable no encontrado")

    # Clients must have a confirmed payment
    if current_user.role == Role.CLIENT:
        proj = (await db.execute(select(Project).where(Project.id == d.project_id))).scalar_one_or_none()
        if not proj or proj.client_id != current_user.id:
            raise HTTPException(403, "Sin acceso")
        if not await _client_has_full_payment(d.project_id, current_user.id, db):
            raise HTTPException(403, "Debes realizar el pago total para descargar los archivos")

    try:
        content, filename = download_file(d.drive_file_id)
    except Exception:
        raise HTTPException(404, "Archivo no disponible en Drive")

    await log_action(db, "DELIVERABLE_DOWNLOADED",
                     f"Entregable descargado: {d.name}",
                     user_id=current_user.id, project_id=d.project_id,
                     metadata={"deliverable_id": deliverable_id})
    await db.commit()

    return Response(
        content=content,
        media_type=d.mime_type or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{_safe_filename(d.name)}"'},
    )


# ─── DELETE DELIVERABLE ───────────────────────────────────────────────────────

@router.delete("/{deliverable_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deliverable(
    deliverable_id: str,
    current_user: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    d = (await db.execute(select(Deliverable).where(Deliverable.id == deliverable_id))).scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Entregable no encontrado")

    try:
        delete_file(d.drive_file_id)
    except Exception:
        pass

    d.is_active = False
    await log_action(db, "DELIVERABLE_DELETED", f"Entregable eliminado: {d.name}",
                     user_id=current_user.id, project_id=d.project_id,
                     metadata={"deliverable_id": deliverable_id})
    await db.commit()
