from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "editor"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: str
    role: str
    is_active: bool
    created_at: datetime


class SetupStatusResponse(BaseModel):
    setup_required: bool


class SetupRequest(BaseModel):
    name: str
    email: str
    password: str
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True


class CreateUserRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "editor"


class UpdateUserRequest(BaseModel):
    name: str | None = None
    role: str | None = None
    is_active: bool | None = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class ApiKeyCreate(BaseModel):
    project_id: str
    label: str
    scopes: list[str] = ["documents:write"]
    project_ids: list[str] | None = None


class ApiKeyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    label: str
    key_prefix: str
    scopes: dict
    is_active: bool
    expires_at: datetime | None
    created_at: datetime
    scoped_projects: list[str] = []


class ApiKeyCreatedResponse(ApiKeyResponse):
    raw_key: str
    scoped_projects: list[str] = []
