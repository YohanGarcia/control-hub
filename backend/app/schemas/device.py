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


class DeviceMetricResponse(BaseModel):
    cpu_percent: float
    ram_percent: float
    disk_percent: float
    cpu_min: float | None = None
    cpu_max: float | None = None
    ram_min: float | None = None
    ram_max: float | None = None
    disk_min: float | None = None
    disk_max: float | None = None
    sample_count: int = 1
    window_seconds: int = 1
    net_bytes_recv: float | None = None
    net_bytes_sent: float | None = None
    cpu_per_core: list[float] | None = None
    load_avg_1: float | None = None
    load_avg_5: float | None = None
    load_avg_15: float | None = None
    temps: list[dict[str, float | str]] | None = None
    disk_mounts: list[dict[str, float | str]] | None = None
    uptime_seconds: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DeviceStatusResponse(BaseModel):
    device: DeviceResponse
    latest_metric: DeviceMetricResponse | None
