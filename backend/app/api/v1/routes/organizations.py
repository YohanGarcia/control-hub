from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.organization import Organization
from app.models.organization_member import OrganizationMember
from app.models.user import User
from app.schemas.organization import (
    OrganizationCreateRequest,
    OrganizationMemberDetailResponse,
    OrganizationMembershipResponse,
    OrganizationMemberUpdateRequest,
    OrganizationResponse,
)
from app.services.audit_service import create_audit_log
from app.services.organization_service import create_organization_with_owner, list_user_memberships, require_membership_or_403


router = APIRouter()


@router.get("/organizations", response_model=list[OrganizationResponse])
def get_organizations(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[OrganizationResponse]:
    memberships = list_user_memberships(db, user.id)
    if not memberships:
        return []
    org_ids = [m.organization_id for m in memberships]
    rows = list(db.scalars(select(Organization).where(Organization.id.in_(org_ids)).order_by(Organization.id.asc())))
    return [OrganizationResponse.model_validate(r) for r in rows]


@router.get("/organizations/memberships", response_model=list[OrganizationMembershipResponse])
def get_organization_memberships(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[OrganizationMembershipResponse]:
    memberships = list_user_memberships(db, user.id)
    if not memberships:
        return []
    org_ids = [m.organization_id for m in memberships]
    org_rows = list(db.scalars(select(Organization).where(Organization.id.in_(org_ids))))
    org_by_id = {o.id: o for o in org_rows}
    out: list[OrganizationMembershipResponse] = []
    for m in memberships:
        org = org_by_id.get(m.organization_id)
        if org is None:
            continue
        out.append(
            OrganizationMembershipResponse(
                organization_name=org.name,
                organization_slug=org.slug,
                organization_id=m.organization_id,
                role=m.role,
                status=m.status,
            )
        )
    return out


@router.post("/organizations", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def post_organization(
    payload: OrganizationCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> OrganizationResponse:
    existing = db.scalar(select(Organization).where(Organization.slug == payload.slug))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization slug already exists")

    org = create_organization_with_owner(db, name=payload.name, slug=payload.slug, owner=user)
    create_audit_log(
        db,
        organization_id=org.id,
        event_type="organization.created",
        actor_user_id=user.id,
        source_ip=request.client.host if request.client else None,
        target_type="organization",
        target_id=str(org.id),
        details=f"slug={org.slug}",
    )
    db.commit()
    db.refresh(org)
    return OrganizationResponse.model_validate(org)


@router.get("/organizations/{organization_id}/members", response_model=list[OrganizationMemberDetailResponse])
def get_organization_members(
    organization_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[OrganizationMemberDetailResponse]:
    membership = require_membership_or_403(db, user.id, organization_id)
    if membership.role not in {"owner", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient organization permissions")

    rows = list(
        db.execute(
            select(OrganizationMember, User)
            .join(User, User.id == OrganizationMember.user_id)
            .where(OrganizationMember.organization_id == organization_id)
            .order_by(OrganizationMember.id.asc())
        )
    )
    return [
        OrganizationMemberDetailResponse(
            user_id=m.user_id,
            email=u.email,
            full_name=u.full_name,
            role=m.role,
            status=m.status,
        )
        for m, u in rows
    ]


@router.patch("/organizations/{organization_id}/members/{user_id}", response_model=OrganizationMemberDetailResponse)
def patch_organization_member(
    organization_id: int,
    user_id: int,
    payload: OrganizationMemberUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> OrganizationMemberDetailResponse:
    actor_membership = require_membership_or_403(db, actor.id, organization_id)
    if actor_membership.role not in {"owner", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient organization permissions")

    target = db.scalar(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.user_id == user_id,
        )
    )
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if target.user_id == actor.id and payload.role != target.role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes cambiar tu propio rol")

    if target.role == "owner" and payload.role != "owner" and actor_membership.role != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can change owner role")

    if target.role == "owner" and payload.role != "owner":
        owner_count = db.scalar(
            select(func.count())
            .select_from(OrganizationMember)
            .where(
                OrganizationMember.organization_id == organization_id,
                OrganizationMember.role == "owner",
                OrganizationMember.status == "active",
            )
        )
        if owner_count == 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes dejar la organizacion sin owner")

    target.role = payload.role
    db_user = db.get(User, user_id)
    create_audit_log(
        db,
        organization_id=organization_id,
        event_type="organization.member.updated",
        actor_user_id=actor.id,
        source_ip=request.client.host if request.client else None,
        target_type="member",
        target_id=str(user_id),
        details=f"role={payload.role}",
    )
    db.commit()
    return OrganizationMemberDetailResponse(
        user_id=target.user_id,
        email=db_user.email if db_user else "unknown",
        full_name=db_user.full_name if db_user else None,
        role=target.role,
        status=target.status,
    )


@router.delete("/organizations/{organization_id}/members/{user_id}")
def delete_organization_member(
    organization_id: int,
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> dict[str, str]:
    actor_membership = require_membership_or_403(db, actor.id, organization_id)
    if actor_membership.role not in {"owner", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient organization permissions")

    if user_id == actor.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes removerte a ti mismo")

    target = db.scalar(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.status == "active",
        )
    )
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if target.role == "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puedes remover un owner")

    target.status = "inactive"
    create_audit_log(
        db,
        organization_id=organization_id,
        event_type="organization.member.removed",
        actor_user_id=actor.id,
        source_ip=request.client.host if request.client else None,
        target_type="member",
        target_id=str(user_id),
    )
    db.commit()
    return {"status": "ok"}
