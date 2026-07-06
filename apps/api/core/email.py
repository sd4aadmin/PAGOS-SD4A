"""
Servicio de email — usa Brevo si hay API key, si no usa SMTP (Gmail).
"""
import asyncio
import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Coroutine

import httpx

from core.config import settings

logger = logging.getLogger(__name__)

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def fire(coro: Coroutine) -> None:
    async def _run():
        try:
            await coro
        except Exception as exc:
            logger.error("Background email task failed: %s", exc, exc_info=True)
    asyncio.create_task(_run())


async def send_email(to: str, subject: str, html: str) -> None:
    # ── Brevo (si está configurado) ──────────────────────────────────────────
    if settings.BREVO_API_KEY:
        payload = {
            "sender": {"name": settings.EMAIL_FROM_NAME, "email": settings.EMAIL_FROM_ADDRESS},
            "to": [{"email": to}],
            "subject": subject,
            "htmlContent": html,
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(
                    BREVO_URL, json=payload,
                    headers={"accept": "application/json", "api-key": settings.BREVO_API_KEY, "content-type": "application/json"},
                )
            if r.status_code >= 400:
                logger.error("Brevo error %s: %s", r.status_code, r.text)
            else:
                logger.info("Email enviado (Brevo) a %s: %s", to, subject)
        except Exception as exc:
            logger.error("Error Brevo a %s: %s", to, exc)
        return

    # ── SMTP Gmail (fallback) ────────────────────────────────────────────────
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("Sin credenciales de email — no enviado: %s", subject)
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"] = to
        msg.attach(MIMEText(html, "html", "utf-8"))

        context = ssl.create_default_context()
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _smtp_send, msg, to, context)
        logger.info("Email enviado (SMTP) a %s: %s", to, subject)
    except Exception as exc:
        logger.error("Error SMTP a %s: %s", to, exc)


def _smtp_send(msg: MIMEMultipart, to: str, context: ssl.SSLContext) -> None:
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        server.starttls(context=context)
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_USER, to, msg.as_string())


# ─── PLANTILLAS ───────────────────────────────────────────────────────────────

def _base(title: str, body: str) -> str:
    # Logo público en Vercel (PNG transparente sobre fondo teal)
    logo_url = "data:image/png;base64,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"
    return f"""
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#eaf4f4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eaf4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:14px;overflow:hidden;
                    box-shadow:0 4px 16px rgba(10,120,129,.12);max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#0A7881 0%,#68B2B7 100%);padding:28px 36px;">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td>
                  <img src="{logo_url}" alt="SD4A" width="150" height="48"
                       style="display:block;object-fit:contain;" />
                </td>
                <td align="right">
                  <span style="color:rgba(255,255,255,.75);font-size:12px;letter-spacing:.5px;">
                    Portal de Proyectos
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ACCENT LINE -->
        <tr>
          <td style="background:#9BE3BF;height:4px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- BODY -->
        <tr><td style="padding:36px 36px 28px;">{body}</td></tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#f0fafa;padding:20px 36px;border-top:1px solid #cde8e9;">
            <p style="margin:0 0 8px;text-align:center;">
              <a href="https://pagos-sd-4-a.vercel.app/login"
                 style="color:#0A7881;font-size:13px;font-weight:600;text-decoration:none;">
                Ingresar al portal →
              </a>
            </p>
            <p style="margin:0;color:#7aadaf;font-size:12px;text-align:center;line-height:1.6;">
              SD4A Ingeniería Estructural &nbsp;|&nbsp; Este es un correo automático, no responder.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _btn(label: str, url: str) -> str:
    return f"""
<p style="margin:28px 0 0;">
  <a href="{url}" style="display:inline-block;background:linear-gradient(135deg,#0A7881,#68B2B7);
     color:#ffffff;padding:13px 32px;border-radius:8px;text-decoration:none;
     font-weight:700;font-size:14px;letter-spacing:.3px;">{label}</a>
