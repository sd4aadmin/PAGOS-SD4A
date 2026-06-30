from datetime import datetime
from typing import Any
from sqlalchemy import String, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from db.session import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str | None] = mapped_column("project_id", String, ForeignKey("projects.id"), nullable=True)
    user_id: Mapped[str | None] = mapped_column("user_id", String, ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    metadata_: Mapped[Any] = mapped_column("metadata", JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column("created_at", DateTime, server_default=func.now())
