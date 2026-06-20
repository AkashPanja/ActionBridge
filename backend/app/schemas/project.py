from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    visibility: str = "private"


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    visibility: str | None = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    created_by: str | None
    visibility: str
    created_at: datetime
    updated_at: datetime


class MemberResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    role: str
    status: str
    invited_by: str | None
    user_name: str | None = None
    user_email: str | None = None
    created_at: datetime


class InviteRequest(BaseModel):
    user_id: str
    role: str = "viewer"


class StatusCount(BaseModel):
    status: str
    count: int


class DailyVolume(BaseModel):
    date: str
    count: int
    status: str


class ProjectStats(BaseModel):
    total_documents: int
    status_breakdown: list[StatusCount]
    avg_confidence: float | None
    by_document_type: list[dict]
    daily_volume: list[DailyVolume]
