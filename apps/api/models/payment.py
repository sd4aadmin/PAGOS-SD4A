import enum
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from db.session import Base


class PaymentType(str, enum.Enum):
    ADVANCE = "ADVANCE"
    PARTIAL = "PARTIAL"
    FINAL = "FINAL"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    FAILED = "FAILED"


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = mapped_column("project_id", String, ForeignKey("projects.id"), nullable=False)
    user_id: Mapped[str] = mapped_column("user_id", String, ForeignKey("users.id"), nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="PENDING")
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    wompi_ref: Mapped[str | None] = mapped_column("wompi_ref", String, unique=True, nullable=True)
    wompi_id: Mapped[str | None] = mapped_column("wompi_id", String, nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column("confirmed_at", DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    billing_company: Mapped[str | None] = mapped_column("billing_company", String, nullable=True)
    billing_nit: Mapped[str | None] = mapped_column("billing_nit", String, nullable=True)
    billing_email: Mapped[str | None] = mapped_column("billing_email", String, nullable=True)
    billing_phone: Mapped[str | None] = mapped_column("billing_phone", String, nullable=True)
    created_at: Mapped[datetime] = mapped_column("created_at", DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column("updated_at", DateTime, default=_now, onupdate=_now)
