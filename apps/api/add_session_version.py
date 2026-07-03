"""Agrega columna session_version a la tabla users."""
import asyncio, os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    db_url = os.environ["DATABASE_URL"].replace("postgresql://", "postgresql+psycopg://")
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        await conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;
        """))
    print("OK — columna session_version agregada")
    await engine.dispose()

asyncio.run(main())
