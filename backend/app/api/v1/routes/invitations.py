from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_membership_or_403
from app.db.session import get_db
from app.models.user import User
from app.schemas.invitation import InviteAcceptRequest, InviteCreateRequest, InviteCreateResponse, InviteResponse
from app.services.audit_service import create_audit_log
from app.services.invitation_service import accept_invite, create_invite, list_invites, revoke_invite


router = APIRouter()


@router.post("/organizations/{organization_id}/invites", response_model=InviteCreateResponse, status_code=status.HTTP_201_CREATED)
def post_invite(
    organization_id: int,
    payload: InviteCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> InviteCreateResponse:
    membership = require_membership_or_403(db, user.id, organization_id)
    if membership.role not in {"owner", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient organization permissions")
    token, row = create_invite(
        db,
        organization_id=organization_id,
        created_by_user_id=user.id,
        role=payload.role,
        expires_in_seconds=payload.expires_in_seconds,
    )
    create_audit_log(
        db,
        organization_id=organization_id,
        event_type="invite.created",
        actor_user_id=user.id,
        source_ip=request.client.host if request.client else None,
        target_type="invite",
        target_id=str(row.id),
    )
    db.commit()
    return InviteCreateResponse(id=row.id, token=token, role=row.role, expires_at=row.expires_at)


@router.get("/organizations/{organization_id}/invites", response_model=list[InviteResponse])
def get_invites(
    organization_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[InviteResponse]:
    membership = require_membership_or_403(db, user.id, organization_id)
    if membership.role not in {"owner", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient organization permissions")
    rows = list_invites(db, organization_id)
    return [InviteResponse(id=r.id, role=r.role, expires_at=r.expires_at, used_at=r.used_at, created_at=r.created_at) for r in rows]


@router.delete("/organizations/{organization_id}/invites/{invite_id}")
def delete_invite(
    organization_id: int,
    invite_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    membership = require_membership_or_403(db, user.id, organization_id)
    if membership.role not in {"owner", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient organization permissions")
    row = revoke_invite(db, organization_id, invite_id)
    create_audit_log(
        db,
        organization_id=organization_id,
        event_type="invite.revoked",
        actor_user_id=user.id,
        source_ip=request.client.host if request.client else None,
        target_type="invite",
        target_id=str(row.id),
    )
    db.commit()
    return {"status": "ok"}


@router.post("/organizations/invites/accept")
def post_accept_invite(
    payload: InviteAcceptRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    membership = accept_invite(db, user_id=user.id, token=payload.token)
    create_audit_log(
        db,
        organization_id=membership.organization_id,
        event_type="invite.accepted",
        actor_user_id=user.id,
        source_ip=request.client.host if request.client else None,
        target_type="organization",
        target_id=str(membership.organization_id),
    )
    db.commit()
    return {"status": "ok"}
