import asyncio
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from db.session import get_db
from models.user import User, Role
from schemas.user import UserCreate, UserUpdate, PasswordReset, UserPublic, UserList
from core.security import hash_password
from core.config import settings
import core.email as mailer
from deps import get_current_user, require_roles

router = APIRouter(prefix="/users", tags=["users"])

AdminOnly = Depends(require_roles(Role.ADMIN))


@router.get("", response_model=UserList)
async def list_users(
    role: Role | None = Query(None),
    is_active: bool | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = AdminOnly,
):
    q = select(User)
    if role is not None:
        q = q.where(User.role == role)
    if is_active is not None:
        q = q.where(User.is_active == is_active)

    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar_one()

    result = await db.execute(q.offset(skip).limit(limit).order_by(User.created_at.desc()))
    users = result.scalars().all()

    return UserList(items=users, total=total)


@router.post("", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = AdminOnly,
):
    # Solo bloquear email duplicado si no es ingeniero
    existing_user = None
    if body.role != "ENGINEER":
        existing = await db.execute(select(User).where(User.email == body.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado")
    else:
        # Si es ingeniero con email existente, reusar el hash de contraseña
        result = await db.execute(select(User).where(User.email == body.email).limit(1))
        existing_user = result.scalar_one_or_none()

    password_hash = existing_user.password_hash if existing_user else hash_password(body.password)

    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        name=body.name,
        password_hash=password_hash,
        role=body.role,
        phone=body.phone,
        company=body.company,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Solo enviar correo si es cuenta nueva (sin email previo)
    if body.role in (Role.CLIENT, Role.ENGINEER) and not existing_user:
        mailer.fire(mailer.send_welcome_client(
            to=user.email,
            client_name=user.name,
            email=user.email,
            password=body.password,
            app_url=settings.APP_URL,
        ))

    return user


@router.get("/me", response_model=UserPublic)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_my_password(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from core.security import verify_password
    current_pw = body.get("current_password", "")
    new_pw = body.get("new_password", "")
    if not verify_password(current_pw, current_user.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")
    if len(new_pw) < 8:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 8 caracteres")
    current_user.password_hash = hash_password(new_pw)
    # Invalidar cualquier otra sesión abierta con la contraseña anterior
    current_user.session_version = (current_user.session_version or 0) + 1
    await db.commit()


@router.get("/{user_id}", response_model=UserPublic)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = AdminOnly,
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return user


@router.patch("/{user_id}", response_model=UserPublic)
async def update_user(
    user_id: str,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = AdminOnly,
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    for field, value in body.model_dump(exclude_none=True).items():
        # map snake_case to model attribute names
        attr = "is_active" if field == "is_active" else field
        setattr(user, attr, value)

    await db.commit()
    await db.refresh(user)
    return user


@router.post("/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(
    user_id: str,
    body: PasswordReset,
    db: AsyncSession = Depends(get_db),
    _: User = AdminOnly,
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    user.password_hash = hash_password(body.new_password)
    # Cerrar las sesiones activas del usuario al resetear su contraseña
    user.session_version = (user.session_version or 0) + 1
    await db.commit()


@router.delete("/{user_id}/memberships", status_code=status.HTTP_204_NO_CONTENT)
async def remove_all_memberships(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: User = AdminOnly,
):
    """Desasigna al usuario de todos los proyectos en los que es miembro."""
    from models.project import ProjectMember
    from sqlalchemy import delete as sql_delete
    await db.execute(sql_delete(ProjectMember).where(ProjectMember.user_id == user_id))
    await db.commit()


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: User = AdminOnly,
):
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes eliminar tu propia cuenta")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    from models.project import Project, ProjectMember
    from models.project_file import ProjectFile
    from models.payment import Payment
    from models.activity_log import ActivityLog
    from sqlalchemy import delete as sql_delete, update as sql_update

    # Bloquear si es cliente con proyectos (no se puede reasignar automáticamente)
    has_projects = (await db.execute(
        select(func.count()).where(Project.client_id == user_id)
    )).scalar_one()
    if has_projects:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar: el usuario es cliente de proyectos activos."
        )

    # Limpiar todas las referencias antes de eliminar
    await db.execute(sql_delete(ProjectMember).where(ProjectMember.user_id == user_id))
    await db.execute(sql_update(ActivityLog).where(ActivityLog.user_id == user_id).values(user_id=None))
    # project_files y payments tienen uploaded_by/user_id NOT NULL → reemplazar con el admin actual
    await db.execute(sql_update(ProjectFile).where(ProjectFile.uploaded_by == user_id).values(uploaded_by=current_user.id))
    await db.execute(sql_update(Payment).where(Payment.user_id == user_id).values(user_id=current_user.id))

    try:
        await db.delete(user)
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede eliminar: el usuario tiene registros relacionados.")
