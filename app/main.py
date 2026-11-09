import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api import admin, user, webhook
from app.db import engine, init_db
from app.delivery import onestate
from app.providers import get_provider

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("titan")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    log.info("ONESTATE API: %s", "ulangan" if onestate.is_configured() else "SOZLANMAGAN (buyurtmalar navbatda)")
    log.info("To'lov provayderi: %s", get_provider().name)
    yield


app = FastAPI(title="TITAN DONAT", lifespan=lifespan)
app.include_router(user.router)
app.include_router(admin.router)
app.include_router(webhook.router)


@app.get("/health")
async def health():
    async with engine.connect() as c:
        await c.execute(text("SELECT 1"))
    return {"status": "ok", "onestate_api": onestate.is_configured(),
            "payment_provider": get_provider().name}


# React build (3-4 qismda) shu papkaga tushadi
dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if dist.exists():
    app.mount("/", StaticFiles(directory=dist, html=True), name="web")
