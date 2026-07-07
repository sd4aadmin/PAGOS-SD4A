from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

from models.project import ProjectStatus


class ProjectMemberOut(BaseModel):
    user_id: str
    name: str = ""
    email: str = ""

    model_config = {"from_attributes": True}


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    client_id: str
    total_value: Decimal = Field(..., gt=0)
    advance_percent: int = Field(..., ge=1, le=100)
    start_date: Optional[datetime] = None
    estimated_date: Optional[datetime] = None
    engineer_profile_id: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    total_value: Optional[Decimal] = Field(None, gt=0)
    advance_percent: Optional[int] = Field(None, ge=1, le=100)
    progress: Optional[int] = Field(None, ge=0, le=100)
    start_date: Optional[datetime] = None
    estimated_date: Optional[datetime] = None
    drive_folder_id: Optional[str] = None
    engineer_profile_id: Optional[str] = None


class ProjectOut(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str]
    status: ProjectStatus
    total_value: Decimal
    advance_percent: int
    progress: int
    start_date: Optional[datetime]
    estimated_date: Optional[datetime]
    delivered_at: Optional[datetime]
    drive_folder_id: Optional[str]
    client_id: str
    client_name: str = ""
    client_email: str = ""
    member_ids: list[str] = []
    member_names: list[str] = []
    engineer_profile_id: Optional[str] = None
    engineer_profile_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AddMemberBody(BaseModel):
    user_id: str
