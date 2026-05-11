from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditEventResponse(BaseModel):
    id: int
    event_type: str
    actor_user_id: int | None
    source_ip: str | None
    target_type: str | None
    target_id: str | None
    details: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
