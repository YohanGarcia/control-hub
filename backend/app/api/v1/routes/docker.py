from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_membership
from app.db.session import get_db
from app.models.organization_member import OrganizationMember
from app.schemas.docker import DockerContainerEventResponse, DockerContainerResponse
from app.services.device_service import get_device
from app.services.docker_service import list_device_container_events, list_device_containers


router = APIRouter()


@router.get("/devices/{device_id}/containers", response_model=list[DockerContainerResponse])
def get_device_containers(
    device_id: int,
    db: Session = Depends(get_db),
    membership: OrganizationMember = Depends(get_current_membership),
) -> list[DockerContainerResponse]:
    device = get_device(db, device_id, membership.organization_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return [DockerContainerResponse.model_validate(c) for c in list_device_containers(db, device_id=device_id)]


@router.get("/devices/{device_id}/containers/events", response_model=list[DockerContainerEventResponse])
def get_device_container_events(
    device_id: int,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    membership: OrganizationMember = Depends(get_current_membership),
) -> list[DockerContainerEventResponse]:
    device = get_device(db, device_id, membership.organization_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    events = list_device_container_events(db, device_id=device_id, limit=limit)
    return [DockerContainerEventResponse.model_validate(e) for e in events]
