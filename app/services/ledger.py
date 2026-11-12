from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import AuditLog, LedgerEntry, Order, Payment, Product, User


class LedgerError(Exception):
    pass


async def audit(s: AsyncSession, actor: int, action: str, details: str = ""):
    s.add(AuditLog(actor_id=actor, action=action, details=details))


async def get_or_create_user(s: AsyncSession, tg: dict) -> User:
    u = await s.get(User, tg["id"])
    if not u:
        u = User(id=tg["id"], username=tg.get("username"), first_name=tg.get("first_name"))
        s.add(u)
        await s.flush()
    return u


async def _apply(s: AsyncSession, user_id: int, amount: int, kind: str,
                 ref_type: str, ref_id: str, note: str = "") -> int:
    """Atomar balans o'zgarishi. Bir xil (kind, ref) ikkinchi marta o'tmaydi.
    Chaqiruvchi transaksiyani commit qiladi."""
    dup = await s.execute(select(LedgerEntry.id).where(
        LedgerEntry.kind == kind, LedgerEntry.ref_type == ref_type, LedgerEntry.ref_id == ref_id))
    if dup.first():
        raise LedgerError("duplicate")
    # Qatorni qulflaymiz (PostgreSQL: FOR UPDATE)
    user = (await s.execute(select(User).where(User.id == user_id).with_for_update())).scalar_one_or_none()
    if not user:
        raise LedgerError("user topilmadi")
    new_bal = user.balance + amount
    if new_bal < 0:
        raise LedgerError("mablag' yetarli emas")
    user.balance = new_bal
    s.add(LedgerEntry(user_id=user_id, amount=amount, balance_after=new_bal, kind=kind,
                      ref_type=ref_type, ref_id=ref_id, note=note))
    try:
        await s.flush()
    except IntegrityError:
        raise LedgerError("duplicate")
    return new_bal


async def create_payment(s: AsyncSession, user_id: int, amount: int, provider: str) -> Payment:
    if amount < 1000:
        raise LedgerError("Minimal summa 1000 UZS")
    p = Payment(user_id=user_id, expected_amount=amount, provider=provider,
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.PAYMENT_TTL_MINUTES))
    s.add(p)
    await s.flush()
    return p


async def handle_provider_confirmation(s: AsyncSession, payment_id: str, provider_tx_id: str,
                                       paid_amount: int, expected_provider: str | None = None) -> str:
    """Provayder tasdiqlagan to'lovni qayta ishlaydi.
    Aniq mos summa => avtomatik balansga. 1 UZS farq bo'lsa ham => 'mismatch' (qo'lda tekshiruv)."""
    if not isinstance(provider_tx_id, str) or not provider_tx_id.strip() or len(provider_tx_id.strip()) > 128:
        return "invalid_event"
    provider_tx_id = provider_tx_id.strip()
    if (isinstance(paid_amount, bool) or not isinstance(paid_amount, int)
            or paid_amount <= 0 or paid_amount > 9_223_372_036_854_775_807):
        return "invalid_amount"

    p = (await s.execute(select(Payment).where(Payment.id == payment_id).with_for_update())).scalar_one_or_none()
    if not p:
        return "not_found"
    if expected_provider is not None and p.provider != expected_provider:
        return "provider_mismatch"
    # Bir tranzaksiya ikki marta hisoblanmasin
    used = await s.execute(select(Payment.id).where(Payment.provider_tx_id == provider_tx_id))
    owner = used.scalar_one_or_none()
    if owner and owner != p.id:
        return "tx_already_used"
    if p.status != "created":
        return "already_processed"
    p.provider_tx_id = provider_tx_id
    p.paid_amount = paid_amount
    if paid_amount == p.expected_amount:
        await _apply(s, p.user_id, paid_amount, "topup", "payment", p.id)
        p.status = "credited"
        return "credited"
    p.status = "mismatch"  # avtomatik yozilmaydi, admin tekshiradi
    return "mismatch"


