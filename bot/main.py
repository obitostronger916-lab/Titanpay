import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import (InlineKeyboardButton, InlineKeyboardMarkup,
                           Message, WebAppInfo)
from sqlalchemy import func, select

from app.config import settings
from app.db import SessionLocal, init_db
from app.models import (LedgerEntry, Order, Payment, Ticket, TicketMessage)
from app.services import ledger
from app.services.delivery_worker import loop as delivery_loop

log = logging.getLogger("bot")

dp = Dispatcher()
STATUS_UZ = {"pending": "Kutilmoqda", "paid": "To'lov tasdiqlandi", "queued": "Navbatda",
             "processing": "Jarayonda", "delivered": "Yetkazildi", "error": "Xatolik"}


def app_kb() -> InlineKeyboardMarkup | None:
    if not settings.WEBAPP_URL.startswith("https://"):
        return None
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🛒 TITAN DONAT", web_app=WebAppInfo(url=settings.WEBAPP_URL))]])


def tg_dict(m: Message) -> dict:
    u = m.from_user
    return {"id": u.id, "username": u.username, "first_name": u.first_name}


@dp.message(CommandStart())
async def start(m: Message):
    async with SessionLocal() as s:
        u = await ledger.get_or_create_user(s, tg_dict(m))
        await s.commit()
    if u.is_banned:
        return await m.answer("Siz bloklangansiz.")
    await m.answer(
        "👑 TITAN DONAT — ONESTATE RP\n\n"
        "Balansni to'ldiring, donat xarid qiling va buyurtmalarni kuzating.\n\n"
        "/balance — balans\n/orders — buyurtmalar\n/support matn — support bilan bog'lanish",
        reply_markup=app_kb())


@dp.message(Command("balance"))
async def balance(m: Message):
    async with SessionLocal() as s:
        u = await ledger.get_or_create_user(s, tg_dict(m))
        await s.commit()
    await m.answer(f"💰 Balansingiz: {u.balance:,} UZS".replace(",", " "), reply_markup=app_kb())


@dp.message(Command("orders"))
async def orders(m: Message):
    async with SessionLocal() as s:
        rows = (await s.execute(select(Order).where(Order.user_id == m.from_user.id)
                                .order_by(Order.created_at.desc()).limit(10))).scalars().all()
    if not rows:
        return await m.answer("Buyurtmalar yo'q.")
    await m.answer("\n".join(
        f"#{o.id} — {o.product_name} — {STATUS_UZ.get(o.status, o.status)}" for o in rows))


@dp.message(Command("support"))
async def support(m: Message, command: CommandObject, bot: Bot):
    text = (command.args or "").strip()
    if len(text) < 3:
        return await m.answer("Yozing: /support muammo matni\n"
                              "To'lov yoki buyurtma ID bilan: /support PAYMENT_ID matn")
    payment_id = order_id = None
    first, _, rest = text.partition(" ")
    async with SessionLocal() as s:
        await ledger.get_or_create_user(s, tg_dict(m))
        if rest:
            p = await s.get(Payment, first.upper())
            if p and p.user_id == m.from_user.id:
                payment_id, text = p.id, rest
            else:
                o = await s.get(Order, first.upper())
                if o and o.user_id == m.from_user.id:
                    order_id, text = o.id, rest
        t = Ticket(user_id=m.from_user.id, payment_id=payment_id, order_id=order_id)
        s.add(t)
        await s.flush()
        s.add(TicketMessage(ticket_id=t.id, from_admin=False, text=text))
        await s.commit()
    await m.answer(f"✅ Murojaat qabul qilindi. ID: {t.id}")
    if settings.ADMIN_ID:
        try:
            await bot.send_message(settings.ADMIN_ID,
                                   f"🆘 Yangi murojaat {t.id}\nUser: {m.from_user.id}\n"
                                   f"To'lov: {payment_id or '-'} | Buyurtma: {order_id or '-'}\n\n{text}\n\n"
                                   f"Javob: /reply {t.id} matn")
        except Exception:
            log.exception("adminga yuborilmadi")


@dp.message(Command("reply"))
async def admin_reply(m: Message, command: CommandObject):
    if not settings.ADMIN_ID or m.from_user.id != settings.ADMIN_ID:
        return  # oddiy foydalanuvchiga hech narsa javob bermaymiz
    tid, _, text = (command.args or "").partition(" ")
    if not tid or not text.strip():
        return await m.answer("Format: /reply TICKET_ID matn")
    async with SessionLocal() as s:
        t = await s.get(Ticket, tid.upper())
        if not t:
            return await m.answer("Murojaat topilmadi.")
        s.add(TicketMessage(ticket_id=t.id, from_admin=True, text=text.strip()))
        t.status = "answered"
        await ledger.audit(s, m.from_user.id, "ticket_reply", t.id)
        await s.commit()
    await m.answer("✅ Javob yuborildi.")


