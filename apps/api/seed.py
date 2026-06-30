"""
Seed inicial: crea usuario administrador por defecto.
Uso: python seed.py
"""
import asyncio
import selectors
asyncio.set_event_loop(asyncio.SelectorEventLoop(selectors.SelectSelector()))
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.session import SessionLocal
from models.user import User, Role
from core.security import hash_password


async def seed():
    async with SessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == "admin@sd4a.com"))
        if existing.scalar_one_or_none():
            print("Admin ya existe, omitiendo seed.")
            return

        admin = User(
            id=str(uuid.uuid4()),
            email="admin@sd4a.com",
            name="Administrador SD4A",
            password_hash=hash_password("SD4A_admin_2026!"),
            role=Role.ADMIN,
            company="SD4A",
        )
        db.add(admin)
        await db.commit()
        print("✓ Admin creado: admin@sd4a.com / SD4A_admin_2026!")
        print("  ⚠ Cambia la contraseña inmediatamente en producción.")


if __name__ == "__main__":
    asyncio.run(seed())
