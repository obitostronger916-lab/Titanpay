from app.db import SessionLocal
from app.delivery import onestate
from app.delivery.base import DeliveryResult, DeliveryRetryable, DeliveryUncertain
from app.models import Order, Product, User
from app.services import ledger
from app.services.delivery_worker import process_queue


async def make_order() -> str:
    async with SessionLocal() as s:
        s.add(User(id=1, balance=10000))
        s.add(Product(name="Test", price=6000, delivery_payload="x"))
        await s.flush()
        o = await ledger.purchase(s, 1, 1, "Nick_A")
        await s.commit()
        return o.id


async def state(oid: str):
    async with SessionLocal() as s:
        o = await s.get(Order, oid)
        u = await s.get(User, 1)
        return o.status, u.balance, o.attempts


async def test_order_stays_queued_when_api_not_configured():
    oid = await make_order()
    assert await process_queue() == []
    assert await state(oid) == ("queued", 4000, 0)  # hech qachon asossiz "delivered" bo'lmaydi


async def test_successful_delivery(monkeypatch):
    oid = await make_order()

    async def fake(order_id, nick, payload):
        return DeliveryResult(True, "ok")

    monkeypatch.setattr(onestate, "is_configured", lambda: True)
    monkeypatch.setattr(onestate, "deliver", fake)
    assert await process_queue() == [(1, oid, "delivered")]
    assert await state(oid) == ("delivered", 4000, 1)
    assert await process_queue() == []  # qayta yuborilmaydi


async def test_failed_delivery_refunds(monkeypatch):
    oid = await make_order()

    async def fake(order_id, nick, payload):
        return DeliveryResult(False, "rad etildi")

    monkeypatch.setattr(onestate, "is_configured", lambda: True)
    monkeypatch.setattr(onestate, "deliver", fake)
    assert await process_queue() == [(1, oid, "error")]
    assert await state(oid) == ("error", 10000, 1)


async def test_temporary_error_keeps_order_queued(monkeypatch):
    oid = await make_order()

    async def fake(order_id, nick, payload):
        raise DeliveryRetryable("timeout")

    monkeypatch.setattr(onestate, "is_configured", lambda: True)
    monkeypatch.setattr(onestate, "deliver", fake)
    assert await process_queue() == []
    assert await state(oid) == ("queued", 4000, 1)


async def test_uncertain_delivery_is_held_for_manual_review(monkeypatch):
    oid = await make_order()

    async def fake(order_id, nick, payload):
        raise DeliveryUncertain("timeout after request was sent")

    monkeypatch.setattr(onestate, "is_configured", lambda: True)
    monkeypatch.setattr(onestate, "deliver", fake)
    assert await process_queue() == []
    assert await state(oid) == ("processing", 4000, 1)

    # Processing holati navbatga qaytmaydi, shuning uchun avtomatik dublikat so'rov bo'lmaydi.
    assert await process_queue() == []
    assert await state(oid) == ("processing", 4000, 1)
