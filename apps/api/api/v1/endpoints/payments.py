import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from deps import get_current_user, require_roles
from models.user import User, Role
from models.payment import Payment, PaymentStatus, PaymentType
from models.project import Project, ProjectStatus
from schemas.payment import PaymentCreate, PaymentOut, PaymentWithCheckout, WompiWebhookEvent
from core.wompi import build_checkout_url, verify_webhook_signature, amount_to_cents
from core.config import settings
from core.audit import log_action
import asyncio
import core.email as mailer

router = APIRouter(prefix="/payments", tags=["payments"])

PAYMENT_TYPE_ES = {"ADVANCE": "Anticipo", "PARTIAL": "Pago parcial", "FINAL": "Pago final"}
PAYMENT_STATUS_ES = {"PENDING": "Pendiente", "CONFIRMED": "Confirmado", "FAILED": "Fallido"}


# ─── CREATE PAYMENT LINK (admin) ─────────────────────────────────────────────

@router.post("", response_model=PaymentWithCheckout, status_code=status.HTTP_201_CREATED)
async def create_payment(
    body: PaymentCreate,
    current_user: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    # Verify project exists
    proj = (await db.execute(select(Project).where(Project.id == body.project_id))).scalar_one_or_none()
    if not proj:
        raise HTTPException(404, "Proyecto no encontrado")

    # Avoid duplicate pending payment of same type
    existing = (await db.execute(
        select(Payment).where(
            Payment.project_id == body.project_id,
            Payment.type == body.type,
            Payment.status == PaymentStatus.PENDING,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(400, f"Ya existe un pago pendiente de tipo {body.type.value} para este proyecto")

    reference = f"SD4A-{uuid.uuid4().hex[:12].upper()}"
    redirect_url = f"{settings.APP_URL}/dashboard/projects/{body.project_id}?payment=done"

    checkout_url = build_checkout_url(
        reference=reference,
        amount=body.amount,
        description=f"{proj.code} — {body.type.value}",
        redirect_url=redirect_url,
    )

    payment = Payment(
        id=str(uuid.uuid4()),
        project_id=body.project_id,
        user_id=proj.client_id,
        type=body.type,
        amount=body.amount,
        wompi_ref=reference,
        notes=body.notes,
    )
    db.add(payment)
    await log_action(db, "PAYMENT_CREATED",
                     f"Enlace de {PAYMENT_TYPE_ES.get(body.type.value, body.type.value)} creado para {proj.code}: ${float(body.amount):,.0f} COP",
                     user_id=current_user.id, project_id=body.project_id,
                     metadata={"type": body.type.value, "amount": str(body.amount), "reference": reference})
    await db.commit()
    await db.refresh(payment)

    # Email al cliente con el enlace de pago
    client_result = await db.execute(select(User).where(User.id == proj.client_id))
    client = client_result.scalar_one_or_none()
    if client:
        mailer.fire(mailer.send_payment_link(
            to=client.email,
            client_name=client.name,
            project_name=proj.name,
            project_code=proj.code,
            payment_type=body.type.value,
            amount=f"${float(body.amount):,.0f} COP",
            checkout_url=checkout_url,
        ))

    return PaymentWithCheckout(**PaymentOut.model_validate(payment).model_dump(), checkout_url=checkout_url)


# ─── LIST ALL PAYMENTS (admin) ───────────────────────────────────────────────

@router.get("")
async def list_all_payments(
    current_user: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import func as sqlfunc
    from decimal import Decimal

    result = await db.execute(
        select(Payment).order_by(Payment.created_at.desc())
    )
    payments = result.scalars().all()

    # Fetch all referenced projects in one query
    project_ids = list({p.project_id for p in payments})
    proj_result = await db.execute(select(Project).where(Project.id.in_(project_ids)))
    projects_map = {p.id: p for p in proj_result.scalars().all()}

    # Compute total confirmed per project
    paid_result = await db.execute(
        select(Payment.project_id, sqlfunc.sum(Payment.amount))
        .where(Payment.status == PaymentStatus.CONFIRMED)
        .group_by(Payment.project_id)
    )
    paid_map: dict[str, Decimal] = {row[0]: row[1] or Decimal(0) for row in paid_result.all()}

    output = []
    for p in payments:
        proj = projects_map.get(p.project_id)
        total_paid = paid_map.get(p.project_id, Decimal(0))
        remaining = (Decimal(str(proj.total_value)) - total_paid) if proj else Decimal(0)
        output.append({
            "id": p.id,
            "project_id": p.project_id,
            "project_name": proj.name if proj else None,
            "project_code": proj.code if proj else None,
            "user_id": p.user_id,
            "type": p.type if isinstance(p.type, str) else p.type.value,
            "status": p.status if isinstance(p.status, str) else p.status.value,
            "amount": str(p.amount),
            "wompi_ref": p.wompi_ref,
            "wompi_id": p.wompi_id,
            "confirmed_at": p.confirmed_at.isoformat() if p.confirmed_at else None,
            "notes": p.notes,
            "created_at": p.created_at.isoformat(),
            "updated_at": p.updated_at.isoformat(),
            "project_remaining": str(max(remaining, Decimal(0))),
        })
    return output


# ─── LIST PAYMENTS FOR PROJECT ────────────────────────────────────────────────

@router.get("/project/{project_id}", response_model=list[PaymentOut])
async def list_project_payments(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    proj = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not proj:
        raise HTTPException(404, "Proyecto no encontrado")

    # Clients can only see their own project payments
    if current_user.role == Role.CLIENT and proj.client_id != current_user.id:
        raise HTTPException(403, "Sin acceso")

    result = await db.execute(
        select(Payment).where(Payment.project_id == project_id).order_by(Payment.created_at.desc())
    )
    return result.scalars().all()


# ─── GET CHECKOUT URL FOR EXISTING PENDING PAYMENT ───────────────────────────

@router.get("/{payment_id}/checkout", response_model=PaymentWithCheckout)
async def get_checkout(
    payment_id: str,
    billing_company: str | None = None,
    billing_nit: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payment = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    if not payment:
        raise HTTPException(404, "Pago no encontrado")
    if payment.status != PaymentStatus.PENDING:
        raise HTTPException(400, "Este pago ya fue procesado")
    if current_user.role == Role.CLIENT and payment.user_id != current_user.id:
        raise HTTPException(403, "Sin acceso")

    # Persist billing data if provided
    if billing_company:
        payment.billing_company = billing_company.strip()
    if billing_nit:
        payment.billing_nit = billing_nit.strip()
    if billing_company or billing_nit:
        payment.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await db.commit()
        await db.refresh(payment)

    proj = (await db.execute(select(Project).where(Project.id == payment.project_id))).scalar_one_or_none()
    redirect_url = f"{settings.APP_URL}/dashboard/projects/{payment.project_id}?payment=done"
    checkout_url = build_checkout_url(
        reference=payment.wompi_ref,
        amount=payment.amount,
        description=f"{proj.code} — {payment.type}" if proj else payment.wompi_ref,
        redirect_url=redirect_url,
        billing_company=payment.billing_company,
        billing_nit=payment.billing_nit,
    )
    return PaymentWithCheckout(**PaymentOut.model_validate(payment).model_dump(), checkout_url=checkout_url)


# ─── UPDATE PAYMENT STATUS (admin) ───────────────────────────────────────────

@router.patch("/{payment_id}/status")
async def update_payment_status(
    payment_id: str,
    body: dict,
    current_user: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    payment = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    if not payment:
        raise HTTPException(404, "Pago no encontrado")

    new_status_str = body.get("status")
    try:
        new_status = PaymentStatus(new_status_str)
    except ValueError:
        raise HTTPException(400, "Estado inválido")

    old_status = payment.status
    payment.status = new_status
    payment.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

    if new_status == PaymentStatus.CONFIRMED and not payment.confirmed_at:
        payment.confirmed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    elif new_status == PaymentStatus.PENDING:
        payment.confirmed_at = None

    old_str = old_status if isinstance(old_status, str) else old_status.value
    await log_action(db, "PAYMENT_STATUS_UPDATED",
                     f"Estado de pago modificado: {PAYMENT_STATUS_ES.get(old_str, old_str)} → {PAYMENT_STATUS_ES.get(new_status.value, new_status.value)}",
                     user_id=current_user.id, project_id=payment.project_id,
                     metadata={"payment_id": payment_id, "old": old_str, "new": new_status.value})
    await db.commit()
    await db.refresh(payment)
    return {"id": payment.id, "status": payment.status if isinstance(payment.status, str) else payment.status.value}


# ─── WOMPI WEBHOOK ────────────────────────────────────────────────────────────

@router.post("/webhook", status_code=status.HTTP_200_OK)
async def wompi_webhook(event: WompiWebhookEvent, db: AsyncSession = Depends(get_db)):
    if event.event != "transaction.updated":
        return {"received": True}

    tx = event.data.transaction
    tx_id = tx.get("id", "")
    tx_status = tx.get("status", "")
    amount_cents = tx.get("amount_in_cents", 0)
    occurred_at = event.sent_at
    checksum = event.signature.get("checksum", "")

    # La firma es obligatoria: sin secreto configurado no se aceptan webhooks
    # (evita confirmaciones falsas de pago con un POST manual).
    if not settings.WOMPI_EVENTS_SECRET:
        raise HTTPException(503, "Webhook no configurado")
    if not verify_webhook_signature(tx_id, tx_status, amount_cents, occurred_at, checksum):
        raise HTTPException(400, "Firma inválida")

    reference = tx.get("reference", "")
    payment = (await db.execute(select(Payment).where(Payment.wompi_ref == reference))).scalar_one_or_none()
    if not payment:
        return {"received": True}

    # El monto de la transacción debe coincidir con el pago registrado
    if int(amount_cents) != amount_to_cents(payment.amount):
        await log_action(db, "PAYMENT_AMOUNT_MISMATCH",
                         f"Webhook con monto distinto para {reference}: esperado {amount_to_cents(payment.amount)}, recibido {amount_cents}",
                         project_id=payment.project_id,
                         metadata={"reference": reference, "expected_cents": amount_to_cents(payment.amount), "received_cents": amount_cents})
        await db.commit()
        return {"received": True}

    if tx_status == "APPROVED":
        payment.status = PaymentStatus.CONFIRMED
        payment.wompi_id = tx_id
        payment.confirmed_at = datetime.now(timezone.utc).replace(tzinfo=None)

        # Auto-advance project status
        proj = (await db.execute(select(Project).where(Project.id == payment.project_id))).scalar_one_or_none()
        if proj:
            if payment.type == PaymentType.ADVANCE and proj.status == ProjectStatus.PENDING_ADVANCE:
                proj.status = ProjectStatus.IN_PROGRESS
            elif payment.type == PaymentType.FINAL and proj.status == ProjectStatus.PENDING_FINAL:
                proj.status = ProjectStatus.PAID

    elif tx_status in ("DECLINED", "VOIDED", "ERROR"):
        payment.status = PaymentStatus.FAILED
        payment.wompi_id = tx_id

    payment.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()
    return {"received": True}


# ─── UPDATE PAYMENT (admin) ──────────────────────────────────────────────────

@router.patch("/{payment_id}", response_model=PaymentOut)
async def update_payment(
    payment_id: str,
    body: dict,
    current_user: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    payment = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    if not payment:
        raise HTTPException(404, "Pago no encontrado")
    if payment.status == PaymentStatus.CONFIRMED:
        raise HTTPException(400, "No se puede editar un pago confirmado")

    if "amount" in body:
        payment.amount = body["amount"]
    if "type" in body:
        try:
            payment.type = PaymentType(body["type"])
        except ValueError:
            raise HTTPException(400, "Tipo de pago inválido")
    if "notes" in body:
        payment.notes = body["notes"] or None

    payment.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await log_action(db, "PAYMENT_UPDATED",
                     f"Pago editado: ${float(payment.amount):,.0f} COP",
                     user_id=current_user.id, project_id=payment.project_id,
                     metadata={"payment_id": payment_id})
    await db.commit()
    await db.refresh(payment)
    return payment


# ─── DELETE PAYMENT (admin) ───────────────────────────────────────────────────

@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment(
    payment_id: str,
    current_user: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    payment = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    if not payment:
        raise HTTPException(404, "Pago no encontrado")

    await log_action(db, "PAYMENT_DELETED",
                     f"Pago eliminado: {PAYMENT_TYPE_ES.get(payment.type, payment.type)} ${float(payment.amount):,.0f} COP",
                     user_id=current_user.id, project_id=payment.project_id,
                     metadata={"payment_id": payment_id})
    await db.delete(payment)
    await db.commit()


# ─── MANUAL CONFIRM (admin, para sandbox/testing) ─────────────────────────────

@router.post("/{payment_id}/confirm", response_model=PaymentOut)
async def manual_confirm(
    payment_id: str,
    current_user: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    payment = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    if not payment:
        raise HTTPException(404, "Pago no encontrado")
    if payment.status == PaymentStatus.CONFIRMED:
        raise HTTPException(400, "El pago ya está confirmado")

    payment.status = PaymentStatus.CONFIRMED
    payment.confirmed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    payment.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

    proj = (await db.execute(select(Project).where(Project.id == payment.project_id))).scalar_one_or_none()
    if proj:
        if payment.type == PaymentType.ADVANCE and proj.status == ProjectStatus.PENDING_ADVANCE:
            proj.status = ProjectStatus.IN_PROGRESS
        elif payment.type == PaymentType.FINAL and proj.status == ProjectStatus.PENDING_FINAL:
            proj.status = ProjectStatus.PAID

    await log_action(db, "PAYMENT_CONFIRMED",
                     f"{PAYMENT_TYPE_ES.get(payment.type, payment.type)} confirmado manualmente: ${float(payment.amount):,.0f} COP",
                     user_id=current_user.id, project_id=payment.project_id,
                     metadata={"payment_id": payment_id, "amount": str(payment.amount)})
    await db.commit()
    await db.refresh(payment)

    # Email al cliente
    client_result = await db.execute(select(User).where(User.id == payment.user_id))
    client = client_result.scalar_one_or_none()
    if client and proj:
        mailer.fire(mailer.send_payment_confirmed(
            to=client.email,
            client_name=client.name,
            project_name=proj.name,
            project_code=proj.code,
            payment_type=payment.type,
            amount=f"${float(payment.amount):,.0f} COP",
            app_url=settings.APP_URL,
            project_id=proj.id,
        ))

    return payment
