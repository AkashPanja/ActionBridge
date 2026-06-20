from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CommentCreate(BaseModel):
    content: str
    parent_id: str | None = None


class CommentUpdate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    user_id: str
    parent_id: str | None
    content: str
    created_at: datetime
    updated_at: datetime
    author_name: str | None = None
    replies: list["CommentResponse"] = []
