from fastapi import APIRouter, Header, HTTPException, Request
from sqlalchemy.exc import IntegrityError

from app.db import SessionLocal
from app.providers import get_provider
from app.providers.base import ProviderNotConfigured
from app.security import verify_webhook_signature
from app.services import ledger

router = APIRouter(prefix="/webhook")


@router.post("/payment")
async def payment_webhook(request: Request, x_signature: str = Header(default="")):
    raw = await request.body()
    if not verify_webhook_signature(raw, x_signature):
        raise HTTPException(401, "Imzo noto'g'ri")
    try:
        ev = await get_provider().parse_webhook(raw)
    except ProviderNotConfigured:
        raise HTTPException(503, "Provayder ulanmagan")
    async with SessionLocal() as s:
        try:
            result = await ledger.handle_provider_confirmation(
                s, ev.payment_id, ev.provider_tx_id, ev.paid_amount)
            await s.commit()
        except (ledger.LedgerError, IntegrityError):
            await s.rollback()
            result = "duplicate"
    return {"result": result}
