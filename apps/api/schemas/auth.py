from pydantic import BaseModel, EmailStr
from models.user import Role


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserPublic"


class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    role: Role
    company: str | None = None

    model_config = {"from_attributes": True}


TokenResponse.model_rebuild()
