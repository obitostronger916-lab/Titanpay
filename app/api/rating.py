from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.user import me
from app.db import get_session
from app.security import current_user
from app.services import rating

router = APIRouter(prefix="/api")


class RatingItem(BaseModel):
    rank: int
    name: str
    amount: int
    avatar_url: str | None = None


class RatingOut(BaseModel):
    period: Literal["day", "month", "year"]
    start: str
    end: str
    items: list[RatingItem]


@router.get("/rating", response_model=RatingOut)
async def get_rating(
    period: Literal["day", "month", "year"] = Query("day"),
    tg: dict = Depends(current_user),
    u=Depends(me),
    s: AsyncSession = Depends(get_session),
):
    # Imzolangan Telegram egasi va DB foydalanuvchisi bir xil bo'lishi shart.
    if tg["id"] != u.id:
        raise HTTPException(403, "Foydalanuvchi ma'lumoti mos emas")
    await rating.remember_own_avatar(tg["id"], tg.get("photo_url"))
    now = datetime.now(timezone.utc)
    start, end = rating.period_bounds(period, now)
    items = await rating.top_donors(s, period, now)
    return RatingOut(period=period, start=start.isoformat(), end=end.isoformat(), items=items)
