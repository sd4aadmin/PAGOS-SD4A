"""
Servicio de auditoría — registra acciones en activity_logs.
Uso: await log_action(db, action="PROJECT_CREATED", description="...", user_id=..., project_id=...)
"""
import uuid
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession

from models.activity_log import ActivityLog


async def log_action(
    db: AsyncSession,
    action: str,
    description: str,
    user_id: str | None = None,
    project_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    entry = ActivityLog(
        id=str(uuid.uuid4()),
        action=action,
        description=description,
        user_id=user_id,
        project_id=project_id,
        metadata_=metadata,
    )
    db.add(entry)
    # No hacemos commit aquí — se commitea junto con la transacción principal