async def safe_send(bot: Bot, chat_id: int, text: str):
    try:
        await bot.send_message(chat_id, text)
    except Exception:
        log.warning("xabar yuborilmadi: %s", chat_id)


async def notify_loop(bot: Bot):
    """Yangi balans yozuvlari, noto'g'ri to'lovlar va admin javoblari haqida xabar beradi."""
    async with SessionLocal() as s:
        last_ledger = (await s.execute(select(func.coalesce(func.max(LedgerEntry.id), 0)))).scalar()
        last_msg = (await s.execute(select(func.coalesce(func.max(TicketMessage.id), 0)))).scalar()
        seen_mismatch = set((await s.execute(
            select(Payment.id).where(Payment.status == "mismatch"))).scalars().all())
    while True:
        try:
            async with SessionLocal() as s:
                entries = (await s.execute(select(LedgerEntry).where(LedgerEntry.id > last_ledger)
                                           .order_by(LedgerEntry.id))).scalars().all()
                msgs = (await s.execute(select(TicketMessage).where(
                    TicketMessage.id > last_msg, TicketMessage.from_admin.is_(True))
                    .order_by(TicketMessage.id))).scalars().all()
                last_msg_all = (await s.execute(select(func.coalesce(func.max(TicketMessage.id), 0)))).scalar()
                mism = (await s.execute(select(Payment).where(Payment.status == "mismatch"))).scalars().all()
                tickets = {t.id: t.user_id for t in (await s.execute(
                    select(Ticket).where(Ticket.id.in_([x.ticket_id for x in msgs])))).scalars().all()} if msgs else {}
            for e in entries:
                last_ledger = e.id
                amt = f"{abs(e.amount):,}".replace(",", " ")
                if e.kind in ("topup", "mismatch_credit"):
                    await safe_send(bot, e.user_id, f"✅ To'lov tasdiqlandi. Balansga +{amt} UZS qo'shildi.")
                elif e.kind == "refund":
                    await safe_send(bot, e.user_id, f"↩️ Buyurtma uchun {amt} UZS balansga qaytarildi.")
            for p in mism:
                if p.id in seen_mismatch:
                    continue
                seen_mismatch.add(p.id)
                await safe_send(bot, p.user_id,
                                f"⚠️ To'lov {p.id}: summa mos kelmadi. Support tekshiradi. "
                                f"Murojaat: /support {p.id} matn")
                if settings.ADMIN_ID:
                    await safe_send(bot, settings.ADMIN_ID,
                                    f"⚠️ Noto'g'ri to'lov {p.id}: kutilgan {p.expected_amount}, "
                                    f"to'langan {p.paid_amount}. Admin panelda tekshiring.")
            for mm in msgs:
                uid = tickets.get(mm.ticket_id)
                if uid:
                    await safe_send(bot, uid, f"💬 Support javobi ({mm.ticket_id}):\n{mm.text}")
            last_msg = last_msg_all
        except Exception:
            log.exception("notify loop xatosi")
        await asyncio.sleep(10)


async def run_bot():
    """Botni ishga tushiradi. Web servis ichidan ham, alohida ham chaqirish mumkin."""
    if not settings.BOT_TOKEN:
        log.error("BOT_TOKEN sozlanmagan, bot ishga tushmadi")
        return
    bot = Bot(settings.BOT_TOKEN)

    async def on_delivery(user_id: int, order_id: str, status: str):
        if status == "delivered":
            await safe_send(bot, user_id, f"🎉 Buyurtma #{order_id} yetkazildi!")
        else:
            await safe_send(bot, user_id, f"❌ Buyurtma #{order_id} bajarilmadi. Pul balansga qaytariladi.")

    tasks = [asyncio.create_task(delivery_loop(on_delivery)),
             asyncio.create_task(notify_loop(bot))]
    try:
        await bot.delete_webhook(drop_pending_updates=True)
        log.info("Bot ishga tushdi")
        await dp.start_polling(bot, handle_signals=False)
    finally:
        for t in tasks:
            t.cancel()


async def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    await init_db()
    await run_bot()


if __name__ == "__main__":
    asyncio.run(main())
