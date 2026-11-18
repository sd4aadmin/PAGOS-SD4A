"""Reglas de los 4 estados automáticos del proyecto.

Ejecutar desde apps/api:  venv/Scripts/python.exe -m unittest discover -s tests -v
"""
import os
import sys
import unittest
from decimal import Decimal
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.project_status import canonical_status, progress_for, is_fully_paid, recompute_status


def proyecto(status="PENDING_ADVANCE", total="1000000", advance=30, delivered=None):
    return SimpleNamespace(status=status, total_value=Decimal(total), advance_percent=advance, delivered_at=delivered)


class EstadosAntiguosTest(unittest.TestCase):
    def test_los_7_estados_antiguos_pasan_a_los_4_nuevos(self):
        self.assertEqual(canonical_status("IN_REVIEW"), "IN_PROGRESS")
        self.assertEqual(canonical_status("PENDING_FINAL"), "FINISHED")
        self.assertEqual(canonical_status("PAID"), "DELIVERED")
        for s in ("PENDING_ADVANCE", "IN_PROGRESS", "FINISHED", "DELIVERED"):
            self.assertEqual(canonical_status(s), s)

    def test_avance_fijo_por_estado(self):
        self.assertEqual([progress_for(s) for s in ("PENDING_ADVANCE", "IN_PROGRESS", "FINISHED", "DELIVERED")], [0, 50, 100, 100])
        self.assertEqual(progress_for("IN_REVIEW"), 50)  # un estado antiguo se trata como En curso


class AnticipoTest(unittest.TestCase):
    def test_sin_pagos_sigue_en_anticipo(self):
        p = proyecto()
        self.assertFalse(recompute_status(p, 0))
        self.assertEqual(p.status, "PENDING_ADVANCE")

    def test_anticipo_incompleto_no_inicia_el_proyecto(self):
        p = proyecto()
        recompute_status(p, 299999)  # el 30% de 1.000.000 son 300.000
        self.assertEqual(p.status, "PENDING_ADVANCE")

    def test_anticipo_cubierto_pasa_a_en_curso(self):
        p = proyecto()
        self.assertTrue(recompute_status(p, 300000))
        self.assertEqual(p.status, "IN_PROGRESS")


class PagoTotalTest(unittest.TestCase):
    def test_pagar_todo_antes_de_terminar_deja_en_curso(self):
        p = proyecto()
        recompute_status(p, 1000000)
        self.assertEqual(p.status, "IN_PROGRESS")
        self.assertIsNone(p.delivered_at)
        self.assertTrue(is_fully_paid(p.total_value, 1000000))

    def test_terminado_y_pagado_pasa_a_entregado_con_fecha(self):
        p = proyecto(status="FINISHED")
        self.assertTrue(recompute_status(p, 1000000))
        self.assertEqual(p.status, "DELIVERED")
        self.assertIsNotNone(p.delivered_at)

    def test_terminado_con_saldo_pendiente_no_se_entrega(self):
        p = proyecto(status="FINISHED")
        recompute_status(p, 700000)
        self.assertEqual(p.status, "FINISHED")

    def test_entregado_no_se_puede_forzar_sin_pago_completo(self):
        p = proyecto(status="DELIVERED")  # alguien intenta ponerlo entregado a mano
        recompute_status(p, 400000)
        self.assertEqual(p.status, "FINISHED")
        self.assertIsNone(p.delivered_at)

    def test_cambio_cobrado_en_un_proyecto_entregado_lo_devuelve_a_terminado(self):
        p = proyecto(status="DELIVERED", total="1000000")
        recompute_status(p, 1000000)
        self.assertEqual(p.status, "DELIVERED")
        p.total_value = Decimal("3500000")  # se registró un cambio de 2.500.000
        recompute_status(p, 1000000)
        self.assertEqual(p.status, "FINISHED")
        recompute_status(p, 3500000)  # el cliente paga el cambio
        self.assertEqual(p.status, "DELIVERED")

    def test_reabrir_un_proyecto_lo_deja_en_curso_y_borra_la_fecha(self):
        p = proyecto(status="IN_PROGRESS", delivered=object())
        recompute_status(p, 1000000)
        self.assertEqual(p.status, "IN_PROGRESS")
        self.assertIsNone(p.delivered_at)

    def test_estados_antiguos_se_tratan_como_sus_equivalentes(self):
        p = proyecto(status="PENDING_FINAL")
        recompute_status(p, 1000000)
        self.assertEqual(p.status, "DELIVERED")


if __name__ == "__main__":
    unittest.main()
