import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl

from fastapi import Depends, Header, HTTPException

from app.config import settings


def verify_init_data(init_data: str) -> dict:
    """Telegram WebApp initData'ni serverda tekshiradi, user dict qaytaradi."""
    if not init_data or not settings.BOT_TOKEN:
        raise HTTPException(401, "initData yo'q")
    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received = pairs.pop("hash", None)
    if not received:
        raise HTTPException(401, "hash yo'q")
    check = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret = hmac.new(b"WebAppData", settings.BOT_TOKEN.encode(), hashlib.sha256).digest()
    calc = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calc, received):
        raise HTTPException(401, "initData noto'g'ri")
    if time.time() - int(pairs.get("auth_date", 0)) > settings.INITDATA_MAX_AGE:
        raise HTTPException(401, "initData eskirgan")
    try:
        return json.loads(pairs["user"])
    except Exception:
        raise HTTPException(401, "user ma'lumoti yo'q")


async def current_user(x_init_data: str = Header(default="")) -> dict:
    return verify_init_data(x_init_data)


async def admin_only(user: dict = Depends(current_user)) -> dict:
    # Admin ID faqat server konfiguratsiyasidan olinadi
    if not settings.ADMIN_ID or user["id"] != settings.ADMIN_ID:
        raise HTTPException(403, "Ruxsat yo'q")
    return user


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    if not settings.PAYMENT_WEBHOOK_SECRET:
        return False  # sirsiz webhook hech qachon qabul qilinmaydi
    calc = hmac.new(settings.PAYMENT_WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(calc, signature or "")
