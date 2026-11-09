from app.providers.base import PaymentInstructions, PaymentProvider, ProviderNotConfigured, VerifiedEvent


class NoProvider(PaymentProvider):
    """Provayder tanlanmagan. To'lov YARATILMAYDI va hech qachon muvaffaqiyatli bo'lmaydi."""
    name = "none"

    async def create_invoice(self, payment_id: str, amount: int) -> PaymentInstructions:
        raise ProviderNotConfigured("UzCard/Humo provayderi hali ulanmagan")

    async def parse_webhook(self, raw_body: bytes) -> VerifiedEvent:
        raise ProviderNotConfigured("UzCard/Humo provayderi hali ulanmagan")
