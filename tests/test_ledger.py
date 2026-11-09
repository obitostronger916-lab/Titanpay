import pytest

from app.models import Order, Product, User
from app.services import ledger


async def mk_user(s, uid=1, balance=0):
    u = User(id=uid, balance=balance)
    s.add(u)
    await s.flush()
    return u


async def mk_product(s, price=6000):
    p = Product(name="Test donat", price=price, delivery_payload="x")
    s.add(p)
    await s.flush()
    return p


async def test_exact_payment_is_credited(session):
    u = await mk_user(session)
    p = await ledger.create_payment(session, 1, 50000, "test")
    assert await ledger.handle_provider_confirmation(session, p.id, "TX1", 50000) == "credited"
    assert u.balance == 50000


async def test_one_uzs_difference_is_not_auto_credited(session):
    u = await mk_user(session)
    p = await ledger.create_payment(session, 1, 50000, "test")
    assert await ledger.handle_provider_confirmation(session, p.id, "TX1", 50001) == "mismatch"
    assert u.balance == 0
    # admin tasdiqlagandan keyin to'langan summa balansga yoziladi
    await ledger.admin_credit_mismatch(session, 111, p.id)
    assert u.balance == 50001
    # ikkinchi marta yozib bo'lmaydi
    with pytest.raises(ledger.LedgerError):
        await ledger.admin_credit_mismatch(session, 111, p.id)
    assert u.balance == 50001


async def test_same_payment_not_counted_twice(session):
    u = await mk_user(session)
    p = await ledger.create_payment(session, 1, 50000, "test")
    await ledger.handle_provider_confirmation(session, p.id, "TX1", 50000)
    assert await ledger.handle_provider_confirmation(session, p.id, "TX1", 50000) == "already_processed"
    assert u.balance == 50000


async def test_same_provider_tx_cannot_credit_two_payments(session):
    u = await mk_user(session)
    p1 = await ledger.create_payment(session, 1, 50000, "test")
    p2 = await ledger.create_payment(session, 1, 50000, "test")
    await ledger.handle_provider_confirmation(session, p1.id, "TX1", 50000)
    assert await ledger.handle_provider_confirmation(session, p2.id, "TX1", 50000) == "tx_already_used"
    assert u.balance == 50000


async def test_ledger_reference_is_idempotent(session):
    u = await mk_user(session)
    await ledger._apply(session, 1, 100, "adjust", "admin", "REF1")
    with pytest.raises(ledger.LedgerError):
        await ledger._apply(session, 1, 100, "adjust", "admin", "REF1")
    assert u.balance == 100


async def test_purchase_deducts_and_blocks_overspend(session):
    u = await mk_user(session, balance=10000)
    prod = await mk_product(session, 6000)
    o = await ledger.purchase(session, 1, prod.id, "Nick_Name")
    await session.commit()
    assert u.balance == 4000 and o.status == "queued"
    with pytest.raises(ledger.LedgerError):
        await ledger.purchase(session, 1, prod.id, "Nick_Name")
    await session.rollback()
    await session.refresh(u)
    assert u.balance == 4000


async def test_refund_only_once_and_not_after_delivery(session):
    u = await mk_user(session, balance=10000)
    prod = await mk_product(session, 6000)
    o = await ledger.purchase(session, 1, prod.id, "Nick_Name")
    await session.commit()
    await ledger.refund_order(session, 111, o.id, "test")
    assert u.balance == 10000
    with pytest.raises(ledger.LedgerError):
        await ledger.refund_order(session, 111, o.id, "test")
    assert u.balance == 10000

    o2 = await ledger.purchase(session, 1, prod.id, "Nick_Name")
    o2.status = "delivered"
    with pytest.raises(ledger.LedgerError):
        await ledger.refund_order(session, 111, o2.id, "test")