</p>"""


def _h1(text: str) -> str:
    return f'<h1 style="margin:0 0 8px;color:#0A7881;font-size:22px;font-weight:700;">{text}</h1>'


def _p(text: str) -> str:
    return f'<p style="margin:12px 0;color:#475569;font-size:15px;line-height:1.6;">{text}</p>'


def _badge(text: str, color: str = "#e0f2fe", text_color: str = "#0369a1") -> str:
    return f'<span style="display:inline-block;background:{color};color:{text_color};padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">{text}</span>'


def _info_row(label: str, value: str) -> str:
    return f"""
<tr>
  <td style="padding:8px 0;color:#64748b;font-size:13px;width:160px;">{label}</td>
  <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:600;">{value}</td>
</tr>"""


def _table(*rows: str) -> str:
    inner = "".join(rows)
    return f'<table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">{inner}</table>'


# ─── EMAILS ESPECÍFICOS ───────────────────────────────────────────────────────

async def send_project_created(
    to: str, client_name: str, project_name: str, project_code: str,
    total_value: str, advance_percent: int, advance_amount: str,
    app_url: str, project_id: str,
) -> None:
    body = (
        _h1(f"Nuevo proyecto asignado: {project_code}")
        + _p(f"Hola {client_name}, tu proyecto ha sido creado exitosamente en el portal SD4A.")
        + _table(
            _info_row("Proyecto", project_name),
            _info_row("Código", project_code),
            _info_row("Valor total", total_value),
            _info_row("Anticipo requerido", f"{advance_amount} ({advance_percent}%)"),
        )
        + _p("Para avanzar con el proyecto, realiza el pago del anticipo desde el portal.")
        + _btn("Ver mi proyecto", f"{app_url}/dashboard/projects/{project_id}")
    )
    await send_email(to, f"SD4A — Proyecto {project_code} creado", _base(f"Proyecto {project_code}", body))


async def send_status_changed(
    to: str, client_name: str, project_name: str, project_code: str,
    old_status: str, new_status: str, app_url: str, project_id: str,
) -> None:
    status_map = {
        "PENDING_ADVANCE": "Pendiente anticipo", "IN_PROGRESS": "En ejecución",
        "IN_REVIEW": "En revisión", "FINISHED": "Finalizado",
        "PENDING_FINAL": "Pendiente pago final", "PAID": "Pagado", "DELIVERED": "Entregado",
    }
    new_label = status_map.get(new_status, new_status)
    old_label = status_map.get(old_status, old_status)
    body = (
        _h1(f"Actualización de estado: {project_code}")
        + _p(f"Hola {client_name}, el estado de tu proyecto <strong>{project_name}</strong> ha cambiado.")
        + _table(_info_row("Antes", old_label), _info_row("Ahora", _badge(new_label)))
        + _btn("Ver proyecto", f"{app_url}/dashboard/projects/{project_id}")
    )
    await send_email(to, f"SD4A — {project_code} ahora está: {new_label}", _base("Estado del proyecto", body))


async def send_project_updated(
    to: str, client_name: str, project_name: str, project_code: str,
    changes: dict, app_url: str, project_id: str,
) -> None:
    field_labels = {
        "progress": "Progreso", "status": "Estado", "name": "Nombre",
        "description": "Descripción", "estimated_date": "Fecha estimada",
        "total_value": "Valor total", "advance_percent": "% Anticipo",
    }
    status_map = {
        "PENDING_ADVANCE": "Pendiente anticipo", "IN_PROGRESS": "En ejecución",
        "IN_REVIEW": "En revisión", "FINISHED": "Finalizado",
        "PENDING_FINAL": "Pendiente pago final", "PAID": "Pagado", "DELIVERED": "Entregado",
    }
    rows = ""
    for key, val in changes.items():
        label = field_labels.get(key, key)
        if key == "status":
            val = _badge(status_map.get(str(val), str(val)))
        elif key == "progress":
            val = f"{val}%"
        elif key == "total_value":
            val = f"${float(val):,.0f} COP"
        rows += _info_row(label, str(val))
    body = (
        _h1(f"Actualización en tu proyecto: {project_code}")
        + _p(f"Hola {client_name}, tu proyecto <strong>{project_name}</strong> ha sido actualizado.")
        + _table(rows)
        + _btn("Ver proyecto", f"{app_url}/dashboard/projects/{project_id}")
    )
    await send_email(to, f"SD4A — Actualización en {project_code}", _base("Proyecto actualizado", body))


async def send_payment_confirmed(
    to: str, client_name: str, project_name: str, project_code: str,
    payment_type: str, amount: str, app_url: str, project_id: str,
) -> None:
    type_map = {"ADVANCE": "Anticipo", "PARTIAL": "Pago parcial", "FINAL": "Pago final"}
    type_label = type_map.get(payment_type, payment_type)
    body = (
        _h1("Pago confirmado")
        + _p(f"Hola {client_name}, hemos confirmado tu pago para el proyecto <strong>{project_name}</strong>.")
        + _table(
            _info_row("Proyecto", f"{project_code} — {project_name}"),
            _info_row("Tipo de pago", type_label),
            _info_row("Monto", amount),
            _info_row("Estado", _badge("Confirmado", "#d1fae5", "#065f46")),
        )
        + _btn("Ver proyecto", f"{app_url}/dashboard/projects/{project_id}")
    )
    await send_email(to, f"SD4A — Pago {type_label} confirmado: {project_code}", _base("Pago confirmado", body))


async def send_welcome_client(
    to: str, client_name: str, email: str, password: str, app_url: str,
) -> None:
    body = (
        _h1(f"Bienvenido al Portal SD4A, {client_name}")
        + _p("Tu cuenta ha sido creada. Usa las siguientes credenciales para ingresar al portal y consultar el estado de tus proyectos.")
        + _table(
            _info_row("Correo electrónico", email),
            _info_row("Contraseña", f'<code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:13px;">{password}</code>'),
        )
        + _p("Te recomendamos cambiar tu contraseña después de ingresar por primera vez.")
        + _btn("Ingresar al portal", f"{app_url}/login")
        + _p('<small style="color:#94a3b8;">Si no solicitaste esta cuenta, ignora este mensaje.</small>')
    )
    await send_email(to, "SD4A — Bienvenido a tu portal de proyectos", _base("Bienvenido a SD4A", body))


async def send_deliverable_uploaded(
    to: str, client_name: str, project_name: str, project_code: str,
    file_name: str, app_url: str, project_id: str,
) -> None:
    body = (
        _h1("Nuevo entregable disponible")
        + _p(f"Hola {client_name}, hay un nuevo archivo disponible en tu proyecto <strong>{project_name}</strong>.")
        + _table(
            _info_row("Proyecto", f"{project_code} — {project_name}"),
            _info_row("Archivo", file_name),
        )
        + _p("Ingresa al portal para ver y descargar el archivo.")
        + _btn("Ver proyecto", f"{app_url}/dashboard/projects/{project_id}")
    )
    await send_email(to, f"SD4A — Nuevo entregable en {project_code}", _base("Nuevo entregable", body))


async def send_payment_link(
    to: str, client_name: str, project_name: str, project_code: str,
    payment_type: str, amount: str, checkout_url: str,
) -> None:
    type_map = {"ADVANCE": "Anticipo", "PARTIAL": "Pago parcial", "FINAL": "Pago final"}
    type_label = type_map.get(payment_type, payment_type)
    body = (
        _h1("Enlace de pago disponible")
        + _p(f"Hola {client_name}, tienes un pago pendiente para el proyecto <strong>{project_name}</strong>.")
        + _table(
            _info_row("Proyecto", f"{project_code} — {project_name}"),
            _info_row("Tipo", type_label),
            _info_row("Monto", amount),
        )
        + _p("Haz clic en el botón para completar el pago de forma segura a través de Wompi.")
        + _btn(f"Pagar {type_label} — {amount}", checkout_url)
        + _p('<small style="color:#94a3b8;">El enlace es de un solo uso y está asociado a tu proyecto.</small>')
    )
    await send_email(to, f"SD4A — Pago pendiente: {project_code} ({type_label})", _base("Enlace de pago", body))
