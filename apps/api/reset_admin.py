import sys; sys.path.insert(0, ".")
import asyncio, selectors
asyncio.set_event_loop(asyncio.SelectorEventLoop(selectors.SelectSelector()))
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from core.security import hash_password

async def reset():
    h = hash_password("Admin2026!")
    engine = create_async_engine("postgresql+psycopg://postgres:SD4A2026@127.0.0.1:5432/sd4a_portal")
    async with engine.begin() as conn:
        await conn.execute(text("UPDATE users SET password_hash=:h WHERE email='admin@sd4a.com'"), {"h": h})
        print("Password reset OK")
    await engine.dispose()

asyncio.get_event_loop().run_until_complete(reset())
