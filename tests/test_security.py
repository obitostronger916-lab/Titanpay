import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import pytest
from fastapi import HTTPException

from app.config import settings
from app.security import verify_init_data, verify_webhook_signature
from tests.helpers import make_init_data


def signed_init_data(user, auth_date=None):
    pairs = {
        "auth_date": str(int(time.time()) if auth_date is None else auth_date),
        "user": json.dumps(user, separators=(",", ":")),
    }
    check = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret = hmac.new(b"WebAppData", "123456:TESTTOKEN".encode(), hashlib.sha256).digest()
    pairs["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(pairs)


def test_valid_init_data():
    assert verify_init_data(make_init_data(555))["id"] == 555


def test_wrong_bot_token_rejected():
    with pytest.raises(HTTPException) as e:
        verify_init_data(make_init_data(555, token="999:OTHER"))
    assert e.value.status_code == 401


def test_tampered_init_data_rejected():
    with pytest.raises(HTTPException):
        verify_init_data(make_init_data(555, tamper=True))


def test_expired_init_data_rejected():
    with pytest.raises(HTTPException):
        verify_init_data(make_init_data(555, age=settings.INITDATA_MAX_AGE + 100))


def test_empty_init_data_rejected():
    with pytest.raises(HTTPException):
        verify_init_data("")


def test_duplicate_query_parameter_rejected():
    with pytest.raises(HTTPException) as e:
        verify_init_data(make_init_data(555) + "&auth_date=1")
    assert e.value.status_code == 401


def test_malformed_query_rejected():
    with pytest.raises(HTTPException) as e:
        verify_init_data("auth_date")
    assert e.value.status_code == 401


def test_missing_auth_date_rejected():
    data = signed_init_data({"id": 555}).replace("auth_date=", "missing=")
    with pytest.raises(HTTPException):
        verify_init_data(data)


def test_invalid_auth_date_rejected():
    with pytest.raises(HTTPException) as e:
        verify_init_data(signed_init_data({"id": 555}, "not-a-date"))
    assert e.value.status_code == 401


def test_future_auth_date_rejected():
    with pytest.raises(HTTPException) as e:
        verify_init_data(signed_init_data({"id": 555}, int(time.time()) + 120))
    assert e.value.status_code == 401


@pytest.mark.parametrize("user", [[], "user", {}, {"id": "555"}, {"id": True}, {"id": 0}, {"id": -1}])
def test_invalid_user_payload_rejected(user):
    with pytest.raises(HTTPException) as e:
        verify_init_data(signed_init_data(user))
    assert e.value.status_code == 401


def test_invalid_hash_format_rejected():
    data = make_init_data(555).replace("hash=", "hash=xyz")
    with pytest.raises(HTTPException) as e:
        verify_init_data(data)
    assert e.value.status_code == 401


def test_webhook_signature():
    body = b'{"a":1}'
    good = hmac.new(settings.PAYMENT_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    assert verify_webhook_signature(body, good)
    assert not verify_webhook_signature(body, "bad")
    assert not verify_webhook_signature(body, "")
    assert not verify_webhook_signature(b'{"a":2}', good)
