"""
Servicio de email — envía notificaciones HTML via Brevo (HTTP API).
"""
import asyncio
import logging
from typing import Coroutine

import httpx

from core.config import settings

logger = logging.getLogger(__name__)

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def fire(coro: Coroutine) -> None:
    """Lanza una corutina en background logueando cualquier excepción."""
    async def _run():
        try:
            await coro
        except Exception as exc:
            logger.error("Background email task failed: %s", exc, exc_info=True)
    asyncio.create_task(_run())


async def send_email(to: str, subject: str, html: str) -> None:
    if not settings.BREVO_API_KEY:
        logger.warning("BREVO_API_KEY no configurado — email no enviado: %s", subject)
        return

    payload = {
        "sender": {
            "name": settings.EMAIL_FROM_NAME,
            "email": settings.EMAIL_FROM_ADDRESS,
        },
        "to": [{"email": to}],
        "subject": subject,
        "htmlContent": html,
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                BREVO_URL,
                json=payload,
                headers={
                    "accept": "application/json",
                    "api-key": settings.BREVO_API_KEY,
                    "content-type": "application/json",
                },
            )
        if r.status_code >= 400:
            logger.error("Brevo error %s: %s", r.status_code, r.text)
        else:
            logger.info("Email enviado a %s: %s", to, subject)
    except Exception as exc:
        logger.error("Error enviando email a %s: %s", to, exc)


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
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#102a6e;padding:24px 32px;">
            <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">SD4A</span>
            <span style="color:#7dd3fc;font-size:12px;margin-left:8px;">Portal de Proyectos</span>
          </td>
        </tr>
        <tr><td style="padding:32px;">{body}</td></tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
              SD4A Ingeniería BIM &nbsp;|&nbsp; Este es un correo automático, no responder.
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
<p style="margin:24px 0 0;">
  <a href="{url}" style="display:inline-block;background:#102a6e;color:#ffffff;padding:12px 28px;
     border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">{label}</a>
</p>"""


def _h1(text: str) -> str:
    return f'<h1 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:700;">{text}</h1>'


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
