import base64

import pytest
from pydantic import ValidationError

from app.api.admin import BackgroundIn


def data_url(mime: str, payload: bytes) -> str:
    return f"data:{mime};base64," + base64.b64encode(payload).decode("ascii")


@pytest.mark.parametrize(
    ("mime", "payload"),
    [
        ("image/jpeg", b"\xff\xd8\xff" + b"jpeg-data"),
        ("image/png", b"\x89PNG\r\n\x1a\n" + b"png-data"),
        ("image/webp", b"RIFF" + b"\x00\x00\x00\x00" + b"WEBP" + b"webp-data"),
    ],
)
def test_background_image_accepts_supported_signatures(mime, payload):
    value = data_url(mime, payload)
    assert BackgroundIn(image_data=value).image_data == value


@pytest.mark.parametrize(
    "value",
    [
        "data:image/png;base64,not base64!",
        data_url("image/png", b"not-an-image"),
        data_url("image/jpeg", b"\x89PNG\r\n\x1a\nwrong-mime"),
        data_url("image/webp", b"RIFF-not-webp"),
    ],
)
def test_background_image_rejects_invalid_data_or_mime(value):
    with pytest.raises(ValidationError):
        BackgroundIn(image_data=value)


def test_background_image_rejects_payload_over_two_megabytes():
    payload = b"\x89PNG\r\n\x1a\n" + b"x" * (2 * 1024 * 1024)
    with pytest.raises(ValidationError):
        BackgroundIn(image_data=data_url("image/png", payload))
