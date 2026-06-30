"""
Rate limiting y bloqueo de cuenta por intentos fallidos de login.
Almacena en memoria (suficiente para un servidor single-process).
"""
import time
from collections import defaultdict

# {ip: [timestamp, ...]} — ventana de 15 minutos
_ip_attempts: dict[str, list[float]] = defaultdict(list)
# {email: (intentos_fallidos, bloqueado_hasta)}
_account_attempts: dict[str, tuple[int, float]] = defaultdict(lambda: (0, 0.0))

WINDOW_SECONDS = 900       # 15 minutos
MAX_IP_ATTEMPTS = 20       # máx intentos por IP en la ventana
MAX_ACCOUNT_ATTEMPTS = 5   # máx intentos fallidos por cuenta
LOCKOUT_SECONDS = 300      # bloqueo de cuenta por 5 minutos


def _clean_window(timestamps: list[float]) -> list[float]:
    cutoff = time.time() - WINDOW_SECONDS
    return [t for t in timestamps if t > cutoff]


def check_ip_rate_limit(ip: str) -> bool:
    """Retorna True si la IP está dentro del límite."""
    _ip_attempts[ip] = _clean_window(_ip_attempts[ip])
    return len(_ip_attempts[ip]) < MAX_IP_ATTEMPTS


def record_ip_attempt(ip: str) -> None:
    _ip_attempts[ip].append(time.time())


def check_account_lockout(email: str) -> tuple[bool, int]:
    """Retorna (bloqueada, segundos_restantes)."""
    attempts, locked_until = _account_attempts[email]
    if locked_until > time.time():
        remaining = int(locked_until - time.time())
        return True, remaining
    return False, 0


def record_failed_login(email: str) -> int:
    """Registra un intento fallido. Retorna intentos acumulados."""
    attempts, locked_until = _account_attempts[email]
    if locked_until > 0 and locked_until <= time.time():
        attempts = 0
    attempts += 1
    locked_until = time.time() + LOCKOUT_SECONDS if attempts >= MAX_ACCOUNT_ATTEMPTS else 0.0
    _account_attempts[email] = (attempts, locked_until)
    return attempts


def reset_account_attempts(email: str) -> None:
    """Resetea intentos al hacer login exitoso."""
    _account_attempts[email] = (0, 0.0)
