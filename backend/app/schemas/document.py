from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class DocumentSubmit(BaseModel):
    extracted_data: dict
    confidence_scores: dict[str, float] | None = None

    @field_validator("confidence_scores")
    @classmethod
    def validate_scores(cls, v, info):
        if v is None:
            return v
        for key, score in v.items():
            if not isinstance(score, (int, float)) or score < 0 or score > 1:
                raise ValueError(f"Score for '{key}' must be between 0 and 1")
        return v


class DocumentUpdate(BaseModel):
    extracted_data: dict | None = None
    confidence_scores: dict[str, float] | None = None
    status: str | None = None
    comment: str | None = None


class AuditEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    action: str
    actor: str
    field_name: str | None
    old_value: dict | None
    new_value: dict | None
    comment: str | None
    timestamp: datetime


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    document_type_id: str
    status: str
    extracted_data: dict
    confidence_score: float | None
    confidence_scores: dict | None
    created_at: datetime
    updated_at: datetime
    history: list[AuditEventResponse] | None = None


class DocumentListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    document_type_id: str
    status: str
    extracted_data: dict
    confidence_score: float | None
    confidence_scores: dict | None
    created_at: datetime
    updated_at: datetime
    document_type_name: str | None = None
