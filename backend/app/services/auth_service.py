from datetime import datetime, timedelta, timezone

import pyotp
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import TokenPairResponse


def authenticate_user(db: Session, email: str, password: str, totp_code: str) -> User:
    user = verify_user_credentials(db, email, password)

    if not user.twofa_enabled or not user.twofa_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="2FA is not configured")

    if not pyotp.TOTP(user.twofa_secret).verify(totp_code, valid_window=1):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code")

    return user


def verify_user_credentials(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    return user


def issue_token_pair(db: Session, user: User) -> TokenPairResponse:
    access_token, access_exp = create_access_token(str(user.id))
    refresh_token = create_refresh_token()
    refresh_exp = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)

    db_token = RefreshToken(
        token=refresh_token,
        user_id=user.id,
        expires_at=refresh_exp,
        revoked_at=None,
        created_at=datetime.now(timezone.utc),
    )
    db.add(db_token)

    return TokenPairResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=int((access_exp - datetime.now(timezone.utc)).total_seconds()),
        password_change_required=user.password_change_required,
    )


def rotate_refresh_token(db: Session, raw_token: str) -> tuple[User, TokenPairResponse]:
    token_row = db.scalar(select(RefreshToken).where(RefreshToken.token == raw_token))
    if not token_row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if token_row.revoked_at is not None or token_row.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired or revoked refresh token")

    user = db.get(User, token_row.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    token_row.revoked_at = datetime.now(timezone.utc)
    token_pair = issue_token_pair(db, user)
    return user, token_pair


def revoke_refresh_token(db: Session, raw_token: str) -> None:
    token_row = db.scalar(select(RefreshToken).where(RefreshToken.token == raw_token))
    if not token_row:
        return
    token_row.revoked_at = datetime.now(timezone.utc)


def setup_totp_for_user(db: Session, user: User, issuer: str = "ControlHub") -> tuple[str, str]:
    secret = pyotp.random_base32()
    user.twofa_secret = secret
    user.twofa_enabled = True
    otp_uri = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name=issuer)
    return otp_uri, secret


def change_password(
    db: Session,
    *,
    email: str,
    current_password: str,
    new_password: str,
    totp_code: str | None,
) -> User:
    user = verify_user_credentials(db, email, current_password)

    if user.twofa_enabled:
        if not totp_code or not user.twofa_secret:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="2FA code is required")
        if not pyotp.TOTP(user.twofa_secret).verify(totp_code, valid_window=1):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code")

    if verify_password(new_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different")

    user.password_hash = hash_password(new_password)
    user.password_change_required = False
    return user
