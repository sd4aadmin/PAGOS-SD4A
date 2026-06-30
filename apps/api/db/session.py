from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from core.config import settings

# psycopg3 async driver (mejor soporte Python 3.14 que asyncpg)
_db_url = (
    settings.DATABASE_URL
    .replace("postgresql://", "postgresql+psycopg://")
    .replace("@localhost:", "@127.0.0.1:")
)

engine = create_async_engine(
    _db_url,
    echo=settings.ENV == "development",
    pool_pre_ping=True,
)

SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session
