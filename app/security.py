import hashlib
import hmac
import json
import re
import time
from urllib.parse import parse_qsl

from fastapi import Depends, Header, HTTPException

from app.config import settings


def verify_init_data(init_data: str) -> dict:
    """Telegram WebApp initData'ni tekshiradi va ishonchli user dict qaytaradi."""
    if not init_data or not settings.BOT_TOKEN:
        raise HTTPException(401, "initData yo'q")

    try:
        items = parse_qsl(
            init_data,
            keep_blank_values=True,
            strict_parsing=True,
            max_num_fields=100,
        )
    except ValueError:
        raise HTTPException(401, "initData formati noto'g'ri")

    # dict() takrorlangan kalitlarni jim almashtiradi; bunday payload qabul qilinmaydi.
    if not items or len({key for key, _ in items}) != len(items):
        raise HTTPException(401, "initData maydonlari takrorlangan")

    pairs = dict(items)
    received = pairs.pop("hash", None)
    if not received or not re.fullmatch(r"[0-9a-f]{64}", received):
        raise HTTPException(401, "hash noto'g'ri")
    if "auth_date" not in pairs or "user" not in pairs:
        raise HTTPException(401, "auth_date yoki user yo'q")

    check = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret = hmac.new(b"WebAppData", settings.BOT_TOKEN.encode(), hashlib.sha256).digest()
    calc = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calc, received):
        raise HTTPException(401, "initData imzosi noto'g'ri")

    try:
        auth_date = int(pairs["auth_date"])
    except (TypeError, ValueError):
        raise HTTPException(401, "auth_date noto'g'ri")

    now = int(time.time())
    if auth_date > now + 30:
        raise HTTPException(401, "initData kelajak sanasidan")
    if now - auth_date > settings.INITDATA_MAX_AGE:
        raise HTTPException(401, "initData eskirgan")

    try:
        user = json.loads(pairs["user"])
    except (TypeError, ValueError):
        raise HTTPException(401, "user ma'lumoti noto'g'ri")

    if not isinstance(user, dict) or isinstance(user.get("id"), bool) or not isinstance(user.get("id"), int) or user["id"] <= 0:
        raise HTTPException(401, "user ID noto'g'ri")
    return user


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
