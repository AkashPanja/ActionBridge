from datetime import datetime

from pydantic import BaseModel, ConfigDict, model_validator


class BulkIds(BaseModel):
    ids: list[str]

from app.utils.json_schema import validate_json_schema


class DocumentTypeCreate(BaseModel):
    name: str
    schema_definition: dict
    validation_rules: dict | None = None

    @model_validator(mode="after")
    def validate_schema(self):
        errors = validate_json_schema(self.schema_definition)
        if errors:
            raise ValueError(f"Invalid JSON Schema: {', '.join(errors)}")
        return self


class DocumentTypeUpdate(BaseModel):
    name: str | None = None
    schema_definition: dict | None = None
    validation_rules: dict | None = None


class DocumentTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    name: str
    schema_definition: dict
    validation_rules: dict | None
    created_at: datetime
    updated_at: datetime
    document_count: int | None = None
