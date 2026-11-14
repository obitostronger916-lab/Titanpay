from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
from types import SimpleNamespace
from urllib.parse import urlencode

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI

from app.api import rating as rating_api
from app.api.user import me
from app.db import get_session
from app.models import LedgerEntry, Payment, User, UserAvatar
from app.services import rating

URL_A = "https://t.me/i/userpic/320/AbCdEfGhIjKlMnOpQrStUvWxYz012345.jpg"


def init_data(user_id: int, photo_url: str | None = None, first_name: str = "Test user") -> str:
    user = {"id": user_id, "first_name": first_name}
    if photo_url:
        user["photo_url"] = photo_url
    pairs = {
        "auth_date": str(int(datetime.now(timezone.utc).timestamp())),
        "user": json.dumps(user, separators=(",", ":")),
    }
    check = "\n".join(f"{key}={value}" for key, value in sorted(pairs.items()))
    secret = hmac.new(b"WebAppData", b"123456:TESTTOKEN", hashlib.sha256).digest()
    pairs["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(pairs)


@pytest_asyncio.fixture
async def app(session):
    application = FastAPI()
    application.include_router(rating_api.router)

    async def override_session():
        yield session

    application.dependency_overrides[get_session] = override_session
    yield application
    application.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client(app):
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


async def add_user(session, user_id: int, name: str, banned: bool = False):
    session.add(User(id=user_id, first_name=name, is_banned=banned))
    await session.flush()


async def add_payment(session, user_id: int, payment_id: str, amount: int,
                      status: str, kind: str, created_at: datetime):
    session.add(Payment(
        id=payment_id, user_id=user_id, expected_amount=amount, paid_amount=amount,
        provider="test", status=status, expires_at=created_at + timedelta(days=1),
    ))
    await session.flush()
    session.add(LedgerEntry(
        user_id=user_id, amount=amount, balance_after=amount, kind=kind,
        ref_type="payment", ref_id=payment_id, created_at=created_at,
    ))
    await session.flush()


@pytest.mark.asyncio
async def test_period_bounds_use_tashkent_calendar():
    now = datetime(2026, 11, 30, 20, 30, tzinfo=timezone.utc)
    start, end = rating.period_bounds("day", now)
    assert start == datetime(2026, 11, 30, 19, 0, tzinfo=timezone.utc)
    assert end == datetime(2026, 12, 1, 19, 0, tzinfo=timezone.utc)
    year_start, year_end = rating.period_bounds("year", now)
    assert year_start == datetime(2025, 12, 31, 19, 0, tzinfo=timezone.utc)
    assert year_end == datetime(2026, 12, 31, 19, 0, tzinfo=timezone.utc)


@pytest.mark.asyncio
async def test_only_confirmed_matching_ledger_rows_are_counted(session):
    now = datetime(2026, 11, 14, 8, 0, tzinfo=timezone.utc)
    start, _ = rating.period_bounds("day", now)
    credited = start + timedelta(hours=2)
    await add_user(session, 101, "Alpha")
    await add_user(session, 102, "Beta")
    await add_user(session, 103, "Banned", banned=True)
    await add_payment(session, 101, "P1", 10000, "credited", "topup", credited)
    await add_payment(session, 101, "P2", 5000, "mismatch_credited", "mismatch_credit", credited + timedelta(hours=1))
    await add_payment(session, 102, "P3", 20000, "created", "topup", credited)
    await add_payment(session, 102, "P4", 30000, "credited", "purchase", credited)
    await add_payment(session, 103, "P5", 90000, "credited", "topup", credited)
    await session.commit()

    items = await rating.top_donors(session, "day", now)
    assert items == [{"rank": 1, "name": "Alpha", "amount": 15000, "avatar_url": None}]


@pytest.mark.asyncio
async def test_top_ten_and_deterministic_tie_break(session):
    now = datetime.now(timezone.utc)
    start, _ = rating.period_bounds("day", now)
    credited = start + timedelta(hours=1)
    for user_id in range(1, 13):
        await add_user(session, user_id, f"User {user_id}")
        await add_payment(session, user_id, f"D{user_id}", 10000, "credited", "topup", credited)
    await session.commit()

    items = await rating.top_donors(session, "day", now)
    assert len(items) == 10
    assert [item["name"] for item in items] == [f"User {i}" for i in range(1, 11)]


@pytest.mark.asyncio
async def test_avatar_validation_and_no_erasure(session):
    assert rating.safe_avatar_url(URL_A) == URL_A
    assert rating.safe_avatar_url("https://evil.example/avatar.jpg") is None
    assert rating.safe_avatar_url("http://t.me/i/userpic/320/AbCdEfGhIjKlMnOpQrStUvWxYz012345.jpg") is None
    await add_user(session, 501, "Avatar user")
    await session.commit()
    await rating.remember_own_avatar(501, URL_A)
    await rating.remember_own_avatar(501, None)
    stored = await session.get(UserAvatar, 501)
    assert stored and stored.avatar_url == URL_A


@pytest.mark.asyncio
async def test_api_response_is_private_and_signed_user_must_match(client, app, session):
    await add_user(session, 601, "Donor")
    now = datetime.now(timezone.utc)
    start, _ = rating.period_bounds("day", now)
    await add_payment(session, 601, "API1", 25000, "credited", "topup", start + timedelta(minutes=10))
    await session.commit()

    response = await client.get("/api/rating", headers={"X-Init-Data": init_data(601, URL_A, first_name="Donor")})
    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {"period", "start", "end", "items"}
    assert payload["items"] == [{"rank": 1, "name": "Donor", "amount": 25000, "avatar_url": URL_A}]
    assert "user_id" not in payload["items"][0]
    assert "username" not in payload["items"][0]

    app.dependency_overrides[me] = lambda: SimpleNamespace(id=999)
    mismatch = await client.get("/api/rating", headers={"X-Init-Data": init_data(900, URL_A)})
    assert mismatch.status_code == 403
    assert await session.get(UserAvatar, 900) is None
    assert await session.get(UserAvatar, 999) is None


@pytest.mark.asyncio
async def test_api_rejects_invalid_period_and_missing_auth(client):
    invalid = await client.get("/api/rating?period=week", headers={"X-Init-Data": init_data(701)})
    assert invalid.status_code == 422
    missing = await client.get("/api/rating")
    assert missing.status_code == 401
