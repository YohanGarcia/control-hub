from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import ChangePasswordRequest, LoginRequest, RefreshRequest, Setup2FARequest, Setup2FAResponse, TokenPairResponse
from app.services.audit_service import create_audit_log
from app.services.auth_service import (
    authenticate_user,
    change_password,
    issue_token_pair,
    verify_user_credentials,
    revoke_refresh_token,
    rotate_refresh_token,
    setup_totp_for_user,
)
from app.services.rate_limit_service import enforce_auth_rate_limit
from app.services.rate_limit_service import clear_login_failures, enforce_login_lockout, register_login_failure


router = APIRouter()


@router.post("/login", response_model=TokenPairResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenPairResponse:
    client_ip = request.client.host if request.client else "unknown"
    enforce_auth_rate_limit(client_ip, "login")
    enforce_login_lockout(client_ip, payload.email)
    try:
        user = authenticate_user(db, payload.email, payload.password, payload.totp_code)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            failures, penalty = register_login_failure(client_ip, payload.email)
            create_audit_log(
                db,
                event_type="auth.login.failed",
                source_ip=client_ip,
                details=f"failures={failures}; lock_seconds={penalty}",
            )
            db.commit()
        raise

    if user.password_change_required:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password change required before login",
        )
    clear_login_failures(client_ip, payload.email)
    token_pair = issue_token_pair(db, user)
    create_audit_log(
        db,
        event_type="auth.login.success",
        actor_user_id=user.id,
        source_ip=request.client.host if request.client else None,
    )
    db.commit()
    return token_pair


@router.post("/refresh", response_model=TokenPairResponse)
def refresh(payload: RefreshRequest, request: Request, db: Session = Depends(get_db)) -> TokenPairResponse:
    enforce_auth_rate_limit(request.client.host if request.client else "unknown", "refresh")
    user, token_pair = rotate_refresh_token(db, payload.refresh_token)
    create_audit_log(
        db,
        event_type="auth.refresh.success",
        actor_user_id=user.id,
        source_ip=request.client.host if request.client else None,
    )
    db.commit()
    return token_pair


@router.post("/logout")
def logout(payload: RefreshRequest, request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    enforce_auth_rate_limit(request.client.host if request.client else "unknown", "logout")
    revoke_refresh_token(db, payload.refresh_token)
    create_audit_log(
        db,
        event_type="auth.logout",
        source_ip=request.client.host if request.client else None,
        details="refresh token revoked",
    )
    db.commit()
    return {"status": "ok"}


@router.post("/setup-2fa", response_model=Setup2FAResponse)
def setup_2fa(payload: Setup2FARequest, request: Request, db: Session = Depends(get_db)) -> Setup2FAResponse:
    enforce_auth_rate_limit(request.client.host if request.client else "unknown", "setup_2fa")
    user = verify_user_credentials(db, payload.email, payload.password)

    otp_uri, secret = setup_totp_for_user(db, user)
    create_audit_log(
        db,
        event_type="auth.2fa.setup",
        actor_user_id=user.id,
        source_ip=request.client.host if request.client else None,
    )
    db.commit()
    return Setup2FAResponse(otp_uri=otp_uri, secret=secret)


@router.post("/change-password")
def update_password(payload: ChangePasswordRequest, request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    enforce_auth_rate_limit(request.client.host if request.client else "unknown", "change_password")
    user = change_password(
        db,
        email=payload.email,
        current_password=payload.current_password,
        new_password=payload.new_password,
        totp_code=payload.totp_code,
    )
    create_audit_log(
        db,
        event_type="auth.password.changed",
        actor_user_id=user.id,
        source_ip=request.client.host if request.client else None,
    )
    db.commit()
    return {"status": "ok"}
