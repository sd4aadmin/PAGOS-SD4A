from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from deps import require_roles, get_current_user
from models.user import User, Role
from models.activity_log import ActivityLog
from pydantic import BaseModel

router = APIRouter(prefix="/activity", tags=["activity"])


class ActivityLogOut(BaseModel):
    id: str
    project_id: Optional[str]
    user_id: Optional[str]
    action: str
    description: str
    metadata_: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[ActivityLogOut])
async def list_activity(
    project_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.ENGINEER)),
    db: AsyncSession = Depends(get_db),
):
    q = select(ActivityLog)
    if project_id:
        q = q.where(ActivityLog.project_id == project_id)
    if action:
        q = q.where(ActivityLog.action == action)

    q = q.order_by(desc(ActivityLog.created_at)).offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/project/{project_id}", response_model=list[ActivityLogOut])
async def project_activity(
    project_id: str,
    limit: int = Query(30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(ActivityLog)
        .where(ActivityLog.project_id == project_id)
        .order_by(desc(ActivityLog.created_at))
        .limit(limit)
    )
    result = await db.execute(q)
    return result.scalars().all()
