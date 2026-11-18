"""Prueba del endpoint PATCH /projects/{id} sin base de datos real.

Se reemplazan las dependencias de usuario y de base de datos por dobles de prueba.
Ejecutar desde apps/api:  venv/Scripts/python.exe -m unittest discover -s tests -v
"""
import os
import sys
import unittest
from unittest import mock
from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient

from main import app
from deps import get_current_user
from db.session import get_db


def _proyecto():
    return SimpleNamespace(
        id="p1", code="SD4A-2026-001", name="Proyecto", description=None, status="IN_PROGRESS",
        total_value=Decimal("1000000"), advance_percent=30, progress=10,
        start_date=None, estimated_date=None, delivered_at=None, drive_folder_id=None,
        client_id="c1", members=[], engineer_profile_id=None, updated_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
        # la base falsa devuelve este mismo objeto al buscar al cliente
        email="cliente@example.com",
    )


class _Resultado:
    def __init__(self, valor):
        self._valor = valor

    def scalar_one_or_none(self):
        return self._valor


class _BaseFalsa:
    """Devuelve siempre el proyecto de prueba; el commit/refresh no hacen nada."""
    def __init__(self, proyecto):
        self.proyecto = proyecto
        self.commits = 0

    async def execute(self, *_a, **_k):
        return _Resultado(self.proyecto)

    def add(self, *_a, **_k):
        pass

    async def commit(self):
        self.commits += 1

    async def refresh(self, *_a, **_k):
        pass


class ActualizarProyectoTest(unittest.TestCase):
    def setUp(self):
        self.proyecto = _proyecto()
        self.db = _BaseFalsa(self.proyecto)
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)
        # No enviar correos reales durante las pruebas
        patcher = mock.patch("api.v1.endpoints.projects.mailer.fire")
        patcher.start()
        self.addCleanup(patcher.stop)

    def tearDown(self):
        app.dependency_overrides.clear()

    def _como(self, rol):
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
            id="u1", role=rol, is_active=True, session_version=1
        )

    def test_ingeniero_recibe_403_al_intentar_bajar_el_valor(self):
        self._como("ENGINEER")
        r = self.client.patch("/api/v1/projects/p1", json={"total_value": 1})
        self.assertEqual(r.status_code, 403)
        self.assertIn("total_value", r.json()["detail"])
        self.assertEqual(self.proyecto.total_value, Decimal("1000000"))  # no cambió
        self.assertEqual(self.db.commits, 0)

    def test_ingeniero_recibe_403_al_cambiar_el_estado(self):
        self._como("ENGINEER")
        r = self.client.patch("/api/v1/projects/p1", json={"status": "PAID"})
        self.assertEqual(r.status_code, 403)
        self.assertEqual(self.proyecto.status, "IN_PROGRESS")

    def test_ingeniero_si_puede_actualizar_el_avance(self):
        self._como("ENGINEER")
        r = self.client.patch("/api/v1/projects/p1", json={"progress": 60})
        self.assertNotEqual(r.status_code, 403)
        self.assertEqual(self.proyecto.progress, 60)

    def test_admin_si_puede_cambiar_el_estado(self):
        self._como("ADMIN")
        r = self.client.patch("/api/v1/projects/p1", json={"status": "IN_REVIEW"})
        self.assertNotEqual(r.status_code, 403)
        self.assertEqual(self.proyecto.status, "IN_REVIEW")


if __name__ == "__main__":
    unittest.main()
