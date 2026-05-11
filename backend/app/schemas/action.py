from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ActionCatalogResponse(BaseModel):
    id: int
    slug: str
    name: str
    host_type: str
    timeout_seconds: int
    max_output_chars: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class ActionRunRequest(BaseModel):
    params: dict[str, Any] = Field(default_factory=dict)


class ActionRunResponse(BaseModel):
    id: int
    request_id: str
    device_id: int
    action_id: int
    status: str
    exit_code: int | None
    output_text: str | None
    error_text: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
