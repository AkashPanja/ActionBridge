from pydantic import BaseModel


class CompanySettings(BaseModel):
    name: str = "Action Bridge"
    logo: str = ""


class SmtpConfig(BaseModel):
    host: str = ""
    port: int = 587
    username: str = ""
    password: str = ""
    from_email: str = ""
    use_tls: bool = True


class PasswordPolicy(BaseModel):
    min_length: int = 8
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_numbers: bool = True
    require_symbols: bool = False


class SettingsResponse(BaseModel):
    company: CompanySettings
    smtp: SmtpConfig
    password_policy: PasswordPolicy


class SettingsUpdate(BaseModel):
    company: CompanySettings | None = None
    smtp: SmtpConfig | None = None
    password_policy: PasswordPolicy | None = None
