from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from db.session import Base


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class ProjectChange(Base):
    """Solicitud de cambio registrada por un administrador sobre un proyecto.

    Si el responsable es el cliente, `amount` se sumó al valor del proyecto
    (`projects.total_value`) al crearla. Si el responsable es SD4A (error propio),
    `amount` es 0: queda el registro pero no se cobra.
    """
    __tablename__ = "project_changes"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = mapped_column("project_id", String, ForeignKey("projects.id"), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), nullable=False)
    responsible: Mapped[str] = mapped_column(String(10), nullable=False)  # CLIENT | SD4A
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0"))
    created_by: Mapped[str | None] = mapped_column(
        "created_by", String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column("created_at", DateTime, server_default=func.now(), default=_now)
