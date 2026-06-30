from pydantic import BaseModel, EmailStr
from datetime import datetime
from models.user import Role


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: Role = Role.CLIENT
    phone: str | None = None
    company: str | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    company: str | None = None
    role: Role | None = None
    is_active: bool | None = None


class PasswordReset(BaseModel):
    new_password: str


class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    role: Role
    phone: str | None = None
    company: str | None = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserList(BaseModel):
    items: list[UserPublic]
    total: int
