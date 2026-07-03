from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.session import get_db
from core.security import verify_password, create_access_token
from core.rate_limit import (
    check_ip_rate_limit, record_ip_attempt,
    check_account_lockout, record_failed_login, reset_account_attempts,
)
from core.audit import log_action
from models.user import User
from schemas.auth import LoginRequest, TokenResponse, UserPublic
from deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"

    # Rate limit por IP
    if not check_ip_rate_limit(ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Espera 15 minutos.",
        )
    record_ip_attempt(ip)

    # Bloqueo por cuenta
    locked, remaining = check_account_lockout(body.email)
    if locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Cuenta bloqueada temporalmente. Intenta en {remaining} segundos.",
        )

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        attempts = record_failed_login(body.email)
        remaining_attempts = max(0, 5 - attempts)
        await log_action(db, "LOGIN_FAILED",
                         f"Intento fallido desde {ip}",
                         metadata={"email": body.email, "ip": ip, "attempts": attempts})
        await db.commit()
        detail = "Credenciales incorrectas"
        if remaining_attempts <= 2 and remaining_attempts > 0:
            detail += f". {remaining_attempts} intento(s) restante(s) antes de bloqueo."
        elif remaining_attempts == 0:
            detail = "Cuenta bloqueada por 5 minutos por exceso de intentos."
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta desactivada")

    reset_account_attempts(body.email)
    # Invalidar sesiones anteriores en otros dispositivos
    user.session_version = (user.session_version or 0) + 1
    await db.flush()
    token = create_access_token(subject=user.id, role=str(user.role), extra={"sv": user.session_version})

    await log_action(db, "LOGIN_SUCCESS", f"Login exitoso desde {ip}",
                     user_id=user.id, metadata={"ip": ip})
    await db.commit()

    return TokenResponse(access_token=token, user=UserPublic.model_validate(user))


@router.get("/me", response_model=UserPublic)
async def me(current_user: User = Depends(get_current_user)):
    return UserPublic.model_validate(current_user)
