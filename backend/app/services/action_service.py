import json
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.action_catalog import ActionCatalog
from app.models.action_run import ActionRun
from app.models.device import Device
from app.models.user import User


def validate_action_params(action_slug: str, params: dict) -> dict:
    if action_slug == "restart_service":
        service_name = params.get("service_name")
        if not isinstance(service_name, str) or not service_name.strip():
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="service_name is required")
        return {"service_name": service_name.strip()}

    if action_slug in {
        "update_system",
        "run_backup",
        "cleanup_tmp",
        "check_docker",
        "list_files",
        "agent_service_status",
        "agent_service_start",
        "agent_service_stop",
        "agent_service_restart",
    }:
        if params:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="This action does not accept params")
        return {}

    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unsupported action slug")


def list_actions_for_host(db: Session, host_type: str) -> list[ActionCatalog]:
    query = select(ActionCatalog).where(ActionCatalog.host_type == host_type, ActionCatalog.is_active.is_(True))
    return list(db.scalars(query))


def get_action(db: Session, action_id: int) -> ActionCatalog | None:
    return db.get(ActionCatalog, action_id)


def create_action_run(db: Session, *, device: Device, action: ActionCatalog, user: User, params: dict) -> ActionRun:
    run = ActionRun(
        request_id=uuid4().hex,
        organization_id=device.organization_id,
        device_id=device.id,
        action_id=action.id,
        requested_by_user_id=user.id,
        status="queued",
        params_json=json.dumps(params),
        created_at=datetime.now(timezone.utc),
    )
    db.add(run)
    db.flush()
    return run


def mark_run_dispatched(run: ActionRun) -> None:
    run.status = "running"
    run.started_at = datetime.now(timezone.utc)


def mark_run_result(
    run: ActionRun,
    *,
    status: str,
    exit_code: int | None,
    output_text: str | None,
    error_text: str | None,
) -> None:
    run.status = status
    run.exit_code = exit_code
    run.output_text = output_text
    run.error_text = error_text
    run.finished_at = datetime.now(timezone.utc)


def get_run_by_request_id(db: Session, request_id: str) -> ActionRun | None:
    return db.scalar(select(ActionRun).where(ActionRun.request_id == request_id))


def get_run(db: Session, run_id: int, organization_id: int | None = None) -> ActionRun | None:
    if organization_id is None:
        return db.get(ActionRun, run_id)
    query = select(ActionRun).where(ActionRun.id == run_id, ActionRun.organization_id == organization_id)
    return db.scalar(query)


def list_device_runs(db: Session, device_id: int, organization_id: int) -> list[ActionRun]:
    query = (
        select(ActionRun)
        .where(ActionRun.device_id == device_id, ActionRun.organization_id == organization_id)
        .order_by(ActionRun.created_at.desc())
    )
    return list(db.scalars(query))
