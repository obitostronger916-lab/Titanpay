from dataclasses import dataclass


class DeliveryNotConfigured(Exception):
    pass


class DeliveryRetryable(Exception):
    """Vaqtinchalik xato: buyurtma navbatda qoladi, keyinroq qayta uriniladi."""


@dataclass
class DeliveryResult:
    ok: bool
    message: str
