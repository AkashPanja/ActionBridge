import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./doc_action_center.db"
    database_url_sync: str = "sqlite:///./doc_action_center.db"
    app_name: str = "Action Bridge API"
    debug: bool = True

    @property
    def is_postgres(self) -> bool:
        return "postgresql" in self.database_url

    class Config:
        env_file = ".env"


settings = Settings()

# Allow override from .env
if os.getenv("DATABASE_URL"):
    settings.database_url = os.getenv("DATABASE_URL")
    settings.database_url_sync = os.getenv("DATABASE_URL", "").replace(
        "+asyncpg", ""
    ).replace("postgresql", "postgresql")
