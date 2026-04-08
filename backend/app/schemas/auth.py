from __future__ import annotations

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class AuthUser(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    email: EmailStr
    fullName: str | None = None
    emailConfirmedAt: str | None = None


class RegisterRequest(BaseModel):
    fullName: str | None = Field(default=None, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=120)

    @field_validator("fullName")
    @classmethod
    def normalize_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped if stripped else None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=120)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class AuthSessionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    user: AuthUser
    accessToken: str | None = None
    refreshToken: str | None = None
    expiresIn: int | None = None
    tokenType: str | None = None
    requiresEmailConfirmation: bool = False
    message: str | None = None


class AuthMessageResponse(BaseModel):
    message: str
