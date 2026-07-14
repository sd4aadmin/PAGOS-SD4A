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
                  <span style="display:inline-block;font-family:Arial Black,Arial,sans-serif;
                                font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-1px;
                                line-height:1;">SD<span style="color:#9BE3BF;">4</span>A</span>
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


def _esc(text: str) -> str:
    """Escapa HTML en valores dinámicos (nombres, notas, etc.) para evitar
    inyección de HTML/enlaces falsos en los correos."""
    import html
    return html.escape(str(text), quote=True)


def _btn(label: str, url: str) -> str:
    return f"""
<p style="margin:28px 0 0;">
  <a href="{_esc(url)}" style="display:inline-block;background:linear-gradient(135deg,#0A7881,#68B2B7);
     color:#ffffff;padding:13px 32px;border-radius:8px;text-decoration:none;
     font-weight:700;font-size:14px;letter-spacing:.3px;">{_esc(label)}</a>
</p>"""


def _h1(text: str) -> str:
    return f'<h1 style="margin:0 0 8px;color:#0A7881;font-size:22px;font-weight:700;">{_esc(text)}</h1>'


def _p(text: str) -> str:
    return f'<p style="margin:12px 0;color:#475569;font-size:15px;line-height:1.6;">{_esc(text)}</p>'


def _p_raw(html_text: str) -> str:
    """Como _p pero SIN escapar — el llamador debe escapar las variables con _esc()."""
    return f'<p style="margin:12px 0;color:#475569;font-size:15px;line-height:1.6;">{html_text}</p>'


def _badge(text: str, color: str = "#e0f2fe", text_color: str = "#0369a1") -> str:
    return f'<span style="display:inline-block;background:{color};color:{text_color};padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">{_esc(text)}</span>'


def _info_row(label: str, value: str) -> str:
    return f"""
<tr>
  <td style="padding:8px 0;color:#64748b;font-size:13px;width:160px;">{_esc(label)}</td>
  <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:600;">{_esc(value)}</td>
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
        + _p_raw(f"Hola {_esc(client_name)}, el estado de tu proyecto <strong>{_esc(project_name)}</strong> ha cambiado.")
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
        "engineer_profile_name": "Ingeniero asignado",
    }
    # Internal ID fields — never shown to clients
    skip_fields = {"engineer_profile_id", "assigned_engineer_id", "drive_folder_id", "client_id"}
    status_map = {
        "PENDING_ADVANCE": "Pendiente anticipo", "IN_PROGRESS": "En ejecución",
        "IN_REVIEW": "En revisión", "FINISHED": "Finalizado",
        "PENDING_FINAL": "Pendiente pago final", "PAID": "Pagado", "DELIVERED": "Entregado",
    }
    rows = ""
    for key, val in changes.items():
        if key in skip_fields:
            continue
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
        + _p_raw(f"Hola {_esc(client_name)}, tu proyecto <strong>{_esc(project_name)}</strong> ha sido actualizado.")
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
        + _p_raw(f"Hola {_esc(client_name)}, hemos confirmado tu pago para el proyecto <strong>{_esc(project_name)}</strong>.")
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
        + _p_raw(f"Hola {_esc(client_name)}, hay un nuevo archivo disponible en tu proyecto <strong>{_esc(project_name)}</strong>.")
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
        + _p_raw(f"Hola {_esc(client_name)}, tienes un pago pendiente para el proyecto <strong>{_esc(project_name)}</strong>.")
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

