"""Solicitudes de cambio de un proyecto.

Solo un ADMIN las registra (ya se habló con el cliente). Si el responsable es el
cliente, el valor del cambio se suma al valor del proyecto; si es SD4A, se registra
sin costo. El cliente ve los cambios de su proyecto y recibe un correo al registrarse.
"""
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from deps import get_current_user, require_roles
from models.user import User, Role
from models.project import Project
from models.project_change import ProjectChange
from schemas.change import ProjectChangeCreate, ProjectChangeOut, ChangeResponsible
from core.audit import log_action
from core.project_status import refresh_project_status, confirmed_paid_total
from core.config import settings
import core.email as mailer

router = APIRouter(prefix="/projects/{project_id}/changes", tags=["changes"])


def _cop(value: Decimal) -> str:
    return f"${float(value):,.0f} COP"


def _out(change: ProjectChange, author_name: str | None) -> ProjectChangeOut:
    return ProjectChangeOut(
        id=change.id,
        project_id=change.project_id,
        description=change.description,
        responsible=change.responsible,
        amount=change.amount,
        charged=change.responsible == ChangeResponsible.CLIENT and change.amount > 0,
        created_by_name=author_name,
        created_at=change.created_at,
    )


async def _project_or_404(project_id: str, db: AsyncSession, lock: bool = False) -> Project:
    q = select(Project).where(Project.id == project_id)
    if lock:
        q = q.with_for_update()  # evita perder una suma si dos cambios se registran a la vez
    proj = (await db.execute(q)).scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return proj


# ─── LISTAR ───────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ProjectChangeOut])
async def list_changes(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    proj = await _project_or_404(project_id, db)
    if current_user.role == Role.CLIENT and proj.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sin acceso a este proyecto")

    rows = (await db.execute(
        select(ProjectChange, User.name)
        .join(User, User.id == ProjectChange.created_by, isouter=True)
        .where(ProjectChange.project_id == project_id)
        .order_by(ProjectChange.created_at.desc())
    )).all()
    return [_out(c, name) for c, name in rows]


# ─── REGISTRAR (solo ADMIN) ───────────────────────────────────────────────────

@router.post("", response_model=ProjectChangeOut, status_code=status.HTTP_201_CREATED)
async def create_change(
    project_id: str,
    body: ProjectChangeCreate,
    current_user: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    proj = await _project_or_404(project_id, db, lock=True)

    if body.responsible == ChangeResponsible.CLIENT:
        proj.total_value = Decimal(str(proj.total_value)) + body.amount

    change = ProjectChange(
        id=str(uuid.uuid4()),
        project_id=project_id,
        description=body.description.strip(),
        responsible=body.responsible.value,
        amount=body.amount,
        created_by=current_user.id,
    )
    db.add(change)
    await refresh_project_status(db, proj)  # el nuevo valor puede dejar saldo pendiente (Entregado → Terminado)

    cobro = f"+{_cop(body.amount)}" if body.amount > 0 else "sin cobro (responsabilidad de SD4A)"
    await log_action(
        db, "CHANGE_REQUEST_CREATED",
        f"Cambio registrado en {proj.code}: {change.description[:120]} — {cobro}",
        user_id=current_user.id, project_id=project_id,
        metadata={"change_id": change.id, "responsible": body.responsible.value, "amount": str(body.amount)},
    )
    await db.commit()
    await db.refresh(change)

    client = (await db.execute(select(User).where(User.id == proj.client_id))).scalar_one_or_none()
    if client:
        mailer.fire(mailer.send_project_change(
            to=client.email,
            client_name=client.name,
            project_name=proj.name,
            project_code=proj.code,
            description=change.description,
            charged=body.responsible == ChangeResponsible.CLIENT,
            amount=_cop(body.amount),
            new_total=_cop(Decimal(str(proj.total_value))),
            app_url=settings.APP_URL,
            project_id=proj.id,
        ))

    return _out(change, current_user.name)


# ─── ELIMINAR (solo ADMIN) ────────────────────────────────────────────────────

@router.delete("/{change_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_change(
    project_id: str,
    change_id: str,
    current_user: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    proj = await _project_or_404(project_id, db, lock=True)
    change = (await db.execute(
        select(ProjectChange).where(ProjectChange.id == change_id, ProjectChange.project_id == project_id)
    )).scalar_one_or_none()
    if not change:
        raise HTTPException(status_code=404, detail="Cambio no encontrado")

    if change.amount > 0:
        restante = Decimal(str(proj.total_value)) - change.amount
        if restante <= 0:
            raise HTTPException(
                status_code=400,
                detail="No se puede eliminar: el valor del proyecto quedaría en cero o negativo.",
            )
        if await confirmed_paid_total(db, project_id) > restante:
            raise HTTPException(
                status_code=400,
                detail="No se puede eliminar: el cliente ya pagó más de lo que quedaría como valor del proyecto. "
                       "Ajusta primero ese pago.",
            )
        proj.total_value = restante

    await db.delete(change)
    await refresh_project_status(db, proj)  # al bajar el valor, un proyecto Terminado y pagado pasa a Entregado

    await log_action(
        db, "CHANGE_REQUEST_DELETED",
        f"Cambio eliminado en {proj.code}: {change.description[:120]}",
        user_id=current_user.id, project_id=project_id,
        metadata={"change_id": change_id, "amount": str(change.amount)},
    )
    await db.commit()
