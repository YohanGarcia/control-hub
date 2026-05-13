from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_membership
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.organization_member import OrganizationMember
from app.schemas.audit import AuditEventResponse


router = APIRouter()


@router.get("/audit/events", response_model=list[AuditEventResponse])
def get_audit_events(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    membership: OrganizationMember = Depends(get_current_membership),
) -> list[AuditEventResponse]:
    query = (
        select(AuditLog)
        .where(AuditLog.organization_id == membership.organization_id)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = list(db.scalars(query))
    return [AuditEventResponse.model_validate(r) for r in rows]
