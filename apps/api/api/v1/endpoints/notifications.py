from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from deps import require_roles
from models.user import User, Role
from core.email import send_email
from core.config import settings

router = APIRouter(prefix="/notifications", tags=["notifications"])


class TestEmailBody(BaseModel):
    to: EmailStr


@router.post("/test-email")
async def test_email(
    body: TestEmailBody,
    _: User = Depends(require_roles(Role.ADMIN)),
):
    await send_email(
        to=body.to,
        subject="SD4A Portal — Email de prueba",
        html=f"""
        <div style="font-family:Arial,sans-serif;padding:32px;background:#f4f6f9;">
          <div style="background:#fff;padding:32px;border-radius:12px;max-width:500px;margin:0 auto;">
            <h2 style="color:#102a6e;margin:0 0 16px;">¡Email de prueba exitoso!</h2>
            <p style="color:#475569;">Las notificaciones de <strong>SD4A Portal</strong> están configuradas correctamente.</p>
            <p style="color:#94a3b8;font-size:13px;">Enviado desde: {settings.SMTP_USER}</p>
          </div>
        </div>
        """,
    )
    return {"message": f"Email enviado a {body.to}"}
