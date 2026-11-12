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


async def test_invalid_payment_events_are_rejected_without_changing_payment(session):
    u = await mk_user(session)
    p = await ledger.create_payment(session, 1, 50000, "test")

    for amount in (0, -1, True, "50000"):
        assert await ledger.handle_provider_confirmation(session, p.id, "TX1", amount) == "invalid_amount"
    for tx_id in ("", "   ", "X" * 129):
        assert await ledger.handle_provider_confirmation(session, p.id, tx_id, 50000) == "invalid_event"

    await session.refresh(p)
    assert p.status == "created"
    assert p.provider_tx_id is None
    assert u.balance == 0


async def test_payment_must_match_active_provider(session):
    u = await mk_user(session)
    p = await ledger.create_payment(session, 1, 50000, "provider_a")

    result = await ledger.handle_provider_confirmation(
        session, p.id, "TX1", 50000, expected_provider="provider_b")

    assert result == "provider_mismatch"
    await session.refresh(p)
    assert p.status == "created"
    assert p.provider_tx_id is None
    assert u.balance == 0


async def test_admin_cannot_credit_non_positive_mismatch(session):
    u = await mk_user(session)
    p = await ledger.create_payment(session, 1, 50000, "test")
    p.status = "mismatch"
    p.paid_amount = -100
    await session.flush()

    with pytest.raises(ledger.LedgerError):
        await ledger.admin_credit_mismatch(session, 111, p.id)
    assert u.balance == 0


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


async def test_admin_cannot_refund_processing_order(session):
    u = await mk_user(session, balance=10000)
    prod = await mk_product(session)
    o = await ledger.purchase(session, 1, prod.id, "Nick_Name")
    o.status = "processing"
    await session.commit()

    with pytest.raises(ledger.LedgerError):
        await ledger.refund_order(session, 111, o.id, "admin")
    await session.rollback()
    await session.refresh(u)
    assert u.balance == 4000


async def test_worker_can_refund_confirmed_processing_failure(session):
    u = await mk_user(session, balance=10000)
    prod = await mk_product(session)
    o = await ledger.purchase(session, 1, prod.id, "Nick_Name")
    o.status = "processing"
    await session.commit()

    await ledger.refund_order(session, 0, o.id, "provider rejected", allow_processing=True)
    await session.commit()
    await session.refresh(u)
    assert u.balance == 10000
    assert o.status == "error"


async def test_requeue_requires_refund_and_charges_again(session):
    u = await mk_user(session, balance=10000)
    prod = await mk_product(session)
    o = await ledger.purchase(session, 1, prod.id, "Nick_Name")
    await session.commit()
    await ledger.refund_order(session, 111, o.id, "temporary failure")
    await session.commit()
    await session.refresh(u)
    assert u.balance == 10000

    await ledger.admin_requeue_order(session, 111, o.id)
    await session.commit()
    await session.refresh(u)
    assert u.balance == 4000
    assert o.status == "queued"
    assert o.attempts == 0

    with pytest.raises(ledger.LedgerError):
        await ledger.admin_requeue_order(session, 111, o.id)


async def test_requeue_without_refund_is_rejected(session):
    await mk_user(session, balance=10000)
    prod = await mk_product(session)
    o = await ledger.purchase(session, 1, prod.id, "Nick_Name")
    o.status = "error"
    await session.commit()

    with pytest.raises(ledger.LedgerError):
        await ledger.admin_requeue_order(session, 111, o.id)
