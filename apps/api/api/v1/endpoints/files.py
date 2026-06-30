from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from deps import get_current_user, require_roles
from models.user import User, Role
from models.project import Project
from core.drive import list_files, upload_file, delete_file, download_file, get_file_metadata
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


async def _get_project_or_403(project_id: str, user: User, db: AsyncSession) -> Project:
    proj = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not proj:
        raise HTTPException(404, "Proyecto no encontrado")
    if user.role == Role.CLIENT and proj.client_id != user.id:
        raise HTTPException(403, "Sin acceso")
    if user.role == Role.ENGINEER:
        from models.project import ProjectMember
        m = (await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user.id,
            )
        )).scalar_one_or_none()
        if not m:
            raise HTTPException(403, "Sin acceso")
    return proj


# ─── LIST FILES ───────────────────────────────────────────────────────────────

@router.get("/project/{project_id}")
async def list_project_files(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    proj = await _get_project_or_403(project_id, current_user, db)
    if not proj.drive_folder_id:
        return []
    return list_files(proj.drive_folder_id)


# ─── UPLOAD FILE ──────────────────────────────────────────────────────────────

@router.post("/project/{project_id}", status_code=status.HTTP_201_CREATED)
async def upload_project_file(
    project_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.ENGINEER)),
    db: AsyncSession = Depends(get_db),
):
    proj = await _get_project_or_403(project_id, current_user, db)

    # Crear carpeta Drive si el proyecto no tiene una
    if not proj.drive_folder_id:
        from core.drive import create_project_folder
        folder_id = create_project_folder(proj.code, proj.name)
        proj.drive_folder_id = folder_id
        await db.commit()

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_SIZE_MB:
        raise HTTPException(400, f"Archivo demasiado grande (máx {MAX_SIZE_MB} MB)")

    mime = file.content_type or "application/octet-stream"
    result = upload_file(proj.drive_folder_id, file.filename, content, mime)

    await log_action(db, "FILE_UPLOADED", f"Archivo subido: {file.filename}",
                     user_id=current_user.id, project_id=project_id,
                     metadata={"file_id": result["id"], "name": file.filename, "size_mb": round(size_mb, 2)})
    await db.commit()
    return result


# ─── DOWNLOAD FILE ────────────────────────────────────────────────────────────

@router.get("/download/{file_id}")
async def download_project_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
):
    try:
        content, filename = download_file(file_id)
    except Exception:
        raise HTTPException(404, "Archivo no encontrado")

    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ─── DELETE FILE ──────────────────────────────────────────────────────────────

@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_file(
    file_id: str,
    project_id: str,
    current_user: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    try:
        meta = get_file_metadata(file_id)
        delete_file(file_id)
    except Exception:
        raise HTTPException(404, "Archivo no encontrado")

    await log_action(db, "FILE_DELETED", f"Archivo eliminado: {meta.get('name', file_id)}",
                     user_id=current_user.id, project_id=project_id,
                     metadata={"file_id": file_id})
    await db.commit()
