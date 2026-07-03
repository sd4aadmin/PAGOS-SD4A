import sys; sys.path.insert(0, ".")
import asyncio, os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from core.security import hash_password

async def reset():
    db_url = os.environ["DATABASE_URL"].replace("postgresql://", "postgresql+psycopg://")
    h = hash_password("Admin2026!")
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        await conn.execute(text("UPDATE users SET password_hash=:h WHERE email='admin@sd4a.com'"), {"h": h})
        print("Password reset OK")
    await engine.dispose()

asyncio.run(reset())
