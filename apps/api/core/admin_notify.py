"""
Avisos al administrador: pago nuevo, cliente nuevo, y revisión programada
de proyectos con fecha de entrega vencida.
"""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User, Role
from models.project import Project, ProjectStatus
from core.config import settings
import core.email as mailer

# Estados en los que un proyecto ya no cuenta como "vencido" aunque haya pasado su fecha
_CLOSED_STATUSES = {ProjectStatus.FINISHED, ProjectStatus.PAID, ProjectStatus.DELIVERED}


async def _admin_emails(db: AsyncSession, *, exclude_id: str | None = None) -> list[str]:
    q = select(User.email).where(User.role == Role.ADMIN, User.is_active.is_(True))
    if exclude_id:
        q = q.where(User.id != exclude_id)
    result = await db.execute(q)
    return [row[0] for row in result.all()]


async def notify_admin_payment_confirmed(
    db: AsyncSession, *, project: Project, client_name: str,
    payment_type: str, amount: str,
) -> None:
    for email in await _admin_emails(db):
        mailer.fire(mailer.send_admin_payment_confirmed(
            to=email,
            project_name=project.name,
            project_code=project.code,
            client_name=client_name,
            payment_type=payment_type,
            amount=amount,
            app_url=settings.APP_URL,
            project_id=project.id,
        ))


async def notify_admin_new_client(
    db: AsyncSession, *, client_name: str, client_email: str, created_by_id: str | None = None,
) -> None:
    """No avisa al mismo admin que creó la cuenta — solo a los demás."""
    for email in await _admin_emails(db, exclude_id=created_by_id):
        mailer.fire(mailer.send_admin_new_client(
            to=email, client_name=client_name, client_email=client_email, app_url=settings.APP_URL,
        ))


async def check_overdue_projects(db: AsyncSession) -> int:
    """Busca proyectos activos cuya fecha estimada ya pasó y avisa a los admins.
    Se pensó para correr una vez al día desde un cron externo."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    result = await db.execute(
        select(Project).where(
            Project.estimated_date.is_not(None),
            Project.estimated_date < now,
            Project.status.notin_(_CLOSED_STATUSES),
        )
    )
    overdue = result.scalars().all()
    if not overdue:
        return 0

    projects_payload = [
        {
            "code": p.code,
            "name": p.name,
            "estimated_date": p.estimated_date.strftime("%d/%m/%Y") if p.estimated_date else "—",
        }
        for p in overdue
    ]
    for email in await _admin_emails(db):
        mailer.fire(mailer.send_admin_overdue_projects(
            to=email, projects=projects_payload, app_url=settings.APP_URL,
        ))
    return len(overdue)
