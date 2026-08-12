"""
Endpoints disparados por un cron externo (GitHub Actions), no por un usuario
con sesión — se protegen con un secreto compartido en la cabecera, no con JWT.
"""
import hmac

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from core.config import settings
from core.backup import run_backup
from core.admin_notify import check_overdue_projects

router = APIRouter(prefix="/automation", tags=["automation"])


def _verify_cron_secret(x_cron_secret: str | None) -> None:
    if not settings.CRON_SECRET or not x_cron_secret or not hmac.compare_digest(x_cron_secret, settings.CRON_SECRET):
        raise HTTPException(401, "No autorizado")


@router.post("/backup")
async def trigger_backup(x_cron_secret: str | None = Header(None, alias="X-Cron-Secret")):
    _verify_cron_secret(x_cron_secret)
    result = await run_backup()
    return {"ok": True, **result}


@router.post("/check-overdue")
async def trigger_overdue_check(
    x_cron_secret: str | None = Header(None, alias="X-Cron-Secret"),
    db: AsyncSession = Depends(get_db),
):
    _verify_cron_secret(x_cron_secret)
    count = await check_overdue_projects(db)
    return {"ok": True, "overdue_notified": count}
