"""Pruebas de los permisos por campo. Ejecutar desde apps/api:

    venv/Scripts/python.exe -m unittest discover -s tests -v
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.permissions import ADMIN_ONLY_PROJECT_FIELDS, admin_only_fields_touched
from models.user import Role


class AdminOnlyFieldsTest(unittest.TestCase):
    def test_ingeniero_no_puede_cambiar_el_valor_del_proyecto(self):
        self.assertEqual(
            admin_only_fields_touched(Role.ENGINEER, {"total_value": 1}),
            ["total_value"],
        )

    def test_ingeniero_no_puede_cambiar_el_estado_ni_la_carpeta_de_drive(self):
        blocked = admin_only_fields_touched(
            Role.ENGINEER, {"status": "PAID", "drive_folder_id": "x", "progress": 50}
        )
        self.assertEqual(blocked, ["drive_folder_id", "status"])

    def test_ingeniero_si_puede_cambiar_avance_fechas_y_descripcion(self):
        changes = {"progress": 80, "start_date": "2026-01-01", "estimated_date": "2026-02-01",
                   "description": "texto", "name": "Nuevo nombre"}
        self.assertEqual(admin_only_fields_touched(Role.ENGINEER, changes), [])

    def test_admin_puede_cambiar_cualquier_campo(self):
        changes = {f: 1 for f in ADMIN_ONLY_PROJECT_FIELDS}
        self.assertEqual(admin_only_fields_touched(Role.ADMIN, changes), [])

    def test_acepta_el_rol_como_texto_tal_como_lo_devuelve_la_base_de_datos(self):
        self.assertEqual(admin_only_fields_touched("ADMIN", {"total_value": 1}), [])
        self.assertEqual(admin_only_fields_touched("ENGINEER", {"total_value": 1}), ["total_value"])


if __name__ == "__main__":
    unittest.main()
