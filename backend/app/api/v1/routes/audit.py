from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.audit import AuditEventResponse


router = APIRouter()


@router.get("/audit/events", response_model=list[AuditEventResponse])
def get_audit_events(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin", "observer")),
) -> list[AuditEventResponse]:
    query = select(AuditLog).order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    rows = list(db.scalars(query))
    return [AuditEventResponse.model_validate(r) for r in rows]
