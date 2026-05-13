from datetime import datetime

from pydantic import BaseModel, Field


class EnrollmentTokenCreateRequest(BaseModel):
    expires_in_seconds: int = Field(default=600, ge=60, le=3600)
    max_uses: int = Field(default=1, ge=1, le=10)


class EnrollmentTokenCreateResponse(BaseModel):
    token: str
    id: int
    expires_at: datetime
    max_uses: int
    used_count: int
    used_at: datetime | None


class EnrollmentTokenResponse(BaseModel):
    id: int
    organization_id: int
    created_by_user_id: int
    expires_at: datetime
    used_at: datetime | None
    max_uses: int
    used_count: int
    created_at: datetime


class AgentEnrollRequest(BaseModel):
    token: str = Field(min_length=16, max_length=512)
    name: str = Field(min_length=2, max_length=120)
    host_type: str = Field(pattern="^(windows|ubuntu|linux)$")
    os_name: str | None = Field(default=None, max_length=50)
    agent_version: str | None = Field(default=None, max_length=30)


class AgentEnrollResponse(BaseModel):
    device_id: int
    agent_key: str
    organization_id: int
