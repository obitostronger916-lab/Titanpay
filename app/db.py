from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(settings.async_db_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_session():
    async with SessionLocal() as session:
        yield session


async def init_db():
    from app import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        def add_order_identity_columns(sync_conn):
            columns = {column["name"] for column in inspect(sync_conn).get_columns("orders")}
            additions = {
                "client_id": "VARCHAR(64)",
                "privacy_id": "VARCHAR(128)",
                "character_name": "VARCHAR(64)",
                "server_name": "VARCHAR(32)",
            }
            for name, sql_type in additions.items():
                if name not in columns:
                    sync_conn.exec_driver_sql(
                        f"ALTER TABLE orders ADD COLUMN {name} {sql_type}"
                    )

        await conn.run_sync(add_order_identity_columns)

        # create_all mavjud jadvalga keyin qo'shilgan indekslarni avtomatik yaratmaydi.
        def ensure_rating_index(sync_conn):
            indexes = {item["name"] for item in inspect(sync_conn).get_indexes("ledger")}
            if "ix_ledger_rating_period" not in indexes:
                sync_conn.exec_driver_sql(
                    "CREATE INDEX ix_ledger_rating_period "
                    "ON ledger (ref_type, created_at, ref_id)"
                )

        await conn.run_sync(ensure_rating_index)
