from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    totp_code: str | None = Field(default=None, min_length=6, max_length=6)


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class Setup2FARequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class TokenPairResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    password_change_required: bool


class Setup2FAResponse(BaseModel):
    otp_uri: str
    secret: str


class ChangePasswordRequest(BaseModel):
    email: EmailStr
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)
    totp_code: str | None = Field(default=None, min_length=6, max_length=6)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
