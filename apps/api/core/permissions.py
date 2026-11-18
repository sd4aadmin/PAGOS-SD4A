"""
Reglas de permisos por campo.

Los ingenieros pueden actualizar el avance, las fechas y la descripción de un
proyecto, pero NO los campos que controlan lo financiero o el acceso a archivos:
el saldo pendiente se calcula con `total_value`, así que dejar que un ingeniero lo
edite permitiría a un cliente descargar entregables sin pagar.
"""
from models.user import Role

# Campos de un proyecto que solo un administrador puede modificar.
ADMIN_ONLY_PROJECT_FIELDS = frozenset({
    "status",
    "total_value",
    "advance_percent",
    "drive_folder_id",
    "engineer_profile_id",
    "assigned_engineer_id",
})


def admin_only_fields_touched(role: str | Role, changes: dict) -> list[str]:
    """Campos reservados al administrador que `changes` intenta modificar.

    Devuelve una lista vacía si el rol es ADMIN o si no se toca ninguno.
    """
    if role == Role.ADMIN:
        return []
    return sorted(ADMIN_ONLY_PROJECT_FIELDS & changes.keys())
