from sqlalchemy.orm import Session

from app.models.audit import AuditLog


def create_audit_log(
    db: Session,
    *,
    organization_id: int | None = None,
    event_type: str,
    actor_user_id: int | None = None,
    source_ip: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    details: str | None = None,
) -> None:
    log = AuditLog(
        organization_id=organization_id,
        event_type=event_type,
        actor_user_id=actor_user_id,
        source_ip=source_ip,
        target_type=target_type,
        target_id=target_id,
        details=details,
    )
    db.add(log)
