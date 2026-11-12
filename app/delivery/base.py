from dataclasses import dataclass


class DeliveryNotConfigured(Exception):
    pass


class DeliveryRetryable(Exception):
    """Yetkazish natijasi noaniq: avtomatik qayta yuborish xavfsiz emas."""


@dataclass
class DeliveryResult:
    ok: bool
    message: str
