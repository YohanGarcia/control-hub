import asyncio

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.action import ActionCatalogResponse, ActionRunRequest, ActionRunResponse
from app.services.action_service import (
    create_action_run,
    get_action,
    get_run,
    list_actions_for_host,
    list_device_runs,
    mark_run_dispatched,
    validate_action_params,
)
from app.services.action_timeout_service import enforce_run_timeout
from app.services.audit_service import create_audit_log
from app.services.device_service import get_device
from app.services.ws_hub import ws_hub


router = APIRouter()


@router.get("/devices/{device_id}/actions", response_model=list[ActionCatalogResponse])
def get_device_actions(
    device_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ActionCatalogResponse]:
    device = get_device(db, device_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return [ActionCatalogResponse.model_validate(a) for a in list_actions_for_host(db, device.host_type)]


@router.post("/devices/{device_id}/actions/{action_id}/run", response_model=ActionRunResponse)
async def run_device_action(
    device_id: int,
    action_id: int,
    payload: ActionRunRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
) -> ActionRunResponse:
    device = get_device(db, device_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    action = get_action(db, action_id)
    if not action or not action.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action not found")

    if action.host_type != device.host_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Action is not compatible with device")

    validated_params = validate_action_params(action.slug, payload.params)

    if not ws_hub.is_agent_connected(device.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Device agent is offline")

    run = create_action_run(db, device=device, action=action, user=user, params=validated_params)
    mark_run_dispatched(run)

    dispatch_payload = {
        "type": "server.action.dispatch",
        "request_id": run.request_id,
        "run_id": run.id,
        "device_id": device.id,
        "action": {
            "id": action.id,
            "slug": action.slug,
            "command_template": action.command_template,
            "timeout_seconds": action.timeout_seconds,
            "max_output_chars": action.max_output_chars,
        },
        "params": validated_params,
    }
    sent = await ws_hub.send_to_agent(device.id, dispatch_payload)
    if not sent:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Device agent is offline")

    create_audit_log(
        db,
        event_type="action.run.dispatched",
        actor_user_id=user.id,
        source_ip=request.client.host if request.client else None,
        target_type="device",
        target_id=str(device.id),
        details=f"run_id={run.id}; action={action.slug}",
    )
    db.commit()
    db.refresh(run)

    asyncio.create_task(enforce_run_timeout(run.id, action.timeout_seconds))

    await ws_hub.broadcast_to_clients(
        {
            "type": "client.action.run.updated",
            "device_id": device.id,
            "run": {
                "id": run.id,
                "request_id": run.request_id,
                "status": run.status,
                "action_id": run.action_id,
                "created_at": run.created_at.isoformat(),
            },
        }
    )
    return ActionRunResponse.model_validate(run)


@router.get("/devices/{device_id}/actions/history", response_model=list[ActionRunResponse])
def get_device_action_history(
    device_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ActionRunResponse]:
    device = get_device(db, device_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return [ActionRunResponse.model_validate(r) for r in list_device_runs(db, device_id)]


@router.get("/runs/{run_id}", response_model=ActionRunResponse)
def get_action_run(
    run_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ActionRunResponse:
    run = get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return ActionRunResponse.model_validate(run)
