from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DeviceCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    host_type: str = Field(pattern="^(windows|ubuntu)$")
    os_name: str | None = Field(default=None, max_length=50)
    agent_version: str | None = Field(default=None, max_length=30)
    agent_key: str = Field(min_length=24, max_length=256)


class DeviceUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    is_online: bool | None = None


class DeviceResponse(BaseModel):
    id: int
    name: str
    host_type: str
    os_name: str | None
    agent_version: str | None
    is_online: bool
    last_seen_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class DeviceStatusResponse(BaseModel):
    device: DeviceResponse
    latest_metric: dict[str, float | str] | None


class DeviceMetricResponse(BaseModel):
    cpu_percent: float
    ram_percent: float
    disk_percent: float
    uptime_seconds: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
