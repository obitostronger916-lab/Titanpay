from app.db import SessionLocal
from app.delivery import onestate
from app.delivery.base import DeliveryResult, DeliveryRetryable
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


async def test_ambiguous_error_moves_order_to_review_without_retry(monkeypatch):
    oid = await make_order()
    calls = 0

    async def fake(order_id, nick, payload):
        nonlocal calls
        calls += 1
        raise DeliveryRetryable("timeout")

    monkeypatch.setattr(onestate, "is_configured", lambda: True)
    monkeypatch.setattr(onestate, "deliver", fake)
    assert await process_queue() == [(1, oid, "review")]
    assert await state(oid) == ("review", 4000, 1)
    assert await process_queue() == []
    assert calls == 1


async def test_admin_can_resolve_review_after_manual_check():
    oid = await make_order()
    async with SessionLocal() as s:
        order = await s.get(Order, oid)
        order.status = "review"
        await s.commit()
        await ledger.resolve_order_review(s, 99, oid, "refund", "Serverda donat yo'qligi tekshirildi")
        await s.commit()
    assert await state(oid) == ("error", 10000, 0)


async def test_admin_can_mark_review_delivered_after_manual_check():
    oid = await make_order()
    async with SessionLocal() as s:
        order = await s.get(Order, oid)
        order.status = "review"
        await s.commit()
        await ledger.resolve_order_review(s, 99, oid, "delivered", "Serverda donat borligi tekshirildi")
        await s.commit()
    assert await state(oid) == ("delivered", 4000, 0)
