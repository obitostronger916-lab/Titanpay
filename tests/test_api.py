import hashlib
import hmac

import httpx
import pytest_asyncio

from app.config import settings
from app.db import SessionLocal
from app.main import app
from app.models import Product, User
from tests.helpers import make_init_data


@pytest_asyncio.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


def h(uid: int) -> dict:
    return {"X-Init-Data": make_init_data(uid)}


async def seed(balance=10000, price=6000):
    async with SessionLocal() as s:
        s.add(User(id=555, balance=balance))
        s.add(Product(name="Test", price=price, delivery_payload="x"))
        await s.commit()


async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


async def test_no_init_data_is_401(client):
    assert (await client.get("/api/me")).status_code == 401


async def test_me_and_admin_flag(client):
    r = await client.get("/api/me", headers=h(555))
    assert r.status_code == 200 and r.json()["is_admin"] is False
    r = await client.get("/api/me", headers=h(111))
    assert r.json()["is_admin"] is True


async def test_admin_endpoints_protected(client):
    assert (await client.get("/api/admin/stats", headers=h(555))).status_code == 403
    assert (await client.get("/api/admin/stats")).status_code == 401
    assert (await client.get("/api/admin/stats", headers=h(111))).status_code == 200


async def test_purchase_and_isolation_between_users(client):
    await seed()
    r = await client.post("/api/orders", json={"product_id": 1, "client_id": "12345", "privacy_id": "67890", "character_name": "Nick_A", "server": "LOMITA CIS"}, headers=h(555))
    assert r.status_code == 200 and r.json()["status"] == "queued"
    assert (await client.get("/api/me", headers=h(555))).json()["balance"] == 4000
    # boshqa foydalanuvchi bu buyurtmani ko'rmaydi
    assert (await client.get("/api/orders", headers=h(666))).json() == []
    assert len((await client.get("/api/orders", headers=h(555))).json()) == 1


async def test_insufficient_balance_is_400(client):
    await seed(balance=1000)
    r = await client.post("/api/orders", json={"product_id": 1, "client_id": "12345", "privacy_id": "67890", "character_name": "Nick_A", "server": "LOMITA CIS"}, headers=h(555))
    assert r.status_code == 400
    assert (await client.get("/api/me", headers=h(555))).json()["balance"] == 1000


async def test_topup_returns_503_without_provider(client):
    r = await client.post("/api/payments", json={"amount": 50000}, headers=h(555))
    assert r.status_code == 503
    assert (await client.get("/api/payments", headers=h(555))).json() == []


async def test_cannot_attach_ticket_to_foreign_order(client):
    await seed()
    await client.post("/api/orders", json={"product_id": 1, "client_id": "12345", "privacy_id": "67890", "character_name": "Nick_A", "server": "LOMITA CIS"}, headers=h(555))
    orders = (await client.get("/api/orders", headers=h(555))).json()
    r = await client.post("/api/tickets", json={"text": "salom", "order_id": orders[0]["id"]}, headers=h(666))
    assert r.status_code == 404


async def test_webhook_requires_valid_signature(client):
    body = b'{"x":1}'
    assert (await client.post("/webhook/payment", content=body)).status_code == 401
    assert (await client.post("/webhook/payment", content=body, headers={"X-Signature": "bad"})).status_code == 401
    sig = hmac.new(settings.PAYMENT_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    # imzo to'g'ri, lekin provayder ulanmagan => hech narsa hisoblanmaydi
    r = await client.post("/webhook/payment", content=body, headers={"X-Signature": sig})
    assert r.status_code == 503
