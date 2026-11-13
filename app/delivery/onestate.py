import httpx

from app.config import settings
from app.delivery.base import DeliveryNotConfigured, DeliveryResult, DeliveryRetryable


def is_configured() -> bool:
    return bool(
        settings.ONESTATE_DELIVERY_ENABLED
        and settings.ONESTATE_API_URL
        and settings.ONESTATE_API_KEY
    )


async def deliver(order_id: str, game_nick: str, payload: str | None) -> DeliveryResult:
    """ONESTATE RP API adapteri.
    DIQQAT: rasmiy API hujjati yo'q. Quyidagi so'rov formati TAXMINIY va
    ONESTATE_DELIVERY_ENABLED aniq yoqilmaguncha ishlamaydi. Rasmiy hujjat va sandbox
    sinovlaridan keyingina so'rov maydonlari, autentifikatsiya va idempotency mosligini tasdiqlang."""
    if not is_configured():
        raise DeliveryNotConfigured("ONESTATE API sozlanmagan")
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(
                settings.ONESTATE_API_URL,
                headers={"Authorization": f"Bearer {settings.ONESTATE_API_KEY}",
                         "Idempotency-Key": order_id},
                json={"order_id": order_id, "nick": game_nick, "payload": payload},
            )
    except httpx.HTTPError as e:
        raise DeliveryRetryable(str(e))
    if r.status_code >= 500 or r.status_code == 429:
        raise DeliveryRetryable(f"HTTP {r.status_code}")
    if 200 <= r.status_code < 300:
        return DeliveryResult(True, r.text[:500])
    return DeliveryResult(False, f"HTTP {r.status_code}: {r.text[:300]}")
