import os

# Sozlamalar app import qilinishidan OLDIN o'rnatiladi
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_titan.db"
os.environ["BOT_TOKEN"] = "123456:TESTTOKEN"
os.environ["ADMIN_ID"] = "111"
os.environ["PAYMENT_PROVIDER"] = "none"
os.environ["PAYMENT_WEBHOOK_SECRET"] = "whsec_test"
os.environ["ONESTATE_API_URL"] = ""
os.environ["ONESTATE_API_KEY"] = ""

import pytest_asyncio  # noqa: E402

from app import models  # noqa: E402,F401
from app.db import Base, SessionLocal, engine  # noqa: E402


@pytest_asyncio.fixture(autouse=True)
async def fresh_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


@pytest_asyncio.fixture
async def session():
    async with SessionLocal() as s:
        yield s
