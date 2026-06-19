from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.project import Base


class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, nullable=False)
