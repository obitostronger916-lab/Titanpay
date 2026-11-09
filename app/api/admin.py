from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import (AuditLog, Order, Payment, Product, Ticket,
                        TicketMessage, User)
from app.security import admin_only
from app.services import ledger

router = APIRouter(prefix="/api/admin", dependencies=[Depends(admin_only)])


@router.get("/stats")
async def stats(s: AsyncSession = Depends(get_session)):
    users = (await s.execute(select(func.count(User.id)))).scalar()
    topups = (await s.execute(select(func.coalesce(func.sum(Payment.paid_amount), 0))
                              .where(Payment.status.in_(["credited", "mismatch_credited"])))).scalar()
    queued = (await s.execute(select(func.count(Order.id)).where(Order.status == "queued"))).scalar()
    delivered = (await s.execute(select(func.count(Order.id)).where(Order.status == "delivered"))).scalar()
    review = (await s.execute(select(func.count(Payment.id)).where(Payment.status.in_(["mismatch", "review"])))).scalar()
    open_t = (await s.execute(select(func.count(Ticket.id)).where(Ticket.status == "open"))).scalar()
    return {"users": users, "topups_total": topups, "orders_queued": queued,
            "orders_delivered": delivered, "payments_review": review, "tickets_open": open_t}


@router.get("/users")
async def users(s: AsyncSession = Depends(get_session)):
    rows = (await s.execute(select(User).order_by(User.created_at.desc()).limit(200))).scalars().all()
    return [{"id": u.id, "username": u.username, "balance": u.balance, "banned": u.is_banned} for u in rows]


@router.get("/payments")
async def payments(status: str | None = None, s: AsyncSession = Depends(get_session)):
    q = select(Payment).order_by(Payment.created_at.desc()).limit(200)
    if status:
        q = q.where(Payment.status == status)
    return [{"id": p.id, "user_id": p.user_id, "expected": p.expected_amount, "paid": p.paid_amount,
             "status": p.status, "tx": p.provider_tx_id} for p in (await s.execute(q)).scalars().all()]


@router.post("/payments/{pid}/credit")
async def credit(pid: str, admin=Depends(admin_only), s: AsyncSession = Depends(get_session)):
    try:
        await ledger.admin_credit_mismatch(s, admin["id"], pid)
        await s.commit()
    except ledger.LedgerError as e:
        await s.rollback()
        raise HTTPException(400, str(e))
    return {"ok": True}


@router.post("/payments/{pid}/reject")
async def reject(pid: str, admin=Depends(admin_only), s: AsyncSession = Depends(get_session)):
    try:
        await ledger.admin_reject_payment(s, admin["id"], pid)
        await s.commit()
    except ledger.LedgerError as e:
        await s.rollback()
        raise HTTPException(400, str(e))
    return {"ok": True}


class AdjustIn(BaseModel):
    user_id: int
    amount: int
    note: str = Field(min_length=3, max_length=200)


@router.post("/balance")
async def adjust(body: AdjustIn, admin=Depends(admin_only), s: AsyncSession = Depends(get_session)):
    try:
        bal = await ledger.admin_adjust(s, admin["id"], body.user_id, body.amount, body.note)
        await s.commit()
    except ledger.LedgerError as e:
        await s.rollback()
        raise HTTPException(400, str(e))
    return {"balance": bal}


class ProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    description: str = ""
    price: int = Field(gt=0)
    image_url: str | None = None
    category: str = "Umumiy"
    in_stock: bool = True
    delivery_payload: str | None = None


@router.get("/products")
async def all_products(s: AsyncSession = Depends(get_session)):
    rows = (await s.execute(select(Product).order_by(Product.id))).scalars().all()
    return [{**{c: getattr(p, c) for c in ProductIn.model_fields}, "id": p.id} for p in rows]


@router.post("/products")
async def add_product(body: ProductIn, admin=Depends(admin_only), s: AsyncSession = Depends(get_session)):
    p = Product(**body.model_dump())
    s.add(p)
    await ledger.audit(s, admin["id"], "product_add", body.name)
    await s.commit()
    return {"id": p.id}


@router.put("/products/{pid}")
async def edit_product(pid: int, body: ProductIn, admin=Depends(admin_only), s: AsyncSession = Depends(get_session)):
    p = await s.get(Product, pid)
    if not p:
        raise HTTPException(404, "Topilmadi")
    for k, v in body.model_dump().items():
        setattr(p, k, v)
    await ledger.audit(s, admin["id"], "product_edit", str(pid))
    await s.commit()
    return {"ok": True}


@router.get("/orders")
async def all_orders(status: str | None = None, s: AsyncSession = Depends(get_session)):
    q = select(Order).order_by(Order.created_at.desc()).limit(200)
    if status:
        q = q.where(Order.status == status)
    return [{"id": o.id, "user_id": o.user_id, "product": o.product_name, "price": o.price,
             "nick": o.game_nick, "status": o.status, "result": o.delivery_result}
            for o in (await s.execute(q)).scalars().all()]


@router.post("/orders/{oid}/requeue")
async def requeue(oid: str, admin=Depends(admin_only), s: AsyncSession = Depends(get_session)):
    o = await s.get(Order, oid)
    if not o or o.status not in ("queued", "processing"):
        raise HTTPException(400, "Faqat navbat/jarayondagi buyurtma")
    o.status, o.attempts = "queued", 0
    await ledger.audit(s, admin["id"], "order_requeue", oid)
    await s.commit()
    return {"ok": True}


@router.post("/orders/{oid}/refund")
async def refund(oid: str, admin=Depends(admin_only), s: AsyncSession = Depends(get_session)):
    try:
        await ledger.refund_order(s, admin["id"], oid, "admin")
        await s.commit()
    except ledger.LedgerError as e:
        await s.rollback()
        raise HTTPException(400, str(e))
    return {"ok": True}


@router.get("/tickets")
async def tickets(s: AsyncSession = Depends(get_session)):
    ts = (await s.execute(select(Ticket).order_by(Ticket.created_at.desc()).limit(100))).scalars().all()
    out = []
    for t in ts:
        ms = (await s.execute(select(TicketMessage).where(TicketMessage.ticket_id == t.id)
                              .order_by(TicketMessage.id))).scalars().all()
        out.append({"id": t.id, "user_id": t.user_id, "status": t.status,
                    "payment_id": t.payment_id, "order_id": t.order_id,
                    "messages": [{"admin": m.from_admin, "text": m.text} for m in ms]})
    return out


class ReplyIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


@router.post("/tickets/{tid}/reply")
async def reply(tid: str, body: ReplyIn, admin=Depends(admin_only), s: AsyncSession = Depends(get_session)):
    t = await s.get(Ticket, tid)
    if not t:
        raise HTTPException(404, "Topilmadi")
    s.add(TicketMessage(ticket_id=tid, from_admin=True, text=body.text))
    t.status = "answered"
    await ledger.audit(s, admin["id"], "ticket_reply", tid)
    await s.commit()
    return {"ok": True}


@router.get("/audit")
async def audit_log(s: AsyncSession = Depends(get_session)):
    rows = (await s.execute(select(AuditLog).order_by(AuditLog.id.desc()).limit(200))).scalars().all()
    return [{"actor": a.actor_id, "action": a.action, "details": a.details,
             "at": a.created_at.isoformat()} for a in rows]
