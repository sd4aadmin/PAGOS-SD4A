from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel
from models.payment import PaymentType, PaymentStatus


class PaymentCreate(BaseModel):
    project_id: str
    type: PaymentType
    amount: Decimal
    notes: Optional[str] = None


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
