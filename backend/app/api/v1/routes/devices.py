from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_membership, get_current_user, require_org_role
from app.db.session import get_db
from app.models.organization_member import OrganizationMember
from app.models.user import User
from app.schemas.device import DeviceCreateRequest, DeviceMetricResponse, DeviceResponse, DeviceStatusResponse, DeviceUpdateRequest
from app.services.audit_service import create_audit_log
from app.services.device_service import create_device, get_device, get_latest_metric, list_device_metrics, list_devices, update_device


router = APIRouter()


@router.get("/devices", response_model=list[DeviceResponse])
def get_devices(
    db: Session = Depends(get_db),
    membership: OrganizationMember = Depends(get_current_membership),
) -> list[DeviceResponse]:
    return [DeviceResponse.model_validate(d) for d in list_devices(db, membership.organization_id)]


@router.post("/devices", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
def post_device(
    payload: DeviceCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    membership: OrganizationMember = Depends(require_org_role("owner", "admin")),
) -> DeviceResponse:
    device = create_device(db, payload, user, membership)
    create_audit_log(
        db,
        organization_id=membership.organization_id,
        event_type="device.created",
        actor_user_id=user.id,
        source_ip=request.client.host if request.client else None,
        target_type="device",
        details=f"name={payload.name}; host_type={payload.host_type}",
    )
    db.commit()
    db.refresh(device)
    return DeviceResponse.model_validate(device)


@router.patch("/devices/{device_id}", response_model=DeviceResponse)
def patch_device(
    device_id: int,
    payload: DeviceUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    membership: OrganizationMember = Depends(require_org_role("owner", "admin")),
) -> DeviceResponse:
    device = get_device(db, device_id, membership.organization_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    updated = update_device(db, device, payload)
    create_audit_log(
        db,
        organization_id=membership.organization_id,
        event_type="device.updated",
        actor_user_id=user.id,
        source_ip=request.client.host if request.client else None,
        target_type="device",
        target_id=str(device_id),
    )
    db.commit()
    db.refresh(updated)
    return DeviceResponse.model_validate(updated)


@router.get("/devices/{device_id}/status", response_model=DeviceStatusResponse)
def get_device_status(
    device_id: int,
    db: Session = Depends(get_db),
    membership: OrganizationMember = Depends(get_current_membership),
) -> DeviceStatusResponse:
    device = get_device(db, device_id, membership.organization_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    metric = get_latest_metric(db, device_id)
    latest_metric = DeviceMetricResponse.model_validate(metric) if metric else None

    return DeviceStatusResponse(device=DeviceResponse.model_validate(device), latest_metric=latest_metric)


@router.get("/devices/{device_id}/metrics", response_model=list[DeviceMetricResponse])
def get_device_metrics(
    device_id: int,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    from_ts: datetime | None = Query(default=None),
    to_ts: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    membership: OrganizationMember = Depends(get_current_membership),
) -> list[DeviceMetricResponse]:
    device = get_device(db, device_id, membership.organization_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    metrics = list_device_metrics(db, device_id, offset=offset, limit=limit, from_dt=from_ts, to_dt=to_ts)
    return [DeviceMetricResponse.model_validate(m) for m in metrics]
