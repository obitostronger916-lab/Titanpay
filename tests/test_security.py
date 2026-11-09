import hashlib
import hmac

import pytest
from fastapi import HTTPException

from app.config import settings
from app.security import verify_init_data, verify_webhook_signature
from tests.helpers import make_init_data


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


def test_webhook_signature():
    body = b'{"a":1}'
    good = hmac.new(settings.PAYMENT_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    assert verify_webhook_signature(body, good)
    assert not verify_webhook_signature(body, "bad")
    assert not verify_webhook_signature(body, "")
    assert not verify_webhook_signature(b'{"a":2}', good)
