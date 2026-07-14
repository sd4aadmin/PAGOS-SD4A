from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from models.user import Role


class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=8, max_length=128)
    role: Role = Role.CLIENT
    phone: str | None = Field(None, max_length=30)
    company: str | None = Field(None, max_length=200)


class UserUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    company: str | None = None
    role: Role | None = None
    is_active: bool | None = None


class PasswordReset(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


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
