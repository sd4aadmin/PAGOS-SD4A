import sys
import asyncio  # noqa

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from core.config import settings
from api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Migraciones inline (idempotentes)
    from db.session import engine
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE project_files ADD COLUMN IF NOT EXISTS version_label VARCHAR(50)"
        ))
        await conn.execute(text(
            "ALTER TABLE project_files ADD COLUMN IF NOT EXISTS description VARCHAR(500)"
        ))
        # Permitir emails duplicados (varios ingenieros con el mismo correo)
        await conn.execute(text(
            "DROP INDEX IF EXISTS ix_users_email"
        ))
        await conn.execute(text(
            "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key"
        ))
        # Tabla de perfiles de ingenieros (sin cuenta de login)
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS engineer_profiles (
                id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                email VARCHAR,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        # FK desde proyectos hacia perfiles (SET NULL al eliminar perfil)
        await conn.execute(text("""
            ALTER TABLE projects
            ADD COLUMN IF NOT EXISTS engineer_profile_id VARCHAR
            REFERENCES engineer_profiles(id) ON DELETE SET NULL
        """))
        # Ingeniero responsable del proyecto → usuario con rol ENGINEER
        await conn.execute(text("""
            ALTER TABLE projects
            ADD COLUMN IF NOT EXISTS assigned_engineer_id VARCHAR
            REFERENCES users(id) ON DELETE SET NULL
        """))
    yield


app = FastAPI(
    title="SD4A Portal API",
    version="1.0.0",
    docs_url="/docs" if settings.ENV != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
    debug=settings.ENV != "production",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if settings.ENV == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "sd4a-api"}
