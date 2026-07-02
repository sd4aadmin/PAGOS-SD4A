import asyncio
import selectors

asyncio.set_event_loop_policy(asyncio.DefaultEventLoopPolicy())
loop = asyncio.SelectorEventLoop(selectors.SelectSelector())
asyncio.set_event_loop(loop)

from db.session import Base, engine
import models.user, models.project, models.payment, models.deliverable, models.project_file

async def create():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ Tablas creadas correctamente")

loop.run_until_complete(create())