async def admin_credit_mismatch(s: AsyncSession, admin_id: int, payment_id: str) -> str:
    """Admin tasdiqlagan noto'g'ri to'lov summasi ichki balansga qo'shiladi."""
    p = (await s.execute(select(Payment).where(Payment.id == payment_id).with_for_update())).scalar_one_or_none()
    if (not p or p.status not in ("mismatch", "review")
            or isinstance(p.paid_amount, bool) or not isinstance(p.paid_amount, int)
            or p.paid_amount <= 0):
        raise LedgerError("To'lov tekshiruv holatida emas yoki summa noto'g'ri")
    await _apply(s, p.user_id, p.paid_amount, "mismatch_credit", "payment", p.id, "admin tasdiqladi")
    p.status = "mismatch_credited"
    await audit(s, admin_id, "mismatch_credit", f"{p.id}:{p.paid_amount}")
    return p.status


async def admin_reject_payment(s: AsyncSession, admin_id: int, payment_id: str):
    p = (await s.execute(select(Payment).where(Payment.id == payment_id).with_for_update())).scalar_one_or_none()
    if not p or p.status not in ("mismatch", "review"):
        raise LedgerError("To'lov tekshiruv holatida emas")
    p.status = "rejected"
    await audit(s, admin_id, "payment_reject", p.id)


async def admin_adjust(s: AsyncSession, admin_id: int, user_id: int, amount: int, note: str) -> int:
    ref = f"{admin_id}-{datetime.now(timezone.utc).timestamp()}"
    bal = await _apply(s, user_id, amount, "adjust", "admin", ref, note)
    await audit(s, admin_id, "balance_adjust", f"user={user_id} amount={amount} {note}")
    return bal


async def purchase(s: AsyncSession, user_id: int, product_id: int, game_nick: str,
                   *, client_id: str = "", privacy_id: str = "",
                   character_name: str | None = None, server: str = "") -> Order:
    """Balansdan yechib, buyurtmani 'queued' holatda yaratadi (bitta transaksiyada)."""
    prod = await s.get(Product, product_id)
    if not prod or not prod.in_stock:
        raise LedgerError("Mahsulot mavjud emas")
    nick = game_nick.strip()
    if not (2 <= len(nick) <= 64):
        raise LedgerError("O'yin nikini to'g'ri kiriting")
    order = Order(user_id=user_id, product_id=prod.id, product_name=prod.name,
                  price=prod.price, game_nick=nick, status="queued",
                  client_id=client_id.strip() or None, privacy_id=privacy_id.strip() or None,
                  character_name=(character_name or nick).strip(), server_name=server.strip() or None)
    s.add(order)
    await s.flush()
    await _apply(s, user_id, -prod.price, "purchase", "order", order.id)
    return order


async def refund_order(s: AsyncSession, actor_id: int, order_id: str, reason: str = "",
                       allow_processing: bool = False) -> str:
    """Refund faqat navbatdagi buyurtmaga; worker tasdiqlangan yakuniy xatoda processing'ni refund qilishi mumkin."""
    o = (await s.execute(select(Order).where(Order.id == order_id).with_for_update())).scalar_one_or_none()
    allowed = {"queued"}
    if allow_processing:
        allowed.add("processing")
    if not o or o.status not in allowed:
        raise LedgerError("Faqat xavfsiz holatdagi buyurtmaga pul qaytariladi")
    await _apply(s, o.user_id, o.price, "refund", "order", o.id, reason)
    o.status = "error"
    o.delivery_result = f"Qaytarildi: {reason}"
    await audit(s, actor_id, "order_refund", o.id)
    return o.id


async def admin_requeue_order(s: AsyncSession, admin_id: int, order_id: str) -> str:
    """Refund qilingan error buyurtmani qayta navbatga olishdan oldin narxni yana yechadi."""
    o = (await s.execute(select(Order).where(Order.id == order_id).with_for_update())).scalar_one_or_none()
    if not o or o.status != "error":
        raise LedgerError("Faqat xato holatidagi buyurtma qayta navbatga olinadi")

    refunded = await s.execute(select(LedgerEntry.id).where(
        LedgerEntry.kind == "refund",
        LedgerEntry.ref_type == "order",
        LedgerEntry.ref_id == o.id,
    ))
    if not refunded.first():
        raise LedgerError("Refund yozuvi topilmadi; buyurtmani qayta navbatga olib bo'lmaydi")

    await _apply(s, o.user_id, -o.price, "requeue_debit", "order", o.id,
                 "Qayta navbatga olish uchun qayta yechildi")
    o.status = "queued"
    o.attempts = 0
    o.delivery_result = "Qayta navbatga olindi; summa balansdan qayta yechildi"
    await audit(s, admin_id, "order_requeue", o.id)
    return o.id
