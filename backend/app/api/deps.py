import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.organization_member import OrganizationMember
from app.models.user import User
from app.services.organization_service import (
    list_user_memberships,
    require_membership_or_403 as require_membership_or_403_service,
)


bearer_scheme = HTTPBearer(auto_error=True)


def get_user_from_access_token(token: str, db: Session) -> User:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
            leeway=settings.jwt_clock_skew_seconds,
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    if payload.get("type") != "access" or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    return get_user_from_access_token(credentials.credentials, db)


def require_role(*allowed_roles: str):
    def _checker(user: User = Depends(get_current_user)) -> User:
        if user.role is None or user.role.name not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return _checker


def get_current_membership(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_organization_id: int | None = Header(default=None),
) -> OrganizationMember:
    if x_organization_id is not None:
        return require_membership_or_403_service(db, user.id, x_organization_id)

    memberships = list_user_memberships(db, user.id)
    if not memberships:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no active organization")
    return memberships[0]


def require_membership_or_403(db: Session, user_id: int, organization_id: int) -> OrganizationMember:
    return require_membership_or_403_service(db, user_id, organization_id)


def require_org_role(*allowed_roles: str):
    def _checker(membership: OrganizationMember = Depends(get_current_membership)) -> OrganizationMember:
        if membership.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient organization permissions")
        return membership

    return _checker
