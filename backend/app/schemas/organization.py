from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class OrganizationCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=120, pattern="^[a-z0-9-]+$")


class OrganizationResponse(BaseModel):
    id: int
    name: str
    slug: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrganizationMembershipResponse(BaseModel):
    organization_name: str
    organization_slug: str
    organization_id: int
    role: str
    status: str


class OrganizationMemberDetailResponse(BaseModel):
    user_id: int
    email: str
    full_name: str | None
    role: str
    status: str


class OrganizationMemberUpdateRequest(BaseModel):
    role: str = Field(pattern="^(owner|admin|operator|viewer)$")
    model_config = ConfigDict(from_attributes=True)
