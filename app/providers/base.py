from abc import ABC, abstractmethod
from dataclasses import dataclass


class ProviderNotConfigured(Exception):
    pass


@dataclass
class PaymentInstructions:
    payment_id: str
    amount: int
    pay_url: str | None = None
    card_info: str | None = None


@dataclass
class VerifiedEvent:
    payment_id: str
    provider_tx_id: str
    paid_amount: int


class PaymentProvider(ABC):
    name: str

    @abstractmethod
    async def create_invoice(self, payment_id: str, amount: int) -> PaymentInstructions: ...

    @abstractmethod
    async def parse_webhook(self, raw_body: bytes) -> VerifiedEvent:
        """Imzo tekshirilgan webhookni VerifiedEvent formatiga o'tkazadi."""
