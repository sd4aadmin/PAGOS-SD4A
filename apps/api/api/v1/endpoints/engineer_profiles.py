import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.session import get_db
from deps import require_roles
from models.user import Role
from models.engineer_profile import EngineerProfile
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/engineer-profiles", tags=["engineer-profiles"])


class EngineerProfileCreate(BaseModel):
    name: str
    email: Optional[str] = None


class EngineerProfileOut(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[EngineerProfileOut])
async def list_profiles(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(Role.ADMIN, Role.ENGINEER)),
):
    result = await db.execute(select(EngineerProfile).order_by(EngineerProfile.name))
    return result.scalars().all()


@router.post("", response_model=EngineerProfileOut, status_code=status.HTTP_201_CREATED)
async def create_profile(
    body: EngineerProfileCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(Role.ADMIN, Role.ENGINEER)),
):
    profile = EngineerProfile(
        id=str(uuid.uuid4()),
        name=body.name,
        email=body.email,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


@router.patch("/{profile_id}", response_model=EngineerProfileOut)
async def update_profile(
    profile_id: str,
    body: EngineerProfileCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(Role.ADMIN, Role.ENGINEER)),
):
    result = await db.execute(select(EngineerProfile).where(EngineerProfile.id == profile_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    profile.name = body.name
    profile.email = body.email
    await db.commit()
    await db.refresh(profile)
    return profile


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    profile_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(Role.ADMIN, Role.ENGINEER)),
):
    result = await db.execute(select(EngineerProfile).where(EngineerProfile.id == profile_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")

    await db.delete(profile)
    await db.commit()
