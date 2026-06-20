from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    document_id: str | None
    type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime


class UnreadCountResponse(BaseModel):
    count: int
