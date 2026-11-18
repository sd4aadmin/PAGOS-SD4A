"""
Estados automáticos de un proyecto.

Son 4 estados. Solo uno lo marca una persona (Terminado); el resto salen de los pagos:

  PENDING_ADVANCE  "Anticipo"   al crear el proyecto
  IN_PROGRESS      "En curso"   automático cuando los pagos confirmados cubren el anticipo
  FINISHED         "Terminado"  lo marca el administrador (queda el saldo por pagar)
  DELIVERED        "Entregado"  automático cuando el proyecto está Terminado y pagado por completo

Si el cliente paga todo antes de que se termine el trabajo, el proyecto sigue "En curso"
(se muestra como pagado) y pasa directo a Entregado cuando se marca Terminado. Si después
cambia el valor (un cambio cobrado) o se elimina un pago y vuelve a haber saldo, un proyecto
Entregado regresa a Terminado.

El avance es fijo por estado (no se edita a mano).
"""
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

# Estados antiguos (7) → estado actual (4). Se conservan en la base para no perder datos.
_LEGACY = {"IN_REVIEW": "IN_PROGRESS", "PENDING_FINAL": "FINISHED", "PAID": "DELIVERED"}

PROGRESS_BY_STATUS = {"PENDING_ADVANCE": 0, "IN_PROGRESS": 50, "FINISHED": 100, "DELIVERED": 100}


def _text(status) -> str:
    return str(getattr(status, "value", status))


def canonical_status(status) -> str:
    s = _text(status)
    return _LEGACY.get(s, s)


def progress_for(status) -> int:
    return PROGRESS_BY_STATUS.get(canonical_status(status), 0)


def is_fully_paid(total_value, paid_total) -> bool:
    total = Decimal(str(total_value))
    return total > 0 and Decimal(str(paid_total)) >= total


def recompute_status(project, paid_total) -> bool:
    """Ajusta `project.status` y `project.delivered_at` según lo pagado. Devuelve True si cambió el estado."""
    paid = Decimal(str(paid_total))
    total = Decimal(str(project.total_value))
    before = _text(project.status)
    status = canonical_status(before)

    # Anticipo cubierto → En curso (paid*100 >= total*porcentaje evita redondeos)
    if status == "PENDING_ADVANCE" and paid > 0 and paid * 100 >= total * Decimal(project.advance_percent):
        status = "IN_PROGRESS"

    if status == "FINISHED" and is_fully_paid(total, paid):
        status = "DELIVERED"
    elif status == "DELIVERED" and not is_fully_paid(total, paid):
        status = "FINISHED"

    project.status = status
    if status == "DELIVERED":
        if project.delivered_at is None:
            project.delivered_at = datetime.now(timezone.utc)
    else:
        project.delivered_at = None
    return status != before


async def confirmed_paid_total(db: AsyncSession, project_id: str) -> Decimal:
    from models.payment import Payment, PaymentStatus
    value = (await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.project_id == project_id,
            Payment.status == PaymentStatus.CONFIRMED,
        )
    )).scalar_one()
    return Decimal(str(value))


async def refresh_project_status(db: AsyncSession, project) -> bool:
    """Calcula lo pagado en la base y aplica `recompute_status`. Llamar después de `flush()`
    cuando cambia un pago o el valor del proyecto (sin hacer commit)."""
    await db.flush()
    return recompute_status(project, await confirmed_paid_total(db, project.id))
