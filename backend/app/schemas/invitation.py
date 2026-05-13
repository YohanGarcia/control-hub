from datetime import datetime

from pydantic import BaseModel, Field


class InviteCreateRequest(BaseModel):
    role: str = Field(pattern="^(admin|operator|viewer)$")
    expires_in_seconds: int = Field(default=86400, ge=300, le=604800)


class InviteCreateResponse(BaseModel):
    id: int
    token: str
    role: str
    expires_at: datetime


class InviteResponse(BaseModel):
    id: int
    role: str
    expires_at: datetime
    used_at: datetime | None
    created_at: datetime


class InviteAcceptRequest(BaseModel):
    token: str = Field(min_length=16, max_length=512)
