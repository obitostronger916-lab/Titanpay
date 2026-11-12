import httpx

from app.config import settings
from app.delivery.base import DeliveryNotConfigured, DeliveryResult, DeliveryUncertain


def is_configured() -> bool:
    return bool(settings.ONESTATE_API_URL and settings.ONESTATE_API_KEY)


async def deliver(order_id: str, game_nick: str, payload: str | None) -> DeliveryResult:
    """ONESTATE RP API adapteri.
    DIQQAT: rasmiy API hujjati yo'q. Quyidagi so'rov formati TAXMINIY — hujjat kelganda
    faqat shu funksiyani moslang. Sozlanmagan bo'lsa DeliveryNotConfigured ko'tariladi.
    order_id idempotency kaliti sifatida yuboriladi (takroriy yuborishdan himoya)."""
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
        raise DeliveryUncertain(str(e))
    if 200 <= r.status_code < 300:
        return DeliveryResult(True, r.text[:500])
    # Rasmiy API semantikasi tasdiqlanmaguncha hech bir non-2xx javob
    # buyurtma bajarilmaganini isbotlamaydi; refund yoki retry qilinmaydi.
    raise DeliveryUncertain(f"HTTP {r.status_code}: {r.text[:300]}")
