import enum
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Numeric, DateTime, ForeignKey, func, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from db.session import Base


class FolderCategory(str, enum.Enum):
    MEMORIAS = "01_MEMORIAS"
    PLANOS = "02_PLANOS"
    FOTOGRAFIAS = "03_FOTOGRAFIAS"
    MODELOS_BIM = "04_MODELOS_BIM"
    RESPALDOS = "05_RESPALDOS"


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class ProjectFile(Base):
    __tablename__ = "project_files"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id"), nullable=False)
    uploaded_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)

    # Drive metadata
    drive_file_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    drive_folder_id: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)  # FolderCategory value

    # File metadata
    filename: Mapped[str] = mapped_column(String, nullable=False)
    mime_type: Mapped[str] = mapped_column(String, nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    version_label: Mapped[str | None] = mapped_column(String(50), nullable=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_deliverable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
