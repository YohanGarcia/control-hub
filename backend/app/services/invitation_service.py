import secrets
from datetime import datetime, timedelta, timezone
from hashlib import sha256

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.organization_invite import OrganizationInvite
from app.models.organization_member import OrganizationMember


def _hash_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def create_invite(db: Session, *, organization_id: int, created_by_user_id: int, role: str, expires_in_seconds: int) -> tuple[str, OrganizationInvite]:
    token = "invite_" + secrets.token_urlsafe(24)
    row = OrganizationInvite(
        organization_id=organization_id,
        created_by_user_id=created_by_user_id,
        role=role,
        token_hash=_hash_token(token),
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in_seconds),
        used_at=None,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.flush()
    return token, row


def list_invites(db: Session, organization_id: int) -> list[OrganizationInvite]:
    query = select(OrganizationInvite).where(OrganizationInvite.organization_id == organization_id).order_by(OrganizationInvite.id.desc())
    return list(db.scalars(query))


def revoke_invite(db: Session, organization_id: int, invite_id: int) -> OrganizationInvite:
    row = db.scalar(select(OrganizationInvite).where(OrganizationInvite.id == invite_id, OrganizationInvite.organization_id == organization_id))
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    if row.used_at is None:
        row.used_at = datetime.now(timezone.utc)
    return row


def accept_invite(db: Session, *, user_id: int, token: str) -> OrganizationMember:
    row = db.scalar(select(OrganizationInvite).where(OrganizationInvite.token_hash == _hash_token(token)))
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    if row.used_at is not None or row.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite expired or already used")

    existing = db.scalar(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == row.organization_id,
            OrganizationMember.user_id == user_id,
        )
    )
    now = datetime.now(timezone.utc)
    if existing:
        existing.status = "active"
        existing.role = row.role
        existing.updated_at = now
        membership = existing
    else:
        membership = OrganizationMember(
            organization_id=row.organization_id,
            user_id=user_id,
            role=row.role,
            status="active",
            created_at=now,
            updated_at=now,
        )
        db.add(membership)

    row.used_at = now
    return membership
