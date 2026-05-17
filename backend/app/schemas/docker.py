from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DockerContainerResponse(BaseModel):
    id: int
    device_id: int
    container_id: str
    name: str
    image: str
    image_id: str | None
    state: str
    health: str | None
    restart_count: int
    ports_json: list[dict[str, str | int]] | None
    labels_json: dict[str, str] | None
    networks_json: list[str] | None
    mounts_json: list[dict[str, str | bool]] | None
    command: str | None
    created_at_container: datetime | None
    started_at_container: datetime | None
    last_seen_at: datetime
    is_present: bool
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DockerContainerEventResponse(BaseModel):
    id: int
    device_id: int
    container_id: str
    event_type: str
    severity: str
    summary: str
    payload_json: dict | list[dict] | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
