from datetime import datetime, timezone
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from deps import get_current_user, require_roles
from models.user import User, Role
from models.project import Project, ProjectMember, ProjectStatus
from schemas.project import ProjectCreate, ProjectUpdate, ProjectOut, AddMemberBody
from core.audit import log_action
from core.config import settings
import asyncio
import core.email as mailer

router = APIRouter(prefix="/projects", tags=["projects"])


async def _build_out(project: Project, db: AsyncSession) -> ProjectOut:
    """Populate client info and member ids."""
    from sqlalchemy import select as sel
    client_result = await db.execute(sel(User).where(User.id == project.client_id))
    client = client_result.scalar_one_or_none()

    member_ids = [m.user_id for m in project.members]

    return ProjectOut(
        id=project.id,
        code=project.code,
        name=project.name,
        description=project.description,
        status=project.status,
        total_value=project.total_value,
        advance_percent=project.advance_percent,
        progress=project.progress,
        start_date=project.start_date,
        estimated_date=project.estimated_date,
        delivered_at=project.delivered_at,
        drive_folder_id=project.drive_folder_id,
        client_id=project.client_id,
        client_name=client.name if client else "",
        client_email=client.email if client else "",
        member_ids=member_ids,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


async def _next_code(db: AsyncSession) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"SD4A-{year}-"
    result = await db.execute(
        select(func.count()).select_from(Project).where(Project.code.like(f"{prefix}%"))
    )
    count = result.scalar() or 0
    return f"{prefix}{(count + 1):03d}"


# ─── LIST ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ProjectOut])
async def list_projects(
    status: Optional[ProjectStatus] = Query(None),
    client_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Project)

    if current_user.role == Role.CLIENT:
        q = q.where(Project.client_id == current_user.id)
    elif current_user.role == Role.ENGINEER:
        # Engineers see projects where they're members
        member_sub = select(ProjectMember.project_id).where(ProjectMember.user_id == current_user.id)
        q = q.where(Project.id.in_(member_sub))

    if status:
        q = q.where(Project.status == status)
    if client_id and current_user.role == Role.ADMIN:
        q = q.where(Project.client_id == client_id)

    q = q.order_by(Project.created_at.desc())
    result = await db.execute(q)
    projects = result.scalars().all()

    return [await _build_out(p, db) for p in projects]


# ─── CREATE ───────────────────────────────────────────────────────────────────

@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    current_user: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    # Verify client exists
    client_result = await db.execute(select(User).where(User.id == body.client_id, User.role == Role.CLIENT))
    client = client_result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    code = await _next_code(db)
    project = Project(
        id=str(uuid.uuid4()),
        code=code,
        name=body.name,
        description=body.description,
        client_id=body.client_id,
        total_value=body.total_value,
        advance_percent=body.advance_percent,
        start_date=body.start_date,
        estimated_date=body.estimated_date,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    await log_action(db, "PROJECT_CREATED", f"Proyecto {code} creado: {body.name}",
                     user_id=current_user.id, project_id=project.id,
                     metadata={"code": code, "client_id": body.client_id})
    await db.commit()

    # Email al cliente — fire & forget
    if client:
        advance_amount = float(body.total_value) * body.advance_percent / 100
        asyncio.create_task(mailer.send_project_created(
            to=client.email,
            client_name=client.name,
            project_name=body.name,
            project_code=code,
            total_value=f"${float(body.total_value):,.0f} COP",
            advance_percent=body.advance_percent,
            advance_amount=f"${advance_amount:,.0f} COP",
            app_url=settings.APP_URL,
            project_id=project.id,
        ))

    return await _build_out(project, db)


# ─── GET ONE ──────────────────────────────────────────────────────────────────

@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    if current_user.role == Role.CLIENT and project.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sin acceso a este proyecto")
    if current_user.role == Role.ENGINEER:
        member_ids = [m.user_id for m in project.members]
        if current_user.id not in member_ids:
            raise HTTPException(status_code=403, detail="Sin acceso a este proyecto")

    return await _build_out(project, db)


# ─── UPDATE ───────────────────────────────────────────────────────────────────

@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    current_user: User = Depends(require_roles(Role.ADMIN, Role.ENGINEER)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    changes = body.model_dump(exclude_none=True)
    old_status = str(project.status)
    for field, value in changes.items():
        setattr(project, field, value)

    project.updated_at = datetime.now(timezone.utc)
    await log_action(db, "PROJECT_UPDATED", f"Proyecto {project.code} actualizado",
                     user_id=current_user.id, project_id=project.id, metadata=changes)
    await db.commit()
    await db.refresh(project)

    # Email al cliente con cualquier cambio
    client_result = await db.execute(select(User).where(User.id == project.client_id))
    client = client_result.scalar_one_or_none()
    if client and changes:
        new_status = str(project.status)
        if "status" in changes and old_status != new_status:
            asyncio.create_task(mailer.send_status_changed(
                to=client.email,
                client_name=client.name,
                project_name=project.name,
                project_code=project.code,
                old_status=old_status,
                new_status=new_status,
                app_url=settings.APP_URL,
                project_id=project.id,
            ))
        else:
            asyncio.create_task(mailer.send_project_updated(
                to=client.email,
                client_name=client.name,
                project_name=project.name,
                project_code=project.code,
                changes=changes,
                app_url=settings.APP_URL,
                project_id=project.id,
            ))

    return await _build_out(project, db)


# ─── DELETE ───────────────────────────────────────────────────────────────────

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    await log_action(db, "PROJECT_DELETED", f"Proyecto {project.code} eliminado: {project.name}",
                     user_id=current_user.id, metadata={"code": project.code})
    await db.delete(project)
    await db.commit()


# ─── MEMBERS ──────────────────────────────────────────────────────────────────

@router.post("/{project_id}/members", response_model=ProjectOut)
async def add_member(
    project_id: str,
    body: AddMemberBody,
    current_user: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # Check already member
    existing = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == body.user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El usuario ya es miembro")

    member = ProjectMember(project_id=project_id, user_id=body.user_id)
    db.add(member)
    await db.commit()
    await db.refresh(project)
    return await _build_out(project, db)


@router.delete("/{project_id}/members/{user_id}", response_model=ProjectOut)
async def remove_member(
    project_id: str,
    user_id: str,
    current_user: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    await db.delete(member)
    await db.commit()

    proj_result = await db.execute(select(Project).where(Project.id == project_id))
    project = proj_result.scalar_one_or_none()
    return await _build_out(project, db)
