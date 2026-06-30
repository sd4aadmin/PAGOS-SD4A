from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Boolean, Integer, func
from sqlalchemy.orm import Mapped, mapped_column
from db.session import Base


class Deliverable(Base):
    __tablename__ = "deliverables"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = mapped_column("project_id", String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    uploaded_by: Mapped[str | None] = mapped_column("uploaded_by", String, ForeignKey("users.id"), nullable=True)
    drive_file_id: Mapped[str | None] = mapped_column("drive_file_id", String, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    file_name: Mapped[str | None] = mapped_column("file_name", String, nullable=True)
    file_size: Mapped[int | None] = mapped_column("file_size", Integer, nullable=True)
    mime_type: Mapped[str | None] = mapped_column("mime_type", String, nullable=True)
    size: Mapped[str | None] = mapped_column("size", String, nullable=True)
    version: Mapped[str] = mapped_column(String, default="V1")
    is_locked: Mapped[bool] = mapped_column("is_locked", Boolean, default=True)
    is_active: Mapped[bool] = mapped_column("is_active", Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column("created_at", DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column("updated_at", DateTime, server_default=func.now(), onupdate=func.now())
