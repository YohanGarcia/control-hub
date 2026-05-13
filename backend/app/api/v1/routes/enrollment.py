import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_membership_or_403
from app.db.session import get_db
from app.models.user import User
from app.schemas.enrollment import (
    AgentEnrollRequest,
    AgentEnrollResponse,
    EnrollmentTokenCreateRequest,
    EnrollmentTokenCreateResponse,
    EnrollmentTokenResponse,
)
from app.schemas.device import DeviceCreateRequest
from app.services.audit_service import create_audit_log
from app.services.device_service import create_device
from app.services.enrollment_service import (
    consume_enrollment_token,
    create_enrollment_token,
    list_enrollment_tokens,
    revoke_enrollment_token,
)


router = APIRouter()


@router.post(
    "/organizations/{organization_id}/enrollment-tokens",
    response_model=EnrollmentTokenCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_enrollment_token(
    organization_id: int,
    payload: EnrollmentTokenCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> EnrollmentTokenCreateResponse:
    membership = require_membership_or_403(db, user.id, organization_id)
    if membership.role not in {"owner", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient organization permissions")
    raw, row = create_enrollment_token(
        db,
        organization_id=organization_id,
        created_by_user_id=user.id,
        expires_in_seconds=payload.expires_in_seconds,
        max_uses=payload.max_uses,
    )
    create_audit_log(
        db,
        organization_id=organization_id,
        event_type="enrollment.token.created",
        actor_user_id=user.id,
        source_ip=request.client.host if request.client else None,
        target_type="organization",
        target_id=str(organization_id),
    )
    db.commit()
    return EnrollmentTokenCreateResponse(
        token=raw,
        id=row.id,
        expires_at=row.expires_at,
        max_uses=row.max_uses,
        used_count=row.used_count,
        used_at=row.used_at,
    )


@router.get("/organizations/{organization_id}/enrollment-tokens", response_model=list[EnrollmentTokenResponse])
def get_enrollment_tokens(
    organization_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[EnrollmentTokenResponse]:
    membership = require_membership_or_403(db, user.id, organization_id)
    if membership.role not in {"owner", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient organization permissions")
    rows = list_enrollment_tokens(db, organization_id)
    return [
        EnrollmentTokenResponse(
            id=r.id,
            organization_id=r.organization_id,
            created_by_user_id=r.created_by_user_id,
            expires_at=r.expires_at,
            used_at=r.used_at,
            max_uses=r.max_uses,
            used_count=r.used_count,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.delete("/organizations/{organization_id}/enrollment-tokens/{token_id}")
def delete_enrollment_token(
    organization_id: int,
    token_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    membership = require_membership_or_403(db, user.id, organization_id)
    if membership.role not in {"owner", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient organization permissions")
    row = revoke_enrollment_token(db, organization_id, token_id)
    create_audit_log(
        db,
        organization_id=organization_id,
        event_type="enrollment.token.revoked",
        actor_user_id=user.id,
        source_ip=request.client.host if request.client else None,
        target_type="enrollment_token",
        target_id=str(row.id),
    )
    db.commit()
    return {"status": "ok"}


@router.post("/agent/enroll", response_model=AgentEnrollResponse)
def post_agent_enroll(
    payload: AgentEnrollRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AgentEnrollResponse:
    token_row = consume_enrollment_token(db, payload.token)
    host_type = "ubuntu" if payload.host_type == "linux" else payload.host_type
    agent_key = "controlhub-agent-" + secrets.token_hex(16)

    pseudo_user = db.get(User, token_row.created_by_user_id)
    if not pseudo_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enrollment token owner not found")
    membership = require_membership_or_403(db, pseudo_user.id, token_row.organization_id)

    device = create_device(
        db,
        DeviceCreateRequest(
            name=payload.name,
            host_type=host_type,
            os_name=payload.os_name,
            agent_version=payload.agent_version,
            agent_key=agent_key,
        ),
        pseudo_user,
        membership,
    )
    db.flush()
    create_audit_log(
        db,
        organization_id=token_row.organization_id,
        event_type="device.enrolled",
        actor_user_id=token_row.created_by_user_id,
        source_ip=request.client.host if request.client else None,
        target_type="device",
        target_id=str(device.id),
    )
    db.commit()
    return AgentEnrollResponse(device_id=device.id, agent_key=agent_key, organization_id=token_row.organization_id)
