from dataclasses import dataclass


class DeliveryNotConfigured(Exception):
    pass


class DeliveryRetryable(Exception):
    """Provayder qayta urinish xavfsizligini aniq bildirgan vaqtinchalik xato."""


class DeliveryUncertain(Exception):
    """So'rov bajarilgan-bajarilmagani noma'lum; avtomatik qayta yuborilmaydi."""


@dataclass
class DeliveryResult:
    ok: bool
    message: str
