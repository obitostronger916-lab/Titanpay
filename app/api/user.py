from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_session
from app.models import Banner, LedgerEntry, Order, Payment, Product, Ticket, TicketMessage
from app.providers import get_provider
from app.providers.base import ProviderNotConfigured
from app.security import current_user
from app.services import ledger
from datetime import datetime, timezone
from typing import Literal

router = APIRouter(prefix="/api")


async def me(tg: dict = Depends(current_user), s: AsyncSession = Depends(get_session)):
    u = await ledger.get_or_create_user(s, tg)
    await s.commit()
    if u.is_banned:
        raise HTTPException(403, "Bloklangan")
    return u


@router.get("/me")
async def get_me(u=Depends(me)):
    return {"id": u.id, "name": u.first_name, "balance": u.balance,
            "is_admin": bool(settings.ADMIN_ID and u.id == settings.ADMIN_ID)}


@router.get("/products")
async def products(s: AsyncSession = Depends(get_session), u=Depends(me)):
    rows = (await s.execute(select(Product).where(Product.in_stock.is_(True)))).scalars().all()
    return [{"id": p.id, "name": p.name, "description": p.description, "price": p.price,
             "image_url": p.image_url, "category": p.category} for p in rows]


@router.get("/banners")
async def active_banners(s: AsyncSession = Depends(get_session), u=Depends(me)):
    rows = (await s.execute(
        select(Banner).where(Banner.enabled.is_(True)).order_by(Banner.id.desc())
    )).scalars().all()
    return [{"id": b.id, "title": b.title, "text": b.text,
             "image_url": b.image_url, "target_url": b.target_url}
            for b in rows]


class BuyIn(BaseModel):
    product_id: int
    client_id: str = Field(min_length=1, max_length=64)
    privacy_id: str = Field(min_length=1, max_length=128)
    character_name: str = Field(min_length=2, max_length=64)
    server: Literal["LOMITA CIS", "HILLS CIS", "LYNWOOD CIS", "BELL CIS", "COVINA CIS", "GLENDALE CIS"]


@router.post("/orders")
async def buy(body: BuyIn, s: AsyncSession = Depends(get_session), u=Depends(me)):
    try:
        o = await ledger.purchase(
            s, u.id, body.product_id, body.character_name,
            client_id=body.client_id, privacy_id=body.privacy_id,
            character_name=body.character_name, server=body.server,
        )
        await s.commit()
    except ledger.LedgerError as e:
        await s.rollback()
        raise HTTPException(400, str(e))
    return {"id": o.id, "status": o.status}


@router.get("/orders")
async def my_orders(s: AsyncSession = Depends(get_session), u=Depends(me)):
    rows = (await s.execute(select(Order).where(Order.user_id == u.id)
                            .order_by(Order.created_at.desc()).limit(50))).scalars().all()
    return [{"id": o.id, "product": o.product_name, "price": o.price, "status": o.status,
             "created_at": o.created_at.isoformat(), "result": o.delivery_result} for o in rows]


@router.get("/ledger")
async def my_ledger(s: AsyncSession = Depends(get_session), u=Depends(me)):
    rows = (await s.execute(select(LedgerEntry).where(LedgerEntry.user_id == u.id)
                            .order_by(LedgerEntry.id.desc()).limit(100))).scalars().all()
    return [{"amount": r.amount, "balance_after": r.balance_after, "kind": r.kind,
             "created_at": r.created_at.isoformat()} for r in rows]


class TopupIn(BaseModel):
    amount: int = Field(ge=1000, le=50_000_000)


@router.post("/payments")
async def create_topup(body: TopupIn, s: AsyncSession = Depends(get_session), u=Depends(me)):
    provider = get_provider()
    p = await ledger.create_payment(s, u.id, body.amount, provider.name)
    try:
        info = await provider.create_invoice(p.id, p.expected_amount)
    except ProviderNotConfigured as e:
        await s.rollback()
        raise HTTPException(503, str(e))
    await s.commit()
    return {"payment_id": p.id, "amount": info.amount, "pay_url": info.pay_url,
            "card_info": info.card_info, "expires_at": p.expires_at.isoformat()}


@router.get("/payments")
async def my_payments(s: AsyncSession = Depends(get_session), u=Depends(me)):
    rows = (await s.execute(select(Payment).where(Payment.user_id == u.id)
                            .order_by(Payment.created_at.desc()).limit(50))).scalars().all()
    return [{"id": p.id, "expected": p.expected_amount, "paid": p.paid_amount,
             "status": p.status, "created_at": p.created_at.isoformat(),
             "can_report": datetime.now(timezone.utc) <= p.expires_at.replace(tzinfo=p.expires_at.tzinfo or timezone.utc)}
            for p in rows]


class TicketIn(BaseModel):
    text: str = Field(min_length=3, max_length=2000)
    payment_id: str | None = None
    order_id: str | None = None


@router.post("/tickets")
async def new_ticket(body: TicketIn, s: AsyncSession = Depends(get_session), u=Depends(me)):
    if body.payment_id:
        p = await s.get(Payment, body.payment_id)
        if not p or p.user_id != u.id:
            raise HTTPException(404, "To'lov topilmadi")
    if body.order_id:
        o = await s.get(Order, body.order_id)
        if not o or o.user_id != u.id:
            raise HTTPException(404, "Buyurtma topilmadi")
    t = Ticket(user_id=u.id, payment_id=body.payment_id, order_id=body.order_id)
    s.add(t)
    await s.flush()
    s.add(TicketMessage(ticket_id=t.id, from_admin=False, text=body.text))
    await s.commit()
    return {"ticket_id": t.id}


@router.get("/tickets")
async def my_tickets(s: AsyncSession = Depends(get_session), u=Depends(me)):
    ts = (await s.execute(select(Ticket).where(Ticket.user_id == u.id)
                          .order_by(Ticket.created_at.desc()).limit(30))).scalars().all()
    out = []
    for t in ts:
        ms = (await s.execute(select(TicketMessage).where(TicketMessage.ticket_id == t.id)
                              .order_by(TicketMessage.id))).scalars().all()
        out.append({"id": t.id, "status": t.status,
                    "messages": [{"admin": m.from_admin, "text": m.text} for m in ms]})
    return out


class ReplyIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


@router.post("/tickets/{ticket_id}/messages")
async def user_reply(ticket_id: str, body: ReplyIn, s: AsyncSession = Depends(get_session), u=Depends(me)):
    t = await s.get(Ticket, ticket_id)
    if not t or t.user_id != u.id:
        raise HTTPException(404, "Murojaat topilmadi")
    s.add(TicketMessage(ticket_id=t.id, from_admin=False, text=body.text))
    t.status = "open"
    await s.commit()
    return {"ok": True}
