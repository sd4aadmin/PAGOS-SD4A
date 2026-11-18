"""Pruebas de las solicitudes de cambio (esquema y endpoints, sin base de datos real).

Ejecutar desde apps/api:  venv/Scripts/python.exe -m unittest discover -s tests -v
"""
import os
import sys
import unittest
from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from pydantic import ValidationError

from main import app
from deps import get_current_user
from db.session import get_db
from schemas.change import ProjectChangeCreate


class EsquemaTest(unittest.TestCase):
    def test_cambio_del_cliente_exige_valor_mayor_a_cero(self):
        with self.assertRaises(ValidationError):
            ProjectChangeCreate(description="Mover columna", responsible="CLIENT", amount=0)

    def test_cambio_del_cliente_con_valor(self):
        c = ProjectChangeCreate(description="Mover columna", responsible="CLIENT", amount="1500000")
        self.assertEqual(c.amount, Decimal("1500000"))

    def test_cambio_de_sd4a_no_se_cobra_aunque_llegue_un_valor(self):
        c = ProjectChangeCreate(description="Error nuestro", responsible="SD4A", amount="999999")
        self.assertEqual(c.amount, Decimal("0"))

    def test_rechaza_valor_negativo_y_descripcion_vacia(self):
        with self.assertRaises(ValidationError):
            ProjectChangeCreate(description="Cambio", responsible="CLIENT", amount=-5)
        with self.assertRaises(ValidationError):
            ProjectChangeCreate(description="  ", responsible="SD4A")

    def test_rechaza_responsable_desconocido(self):
        with self.assertRaises(ValidationError):
            ProjectChangeCreate(description="Cambio", responsible="OTRO", amount=10)


class _Res:
    def __init__(self, valor):
        self.valor = valor

    def scalar_one_or_none(self):
        return self.valor

    def all(self):
        return self.valor


class _DbFalsa:
    """Responde a cada `execute` con el siguiente resultado de la cola."""
    def __init__(self, *resultados):
        self.cola = list(resultados)
        self.agregados, self.borrados, self.commits = [], [], 0

    async def execute(self, *_a, **_k):
        return _Res(self.cola.pop(0))

    def add(self, obj):
        self.agregados.append(obj)

    async def delete(self, obj):
        self.borrados.append(obj)

    async def commit(self):
        self.commits += 1

    async def refresh(self, obj):
        if getattr(obj, "created_at", None) is None:
            obj.created_at = datetime.utcnow()


def _proyecto(client_id="c1", total="1000000"):
    return SimpleNamespace(id="p1", code="SD4A-2026-001", name="Proyecto", client_id=client_id,
                           total_value=Decimal(total))


CLIENTE = SimpleNamespace(id="c1", email="cliente@example.com", name="Cliente")


class EndpointsTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        patcher = mock.patch("api.v1.endpoints.changes.mailer.fire")
        self.fire = patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(app.dependency_overrides.clear)

    def _usar(self, db, rol, uid="a1"):
        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
            id=uid, role=rol, name="Admin", is_active=True, session_version=1)

    def test_admin_registra_cambio_del_cliente_y_suma_al_valor(self):
        proyecto = _proyecto()
        db = _DbFalsa(proyecto, CLIENTE)
        self._usar(db, "ADMIN")
        r = self.client.post("/api/v1/projects/p1/changes",
                             json={"description": "Agregar un piso", "responsible": "CLIENT", "amount": 2500000})
        self.assertEqual(r.status_code, 201, r.text)
        self.assertEqual(proyecto.total_value, Decimal("3500000"))
        self.assertTrue(r.json()["charged"])
        self.assertEqual(self.fire.call_count, 1)  # se notificó al cliente

    def test_cambio_de_sd4a_no_modifica_el_valor_pero_notifica(self):
        proyecto = _proyecto()
        db = _DbFalsa(proyecto, CLIENTE)
        self._usar(db, "ADMIN")
        r = self.client.post("/api/v1/projects/p1/changes",
                             json={"description": "Plano mal dimensionado", "responsible": "SD4A", "amount": 500})
        self.assertEqual(r.status_code, 201, r.text)
        self.assertEqual(proyecto.total_value, Decimal("1000000"))
        self.assertFalse(r.json()["charged"])
        self.assertEqual(Decimal(str(r.json()["amount"])), Decimal("0"))
        self.assertEqual(self.fire.call_count, 1)

    def test_ingeniero_y_cliente_no_pueden_registrar(self):
        for rol in ("ENGINEER", "CLIENT"):
            self._usar(_DbFalsa(_proyecto(), CLIENTE), rol)
            r = self.client.post("/api/v1/projects/p1/changes",
                                 json={"description": "Algo", "responsible": "CLIENT", "amount": 10})
            self.assertEqual(r.status_code, 403, rol)

    def test_cliente_de_otro_proyecto_no_puede_listar(self):
        self._usar(_DbFalsa(_proyecto(client_id="otro")), "CLIENT", uid="c1")
        self.assertEqual(self.client.get("/api/v1/projects/p1/changes").status_code, 403)

    def test_cliente_dueno_si_puede_listar(self):
        cambio = SimpleNamespace(id="x", project_id="p1", description="Cambio", responsible="CLIENT",
                                 amount=Decimal("100"), created_at=datetime.utcnow())
        self._usar(_DbFalsa(_proyecto(), [(cambio, "Admin")]), "CLIENT", uid="c1")
        r = self.client.get("/api/v1/projects/p1/changes")
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()[0]["created_by_name"], "Admin")

    def test_eliminar_cambio_resta_su_valor(self):
        proyecto = _proyecto(total="3500000")
        cambio = SimpleNamespace(id="x", project_id="p1", description="Cambio", responsible="CLIENT",
                                 amount=Decimal("2500000"))
        db = _DbFalsa(proyecto, cambio)
        self._usar(db, "ADMIN")
        r = self.client.delete("/api/v1/projects/p1/changes/x")
        self.assertEqual(r.status_code, 204, r.text)
        self.assertEqual(proyecto.total_value, Decimal("1000000"))
        self.assertEqual(db.borrados, [cambio])

    def test_no_se_elimina_si_el_valor_quedaria_en_cero(self):
        proyecto = _proyecto(total="1000000")
        cambio = SimpleNamespace(id="x", project_id="p1", description="Cambio", responsible="CLIENT",
                                 amount=Decimal("1000000"))
        self._usar(_DbFalsa(proyecto, cambio), "ADMIN")
        self.assertEqual(self.client.delete("/api/v1/projects/p1/changes/x").status_code, 400)
        self.assertEqual(proyecto.total_value, Decimal("1000000"))


if __name__ == "__main__":
    unittest.main()
