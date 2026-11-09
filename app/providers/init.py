from app.config import settings
from app.providers.base import PaymentProvider
from app.providers.none import NoProvider

# Yangi provayder: app/providers/<nom>.py yozing, PaymentProvider'dan meros oling
# va shu yerdagi REGISTRY ga qo'shing.
REGISTRY: dict[str, type[PaymentProvider]] = {"none": NoProvider}


def get_provider() -> PaymentProvider:
    cls = REGISTRY.get(settings.PAYMENT_PROVIDER, NoProvider)
    return cls()
