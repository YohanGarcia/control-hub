import secrets
from datetime import datetime, timedelta, timezone
from hashlib import sha256

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enrollment_token import EnrollmentToken


def _hash_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def create_enrollment_token(
    db: Session,
    *,
    organization_id: int,
    created_by_user_id: int,
    expires_in_seconds: int,
    max_uses: int,
) -> tuple[str, EnrollmentToken]:
    raw = "enroll_" + secrets.token_urlsafe(24)
    row = EnrollmentToken(
        organization_id=organization_id,
        created_by_user_id=created_by_user_id,
        token_hash=_hash_token(raw),
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in_seconds),
        used_at=None,
        max_uses=max_uses,
        used_count=0,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.flush()
    return raw, row


def consume_enrollment_token(db: Session, token: str) -> EnrollmentToken:
    row = db.scalar(select(EnrollmentToken).where(EnrollmentToken.token_hash == _hash_token(token)))
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid enrollment token")

    now = datetime.now(timezone.utc)
    if row.expires_at <= now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Enrollment token expired")
    if row.used_count >= row.max_uses:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Enrollment token already used")

    row.used_count += 1
    if row.used_count >= row.max_uses:
        row.used_at = now
    return row


def list_enrollment_tokens(db: Session, organization_id: int) -> list[EnrollmentToken]:
    query = (
        select(EnrollmentToken)
        .where(EnrollmentToken.organization_id == organization_id)
        .order_by(EnrollmentToken.id.desc())
    )
    return list(db.scalars(query))


def revoke_enrollment_token(db: Session, organization_id: int, token_id: int) -> EnrollmentToken:
    query = select(EnrollmentToken).where(
        EnrollmentToken.id == token_id,
        EnrollmentToken.organization_id == organization_id,
    )
    row = db.scalar(query)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment token not found")
    if row.used_count < row.max_uses:
        row.used_count = row.max_uses
        row.used_at = datetime.now(timezone.utc)
    return row
