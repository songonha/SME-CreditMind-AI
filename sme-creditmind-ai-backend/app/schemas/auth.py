from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    organization_name: str = Field(..., min_length=2, max_length=255)
    organization_slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field("", max_length=255)

    @field_validator("email", mode="before")
    @classmethod
    def _strip_email(cls, v: object) -> object:
        return v.strip() if isinstance(v, str) else v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email", mode="before")
    @classmethod
    def _strip_email(cls, v: object) -> object:
        return v.strip() if isinstance(v, str) else v


class RefreshRequest(BaseModel):
    refresh_token: str


class OrgSummary(BaseModel):
    id: str
    name: str
    slug: str
    role: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut
    organizations: list[OrgSummary]


class MeResponse(BaseModel):
    user: UserOut
    organizations: list[OrgSummary]


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def _strip_email(cls, v: object) -> object:
        return v.strip() if isinstance(v, str) else v


class ForgotPasswordResponse(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=500)
    new_password: str = Field(..., min_length=8, max_length=128)


class ResetPasswordResponse(BaseModel):
    message: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


class ChangePasswordResponse(BaseModel):
    message: str
