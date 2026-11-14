import logging
import re
from datetime import datetime, time, timedelta, timezone
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import SessionLocal
from app.models import LedgerEntry, Payment, User, UserAvatar

log = logging.getLogger(__name__)
TASHKENT = ZoneInfo("Asia/Tashkent")
_AVATAR_PATH_RE = re.compile(
    r"/i/userpic/[0-9]{1,4}/[A-Za-z0-9_-]{16,128}\.(?:svg|jpe?g|png|webp)\Z",
    re.IGNORECASE,
)


def period_bounds(period: str, now: datetime | None = None) -> tuple[datetime, datetime]:
    """Toshkent kalendar davri chegaralarini UTC ko'rinishida qaytaradi."""
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    local = current.astimezone(TASHKENT)
    if period == "day":
        start_local = datetime.combine(local.date(), time.min, TASHKENT)
        end_local = start_local + timedelta(days=1)
    elif period == "month":
        start_local = datetime(local.year, local.month, 1, tzinfo=TASHKENT)
        if local.month == 12:
            end_local = datetime(local.year + 1, 1, 1, tzinfo=TASHKENT)
        else:
            end_local = datetime(local.year, local.month + 1, 1, tzinfo=TASHKENT)
    elif period == "year":
        start_local = datetime(local.year, 1, 1, tzinfo=TASHKENT)
        end_local = datetime(local.year + 1, 1, 1, tzinfo=TASHKENT)
    else:
        raise ValueError("period day, month yoki year bo'lishi kerak")
    return start_local.astimezone(timezone.utc), end_local.astimezone(timezone.utc)


def clean_name(value: str | None, fallback: str = "O‘yinchi") -> str:
    value = (value or "").strip()
    value = re.sub(r"[\x00-\x1f\x7f]", "", value)
    value = re.sub(r"\s+", " ", value)
    return value[:48] or fallback


def safe_avatar_url(value: str | None) -> str | None:
    if not value or len(value) > 1000:
        return None
    try:
        parsed = urlparse(value)
        port = parsed.port
    except ValueError:
        return None
    if (parsed.scheme != "https" or parsed.hostname != "t.me"
            or parsed.username or parsed.password or port
            or parsed.fragment or not _AVATAR_PATH_RE.fullmatch(parsed.path)):
        return None
    return value


async def remember_own_avatar(user_id: int, raw_photo_url: str | None,
                              session_factory=None) -> None:
    """Avatarni alohida DB sessiyada yozadi; yaroqsiz URL eskisini o'chirmaydi."""
    url = safe_avatar_url(raw_photo_url)
    if not url:
        return
    factory = session_factory or SessionLocal
    try:
        async with factory() as session:
            if not await session.get(User, user_id):
                return
            avatar = await session.get(UserAvatar, user_id)
            if avatar:
                avatar.avatar_url = url
                avatar.updated_at = datetime.now(timezone.utc)
            else:
                session.add(UserAvatar(user_id=user_id, avatar_url=url))
            await session.commit()
    except Exception:
        log.exception("Rating avatarini saqlashda xatolik (user_id=%s)", user_id)


async def top_donors(session: AsyncSession, period: str,
                     now: datetime | None = None) -> list[dict]:
    start, end = period_bounds(period, now)
    # Har bir Payment bir marta sanaladi; ledger/payment juftligi mos bo'lishi shart.
    per_payment = (
        select(
            Payment.id.label("payment_id"),
            Payment.user_id.label("user_id"),
            Payment.paid_amount.label("amount"),
            func.min(LedgerEntry.created_at).label("credited_at"),
        )
        .join(LedgerEntry, LedgerEntry.ref_id == Payment.id)
        .where(
            LedgerEntry.ref_type == "payment",
            LedgerEntry.user_id == Payment.user_id,
            LedgerEntry.created_at >= start,
            LedgerEntry.created_at < end,
            Payment.paid_amount.is_not(None),
            Payment.paid_amount > 0,
            ((Payment.status == "credited") & (LedgerEntry.kind == "topup"))
            | ((Payment.status == "mismatch_credited") & (LedgerEntry.kind == "mismatch_credit")),
        )
        .group_by(Payment.id, Payment.user_id, Payment.paid_amount)
        .subquery()
    )
    rows = (await session.execute(
        select(
            per_payment.c.user_id,
            func.sum(per_payment.c.amount).label("total"),
            func.max(per_payment.c.credited_at).label("last_at"),
            User.first_name,
            User.username,
            UserAvatar.avatar_url,
        )
        .join(User, User.id == per_payment.c.user_id)
        .outerjoin(UserAvatar, UserAvatar.user_id == User.id)
        .where(User.is_banned.is_(False))
        .group_by(User.id, User.first_name, User.username, UserAvatar.avatar_url)
        .order_by(func.sum(per_payment.c.amount).desc(),
                  func.max(per_payment.c.credited_at).asc(), User.id.asc())
        .limit(10)
    )).all()
    return [
        {"rank": index, "name": clean_name(row.first_name or row.username),
         "amount": int(row.total), "avatar_url": safe_avatar_url(row.avatar_url)}
        for index, row in enumerate(rows, 1)
    ]
