from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.organization import Organization
from app.models.organization_member import OrganizationMember
from app.models.user import User


def list_user_memberships(db: Session, user_id: int) -> list[OrganizationMember]:
    query = (
        select(OrganizationMember)
        .where(OrganizationMember.user_id == user_id, OrganizationMember.status == "active")
        .order_by(OrganizationMember.id.asc())
    )
    return list(db.scalars(query))


def get_membership(db: Session, user_id: int, organization_id: int) -> OrganizationMember | None:
    query = select(OrganizationMember).where(
        OrganizationMember.user_id == user_id,
        OrganizationMember.organization_id == organization_id,
        OrganizationMember.status == "active",
    )
    return db.scalar(query)


def require_membership_or_403(db: Session, user_id: int, organization_id: int) -> OrganizationMember:
    membership = get_membership(db, user_id, organization_id)
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization access denied")
    return membership


def create_organization_with_owner(db: Session, *, name: str, slug: str, owner: User) -> Organization:
    now = datetime.now(timezone.utc)
    org = Organization(name=name, slug=slug, is_active=True)
    db.add(org)
    db.flush()

    member = OrganizationMember(
        organization_id=org.id,
        user_id=owner.id,
        role="owner",
        status="active",
        created_at=now,
        updated_at=now,
    )
    db.add(member)
    return org
