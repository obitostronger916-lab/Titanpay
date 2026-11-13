from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./dev.db"
    BOT_TOKEN: str = ""
    ADMIN_ID: int = 0
    WEBAPP_URL: str = ""
    PAYMENT_PROVIDER: str = "none"
    PAYMENT_WEBHOOK_SECRET: str = ""
    ONESTATE_API_URL: str = ""
    ONESTATE_API_KEY: str = ""
    ONESTATE_DELIVERY_ENABLED: bool = False
    PAYMENT_TTL_MINUTES: int = 20
    INITDATA_MAX_AGE: int = 86400
    RUN_BOT: bool = False  # True bo'lsa bot web servis ichida ishlaydi

    @property
    def async_db_url(self) -> str:
        u = self.DATABASE_URL
        if u.startswith("postgres://"):
            u = u.replace("postgres://", "postgresql+asyncpg://", 1)
        elif u.startswith("postgresql://"):
            u = u.replace("postgresql://", "postgresql+asyncpg://", 1)
        return u


settings = Settings()
