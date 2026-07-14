"""
Wompi Colombia — helpers para checkout y verificación de webhooks.
Docs: https://docs.wompi.co
"""
import hashlib
import hmac
from decimal import Decimal
from core.config import settings


CHECKOUT_BASE = "https://checkout.wompi.co/p/"


def amount_to_cents(amount: Decimal) -> int:
    return int(amount * 100)


def integrity_hash(reference: str, amount_cents: int, currency: str = "COP") -> str:
    """SHA-256 de reference+amount_in_cents+currency+integrity_secret."""
    raw = f"{reference}{amount_cents}{currency}{settings.WOMPI_INTEGRITY_SECRET}"
    return hashlib.sha256(raw.encode()).hexdigest()


def build_checkout_url(
    reference: str,
    amount: Decimal,
    description: str,
    redirect_url: str,
    currency: str = "COP",
    billing_company: str | None = None,
    billing_nit: str | None = None,
    billing_email: str | None = None,
    billing_phone: str | None = None,
) -> str:
    from urllib.parse import quote
    cents = amount_to_cents(amount)
    sig = integrity_hash(reference, cents, currency)
    params = (
        f"?public-key={settings.WOMPI_PUBLIC_KEY}"
        f"&currency={currency}"
        f"&amount-in-cents={cents}"
        f"&reference={reference}"
        f"&signature:integrity={sig}"
        f"&redirect-url={redirect_url}"
    )
    if billing_nit and billing_company:
        params += (
            f"&customer-data:user-legal-id-type=NIT"
            f"&customer-data:user-legal-id={quote(billing_nit)}"
            f"&customer-data:full-name={quote(billing_company)}"
        )
    else:
        params += "&customer-data:user-legal-id-type=CC"
    if billing_email:
        params += f"&customer-data:email={quote(billing_email)}"
    if billing_phone:
        params += f"&customer-data:phone-number={quote(billing_phone)}"
    return CHECKOUT_BASE + params


def verify_webhook_signature(
    transaction_id: str,
    status: str,
    amount_cents: int,
    occurred_at: str,
    checksum: str,
) -> bool:
    """Verifica el checksum del evento de Wompi."""
    raw = f"{transaction_id}{status}{amount_cents}{occurred_at}{settings.WOMPI_EVENTS_SECRET}"
    expected = hashlib.sha256(raw.encode()).hexdigest()
    # Comparación en tiempo constante para evitar timing attacks
    return hmac.compare_digest(expected, checksum or "")
