import enum
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, func, TypeDecorator, cast
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.orm import Mapped, mapped_column

from db.session import Base


class Role(str, enum.Enum):
    ADMIN = "ADMIN"
    ENGINEER = "ENGINEER"
    CLIENT = "CLIENT"


class _PgEnumCast(TypeDecorator):
    """Maps a Python StrEnum to a pre-existing PostgreSQL enum with explicit CAST."""
    impl = String
    cache_ok = True

    def __init__(self, enum_cls, pg_name):
        super().__init__()
        self._enum_cls = enum_cls
        self._pg_type = PgEnum(enum_cls, name=pg_name, create_type=False)

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return value.value if hasattr(value, "value") else str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return self._enum_cls(value)

    def bind_expression(self, bindparam):
        return cast(bindparam, self._pg_type)


_RoleCol = _PgEnumCast(Role, "Role")


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    password_hash: Mapped[str] = mapped_column("password_hash", String, nullable=False)
    role: Mapped[str] = mapped_column(String, default="CLIENT")
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    company: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column("is_active", Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column("created_at", DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column("updated_at", DateTime, default=_now, onupdate=_now)
