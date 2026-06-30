import enum
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, DateTime, Date, ForeignKey, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.session import Base


class ProjectStatus(str, enum.Enum):
    PENDING_ADVANCE = "PENDING_ADVANCE"
    IN_PROGRESS = "IN_PROGRESS"
    IN_REVIEW = "IN_REVIEW"
    FINISHED = "FINISHED"
    PENDING_FINAL = "PENDING_FINAL"
    PAID = "PAID"
    DELIVERED = "DELIVERED"


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    code: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="PENDING_ADVANCE")
    total_value: Mapped[Decimal] = mapped_column("total_value", Numeric(18, 2), nullable=False)
    advance_percent: Mapped[int] = mapped_column("advance_percent", Integer, nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    start_date: Mapped[datetime | None] = mapped_column("start_date", DateTime(timezone=True), nullable=True)
    estimated_date: Mapped[datetime | None] = mapped_column("estimated_date", DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column("delivered_at", DateTime(timezone=True), nullable=True)
    drive_folder_id: Mapped[str | None] = mapped_column("drive_folder_id", String, nullable=True)
    client_id: Mapped[str] = mapped_column("client_id", String, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column("created_at", DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column("updated_at", DateTime, default=_now, onupdate=_now)

    members: Mapped[list["ProjectMember"]] = relationship("ProjectMember", back_populates="project", lazy="selectin")


class ProjectMember(Base):
    __tablename__ = "project_members"
    __table_args__ = (UniqueConstraint("project_id", "user_id"),)

    project_id: Mapped[str] = mapped_column("project_id", String, ForeignKey("projects.id"), nullable=False, primary_key=True)
    user_id: Mapped[str] = mapped_column("user_id", String, ForeignKey("users.id"), nullable=False, primary_key=True)

    project: Mapped["Project"] = relationship("Project", back_populates="members")
