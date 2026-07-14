from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from models.payment import PaymentType, PaymentStatus

# Tope de sanidad para montos: 100.000 millones COP
MAX_AMOUNT = Decimal("100000000000")


class PaymentCreate(BaseModel):
    project_id: str
    type: PaymentType
    amount: Decimal = Field(gt=0, le=MAX_AMOUNT)
    notes: Optional[str] = Field(None, max_length=500)


class PaymentStatusUpdate(BaseModel):
    status: PaymentStatus


class PaymentPatch(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0, le=MAX_AMOUNT)
    type: Optional[PaymentType] = None
    notes: Optional[str] = Field(None, max_length=500)


class PaymentOut(BaseModel):
    id: str
    project_id: str
    user_id: str
    type: PaymentType
    status: PaymentStatus
    amount: Decimal
    wompi_ref: Optional[str]
    wompi_id: Optional[str]
    confirmed_at: Optional[datetime]
    notes: Optional[str]
    billing_company: Optional[str] = None
    billing_nit: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaymentWithCheckout(PaymentOut):
    checkout_url: str


class WompiWebhookData(BaseModel):
    transaction: dict


class WompiWebhookEvent(BaseModel):
    event: str
    data: WompiWebhookData
    sent_at: str
    timestamp: int
    signature: dict
