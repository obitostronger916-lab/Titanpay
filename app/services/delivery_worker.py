import asyncio
import logging

from sqlalchemy import select

from app.db import SessionLocal
from app.delivery import onestate
from app.delivery.base import DeliveryNotConfigured, DeliveryRetryable, DeliveryUncertain
from app.models import Order, Product
from app.services.ledger import refund_order

log = logging.getLogger("delivery")
MAX_ATTEMPTS = 5


async def process_queue() -> list[tuple[int, str, str]]:
    """Navbatdagi buyurtmalarni yuboradi. Qaytaradi: [(user_id, order_id, 'delivered'|'error')]"""
    notes = []
    if not onestate.is_configured():
        return notes  # API yo'q => buyurtmalar navbatda turadi
    async with SessionLocal() as s:
        ids = (await s.execute(select(Order.id).where(Order.status == "queued").limit(20))).scalars().all()
    for oid in ids:
        async with SessionLocal() as s:
            o = (await s.execute(select(Order).where(Order.id == oid).with_for_update(skip_locked=True))).scalar_one_or_none()
            if not o or o.status != "queued":
                continue
            o.status = "processing"
            o.attempts += 1
            await s.commit()
            prod = await s.get(Product, o.product_id)
            try:
                res = await onestate.deliver(o.id, o.game_nick, prod.delivery_payload if prod else None)
            except DeliveryNotConfigured:
                o.status = "queued"
                await s.commit()
                return notes
            except DeliveryUncertain as e:
                # Tashqi servis buyurtmani qabul qilgan bo'lishi mumkin.
                # Holatni processing'da ushlab, avtomatik retry/refundni to'xtatamiz.
                o.delivery_result = f"Natija noaniq; admin tekshiruvi kerak: {e}"
                await s.commit()
                continue
            except DeliveryRetryable as e:
                o.delivery_result = f"Qayta uriniladi: {e}"
                if o.attempts >= MAX_ATTEMPTS:
                    await refund_order(s, 0, o.id, "Yetkazib bo'lmadi", allow_processing=True)
                    notes.append((o.user_id, o.id, "error"))
                else:
                    o.status = "queued"
                await s.commit()
                continue
            o.delivery_result = res.message
            if res.ok:
                o.status = "delivered"
                notes.append((o.user_id, o.id, "delivered"))
            else:
                await refund_order(s, 0, o.id, res.message, allow_processing=True)
                notes.append((o.user_id, o.id, "error"))
            await s.commit()
    return notes


async def loop(notify=None, interval: int = 30):
    while True:
        try:
            for item in await process_queue():
                if notify:
                    await notify(*item)
        except Exception:
            log.exception("delivery loop xatosi")
        await asyncio.sleep(interval)
