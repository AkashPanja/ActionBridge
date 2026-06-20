from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator
import re


class RegexPatternCreate(BaseModel):
    name: str
    pattern: str
    flags: str = ""
    description: str | None = None

    @field_validator("pattern")
    @classmethod
    def validate_regex(cls, v: str) -> str:
        try:
            re.compile(v)
        except re.error as e:
            raise ValueError(f"Invalid regex: {e}")
        return v

    @field_validator("flags")
    @classmethod
    def validate_flags(cls, v: str) -> str:
        allowed = set("ims")
        for ch in v:
            if ch not in allowed:
                raise ValueError(f"Invalid flag '{ch}'. Allowed: i, m, s")
        return v


class RegexPatternUpdate(BaseModel):
    name: str | None = None
    pattern: str | None = None
    flags: str | None = None
    description: str | None = None

    @field_validator("pattern")
    @classmethod
    def validate_regex(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            re.compile(v)
        except re.error as e:
            raise ValueError(f"Invalid regex: {e}")
        return v

    @field_validator("flags")
    @classmethod
    def validate_flags(cls, v: str | None) -> str | None:
        if v is None:
            return v
        allowed = set("ims")
        for ch in v:
            if ch not in allowed:
                raise ValueError(f"Invalid flag '{ch}'. Allowed: i, m, s")
        return v


class RegexPatternResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    pattern: str
    flags: str
    description: str | None
    created_at: datetime
    updated_at: datetime
