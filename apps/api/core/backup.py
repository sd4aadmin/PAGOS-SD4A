"""
Respaldo automático de la base de datos → Google Drive.

Exporta todas las tablas a un único JSON comprimido (gzip) y lo sube a
una carpeta "SD4A_BACKUPS" dentro del Drive del proyecto, conservando
solo los últimos N respaldos (rotación simple).
"""
import gzip
import json
import logging
from datetime import datetime, timezone
from decimal import Decimal

from db.session import Base, engine
from core.config import settings
from core.drive import find_or_create_folder, upload_file, list_files, delete_file

logger = logging.getLogger(__name__)

KEEP_LAST = 14  # ~2 semanas de respaldos diarios


def _json_default(value):
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


async def export_database_json() -> bytes:
    """Exporta cada tabla a JSON, en el orden que respeta las llaves foráneas."""
    data: dict[str, list[dict]] = {}
    async with engine.connect() as conn:
        for table in Base.metadata.sorted_tables:
            result = await conn.execute(table.select())
            data[table.name] = [dict(row._mapping) for row in result]
    payload = json.dumps(data, default=_json_default, ensure_ascii=False).encode("utf-8")
    return gzip.compress(payload)


async def run_backup() -> dict:
    content = await export_database_json()

    root_id = find_or_create_folder("SD4A_BACKUPS", settings.GOOGLE_DRIVE_ROOT_FOLDER)
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M")
    filename = f"backup_{ts}.json.gz"

    upload_file(root_id, filename, content, "application/gzip")

    # Rotación: conservar solo los últimos KEEP_LAST
    existing = sorted(list_files(root_id), key=lambda f: f["createdTime"], reverse=True)
    removed = 0
    for old in existing[KEEP_LAST:]:
        try:
            delete_file(old["id"])
            removed += 1
        except Exception as exc:
            logger.error("No se pudo borrar respaldo antiguo %s: %s", old.get("name"), exc)

    return {
        "filename": filename,
        "size_bytes": len(content),
        "total_backups": min(len(existing), KEEP_LAST),
        "removed_old": removed,
    }
