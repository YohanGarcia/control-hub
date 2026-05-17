from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.api.deps import get_user_from_access_token
from app.db.session import SessionLocal
from app.schemas.ws_messages import (
    AgentAiDeltaMessage,
    AgentAiDoneMessage,
    AgentAiErrorMessage,
    AgentAiPtyReadyMessage,
    AgentActionResultMessage,
    AgentDockerSnapshotMessage,
    AgentHeartbeatMessage,
    AgentMetricsMessage,
    AgentTerminalExitMessage,
    AgentTerminalOutputMessage,
    ClientAiMessage,
    ClientAiStartMessage,
    ClientAiStopMessage,
    ClientTerminalInputMessage,
    ClientTerminalStartMessage,
    ClientTerminalStopMessage,
)
from app.services.action_service import get_run_by_request_id, mark_run_result
from app.services.agent_security_service import assert_nonce_unused, verify_handshake_signature
from app.services.audit_service import create_audit_log
from app.services.device_service import get_device, register_heartbeat, store_device_metric, verify_agent_key
from app.services.docker_service import apply_docker_snapshot
from app.services.organization_service import list_user_memberships, require_membership_or_403
from app.services.ws_hub import ws_hub


router = APIRouter()


@dataclass
class TerminalSession:
    session_id: str
    device_id: int
    user_id: int
    client_ws: WebSocket


terminal_sessions: dict[str, TerminalSession] = {}


@dataclass
class AiSession:
    session_id: str
    device_id: int
    user_id: int
    provider: str
    mode: str
    client_ws: WebSocket


ai_sessions: dict[str, AiSession] = {}


@dataclass
class MetricWindow:
    started_at: datetime
    cpu_values: list[float]
    ram_values: list[float]
    disk_values: list[float]
    net_recv_values: list[float]
    net_sent_values: list[float]
    cpu_per_core_values: list[list[float]]
    load_avg_1_values: list[float]
    load_avg_5_values: list[float]
    load_avg_15_values: list[float]
    last_temps: list[dict[str, float | str]] | None
    last_disk_mounts: list[dict[str, float | str]] | None
    last_uptime_seconds: float


metric_windows: dict[int, MetricWindow] = {}
METRIC_PERSIST_WINDOW_SECONDS = 5


def _flush_metric_window(db, device, device_id: int) -> None:
    window = metric_windows.get(device_id)
    if not window or not window.cpu_values:
        return

    sample_count = len(window.cpu_values)
    cpu_per_core_avg = None
    if window.cpu_per_core_values:
        max_len = max(len(v) for v in window.cpu_per_core_values)
        cpu_per_core_avg = []
        for i in range(max_len):
            values = [sample[i] for sample in window.cpu_per_core_values if len(sample) > i]
            if values:
                cpu_per_core_avg.append(sum(values) / len(values))

    store_device_metric(
        db,
        device=device,
        cpu_percent=sum(window.cpu_values) / sample_count,
        ram_percent=sum(window.ram_values) / sample_count,
        disk_percent=sum(window.disk_values) / sample_count,
        uptime_seconds=window.last_uptime_seconds,
        cpu_min=min(window.cpu_values),
        cpu_max=max(window.cpu_values),
        ram_min=min(window.ram_values),
        ram_max=max(window.ram_values),
        disk_min=min(window.disk_values),
        disk_max=max(window.disk_values),
        sample_count=sample_count,
        window_seconds=METRIC_PERSIST_WINDOW_SECONDS,
        net_bytes_recv=(sum(window.net_recv_values) / len(window.net_recv_values)) if window.net_recv_values else None,
        net_bytes_sent=(sum(window.net_sent_values) / len(window.net_sent_values)) if window.net_sent_values else None,
        cpu_per_core=cpu_per_core_avg,
        load_avg_1=(sum(window.load_avg_1_values) / len(window.load_avg_1_values)) if window.load_avg_1_values else None,
        load_avg_5=(sum(window.load_avg_5_values) / len(window.load_avg_5_values)) if window.load_avg_5_values else None,
        load_avg_15=(sum(window.load_avg_15_values) / len(window.load_avg_15_values)) if window.load_avg_15_values else None,
        temps=window.last_temps,
        disk_mounts=window.last_disk_mounts,
    )
    metric_windows.pop(device_id, None)


@router.websocket("/ws/client")
async def ws_client(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return

    db = SessionLocal()
    try:
        user = get_user_from_access_token(token, db)
        role_name = user.role.name if user.role else ""
        user_id = user.id
        org_id_raw = websocket.query_params.get("organization_id")
        if org_id_raw:
            try:
                active_org_id = int(org_id_raw)
            except ValueError:
                db.close()
                await websocket.close(code=4400)
                return
            require_membership_or_403(db, user_id, active_org_id)
        else:
            memberships = list_user_memberships(db, user_id)
            if not memberships:
                db.close()
                await websocket.close(code=4403)
                return
            active_org_id = memberships[0].organization_id
    except Exception as exc:
        db.close()
        print(f"WS auth failed: {exc}")
        await websocket.close(code=4401)
        return
    finally:
        db.close()

    await ws_hub.connect_client(websocket)
    try:
        while True:
            raw = await websocket.receive_json()
            msg_type = raw.get("type")
            if msg_type == "client.terminal.start":
                if role_name != "admin":
                    await websocket.send_json({"type": "server.error", "detail": "Terminal requires admin role"})
                    continue
                msg = ClientTerminalStartMessage.model_validate(raw)
                db = SessionLocal()
                device = get_device(db, msg.data.device_id, active_org_id)
                db.close()
                if not device:
                    await websocket.send_json({"type": "server.error", "detail": "Device not found"})
                    continue
                if not ws_hub.is_agent_connected(msg.data.device_id):
                    await websocket.send_json({"type": "server.error", "detail": "Device agent is offline"})
                    continue
                session_id = uuid4().hex
                terminal_sessions[session_id] = TerminalSession(
                    session_id=session_id,
                    device_id=msg.data.device_id,
                    user_id=user_id,
                    client_ws=websocket,
                )
                sent = await ws_hub.send_to_agent(
                    msg.data.device_id,
                    {
                        "type": "server.terminal.start",
                        "data": {
                            "session_id": session_id,
                            "shell": msg.data.shell or "default",
                        },
                    },
                )
                if not sent:
                    terminal_sessions.pop(session_id, None)
                    await websocket.send_json({"type": "server.error", "detail": "Failed to start terminal on agent"})
                    continue
                await websocket.send_json(
                    {
                        "type": "server.terminal.started",
                        "device_id": msg.data.device_id,
                        "data": {"session_id": session_id},
                    }
                )
                db = SessionLocal()
                create_audit_log(
                    db,
                    organization_id=active_org_id,
                    event_type="terminal.session.started",
                    actor_user_id=user_id,
                    target_type="device",
                    target_id=str(msg.data.device_id),
                    details=f"session_id={session_id}",
                )
                db.commit()
                db.close()
            elif msg_type == "client.terminal.input":
                msg = ClientTerminalInputMessage.model_validate(raw)
                session = terminal_sessions.get(msg.data.session_id)
                if not session:
                    await websocket.send_json({"type": "server.error", "detail": "Unknown terminal session"})
                    continue
                if session.client_ws is not websocket:
                    await websocket.send_json({"type": "server.error", "detail": "Terminal session owner mismatch"})
                    continue
                await ws_hub.send_to_agent(
                    session.device_id,
                    {
                        "type": "server.terminal.input",
                        "data": {
                            "session_id": session.session_id,
                            "input": msg.data.input,
                        },
                    },
                )
            elif msg_type == "client.terminal.stop":
                msg = ClientTerminalStopMessage.model_validate(raw)
                session = terminal_sessions.get(msg.data.session_id)
                if not session:
                    await websocket.send_json({"type": "server.error", "detail": "Unknown terminal session"})
                    continue
                await ws_hub.send_to_agent(
                    session.device_id,
                    {
                        "type": "server.terminal.stop",
                        "data": {
                            "session_id": session.session_id,
                        },
                    },
                )
                terminal_sessions.pop(session.session_id, None)
                await websocket.send_json({"type": "server.terminal.stopped", "data": {"session_id": msg.data.session_id}})
                db = SessionLocal()
                create_audit_log(
                    db,
                    organization_id=active_org_id,
                    event_type="terminal.session.stopped",
                    actor_user_id=user_id,
                    target_type="device",
                    target_id=str(session.device_id),
                    details=f"session_id={session.session_id}",
                )
                db.commit()
                db.close()
            elif msg_type == "client.ai.start":
                if role_name != "admin":
                    await websocket.send_json({"type": "server.error", "detail": "AI requires admin role"})
                    continue
                msg = ClientAiStartMessage.model_validate(raw)
                db = SessionLocal()
                device = get_device(db, msg.data.device_id, active_org_id)
                db.close()
                if not device:
                    await websocket.send_json({"type": "server.error", "detail": "Device not found"})
                    continue
                if not ws_hub.is_agent_connected(msg.data.device_id):
                    await websocket.send_json({"type": "server.error", "detail": "Device agent is offline"})
                    continue
                session_id = uuid4().hex
                ai_sessions[session_id] = AiSession(
                    session_id=session_id,
                    device_id=msg.data.device_id,
                    user_id=user_id,
                    provider=msg.data.provider,
                    mode=msg.data.mode,
                    client_ws=websocket,
                )
                if msg.data.mode == "pty":
                    sent = await ws_hub.send_to_agent(
                        msg.data.device_id,
                        {
                            "type": "server.ai.pty.start",
                            "data": {
                                "session_id": session_id,
                                "provider": msg.data.provider,
                            },
                        },
                    )
                    if not sent:
                        ai_sessions.pop(session_id, None)
                        await websocket.send_json({"type": "server.error", "detail": "Failed to start AI PTY on agent"})
                        continue
                await websocket.send_json(
                    {
                        "type": "server.ai.started",
                        "device_id": msg.data.device_id,
                        "data": {"session_id": session_id, "provider": msg.data.provider, "mode": msg.data.mode},
                    }
                )
                db = SessionLocal()
                create_audit_log(
                    db,
                    organization_id=active_org_id,
                    event_type="ai.session.started",
                    actor_user_id=user_id,
                    target_type="device",
                    target_id=str(msg.data.device_id),
                    details=f"session_id={session_id}; provider={msg.data.provider}; mode={msg.data.mode}",
                )
                db.commit()
                db.close()
            elif msg_type == "client.ai.message":
                msg = ClientAiMessage.model_validate(raw)
                session = ai_sessions.get(msg.data.session_id)
                if not session:
                    await websocket.send_json({"type": "server.error", "detail": "Unknown AI session"})
                    continue
                if session.client_ws is not websocket:
                    await websocket.send_json({"type": "server.error", "detail": "AI session owner mismatch"})
                    continue
                payload_type = "server.ai.run" if session.mode == "oneshot" else "server.ai.pty.input"
                sent = await ws_hub.send_to_agent(
                    session.device_id,
                    {
                        "type": payload_type,
                        "data": {
                            "session_id": session.session_id,
                            "provider": session.provider,
                            "prompt": msg.data.text,
                            "input": f"{msg.data.text}\n",
                        },
                    },
                )
                if not sent:
                    await websocket.send_json({"type": "server.error", "detail": "Failed to dispatch AI request"})
            elif msg_type == "client.ai.stop":
                msg = ClientAiStopMessage.model_validate(raw)
                session = ai_sessions.pop(msg.data.session_id, None)
                if not session:
                    await websocket.send_json({"type": "server.error", "detail": "Unknown AI session"})
                    continue
                await ws_hub.send_to_agent(
                    session.device_id,
                    {
                        "type": "server.ai.pty.stop" if session.mode == "pty" else "server.ai.stop",
                        "data": {"session_id": session.session_id},
                    },
                )
                await websocket.send_json({"type": "server.ai.stopped", "data": {"session_id": msg.data.session_id}})
                db = SessionLocal()
                create_audit_log(
                    db,
                    organization_id=active_org_id,
                    event_type="ai.session.stopped",
                    actor_user_id=user_id,
                    target_type="device",
                    target_id=str(session.device_id),
                    details=f"session_id={session.session_id}",
                )
                db.commit()
                db.close()
    except WebSocketDisconnect:
        stale = [sid for sid, session in terminal_sessions.items() if session.client_ws is websocket]
        for sid in stale:
            session = terminal_sessions.pop(sid)
            await ws_hub.send_to_agent(
                session.device_id,
                {
                    "type": "server.terminal.stop",
                    "data": {"session_id": sid},
                },
            )
        stale_ai = [sid for sid, session in ai_sessions.items() if session.client_ws is websocket]
        for sid in stale_ai:
            session = ai_sessions.pop(sid)
            await ws_hub.send_to_agent(
                session.device_id,
                {
                    "type": "server.ai.pty.stop" if session.mode == "pty" else "server.ai.stop",
                    "data": {"session_id": sid},
                },
            )
        ws_hub.disconnect_client(websocket)


@router.websocket("/ws/agent")
async def ws_agent(websocket: WebSocket) -> None:
    device_id_raw = websocket.query_params.get("device_id")
    agent_key = websocket.query_params.get("agent_key")
    ts_raw = websocket.query_params.get("ts")
    nonce = websocket.query_params.get("nonce")
    signature = websocket.query_params.get("sig")
    if not device_id_raw or not agent_key or not ts_raw or not nonce or not signature:
        await websocket.close(code=4401)
        return

    try:
        device_id = int(device_id_raw)
        ts = int(ts_raw)
    except ValueError:
        await websocket.close(code=4400)
        return

    try:
        verify_handshake_signature(device_id=device_id, agent_key=agent_key, timestamp=ts, nonce=nonce, signature=signature)
        assert_nonce_unused(device_id=device_id, nonce=nonce)
    except HTTPException:
        await websocket.close(code=4401)
        return

    db = SessionLocal()
    device = get_device(db, device_id)
    if not device or not verify_agent_key(device, agent_key):
        db.close()
        await websocket.close(code=4401)
        return

    register_heartbeat(device)
    create_audit_log(
        db,
        organization_id=device.organization_id,
        event_type="agent.ws.connected",
        target_type="device",
        target_id=str(device.id),
    )
    db.commit()
    db.close()

    await ws_hub.connect_agent(device_id, websocket)
    await ws_hub.broadcast_to_clients(
        {
            "type": "client.device.status.updated",
            "device_id": device_id,
            "is_online": True,
        }
    )

    try:
        while True:
            raw = await websocket.receive_json()
            db = SessionLocal()
            device = get_device(db, device_id)
            if not device:
                db.close()
                await websocket.close(code=4404)
                break

            msg_type = raw.get("type")
            try:
                if msg_type == "agent.heartbeat":
                    AgentHeartbeatMessage.model_validate(raw)
                    register_heartbeat(device)
                    db.commit()
                    await ws_hub.broadcast_to_clients(
                        {
                            "type": "client.device.status.updated",
                            "device_id": device_id,
                            "is_online": True,
                        }
                    )
                    await websocket.send_json({"type": "server.ack", "event": "agent.heartbeat"})
                elif msg_type == "agent.metrics.push":
                    msg = AgentMetricsMessage.model_validate(raw)
                    now = datetime.now(timezone.utc)
                    window = metric_windows.get(device_id)
                    if not window:
                        window = MetricWindow(
                            started_at=now,
                            cpu_values=[],
                            ram_values=[],
                            disk_values=[],
                            net_recv_values=[],
                            net_sent_values=[],
                            cpu_per_core_values=[],
                            load_avg_1_values=[],
                            load_avg_5_values=[],
                            load_avg_15_values=[],
                            last_temps=None,
                            last_disk_mounts=None,
                            last_uptime_seconds=msg.data.uptime_seconds,
                        )
                        metric_windows[device_id] = window

                    window.cpu_values.append(msg.data.cpu_percent)
                    window.ram_values.append(msg.data.ram_percent)
                    window.disk_values.append(msg.data.disk_percent)
                    if msg.data.net_bytes_recv is not None:
                        window.net_recv_values.append(msg.data.net_bytes_recv)
                    if msg.data.net_bytes_sent is not None:
                        window.net_sent_values.append(msg.data.net_bytes_sent)
                    if msg.data.cpu_per_core:
                        window.cpu_per_core_values.append(msg.data.cpu_per_core)
                    if msg.data.load_avg_1 is not None:
                        window.load_avg_1_values.append(msg.data.load_avg_1)
                    if msg.data.load_avg_5 is not None:
                        window.load_avg_5_values.append(msg.data.load_avg_5)
                    if msg.data.load_avg_15 is not None:
                        window.load_avg_15_values.append(msg.data.load_avg_15)
                    if msg.data.temps is not None:
                        window.last_temps = msg.data.temps
                    if msg.data.disk_mounts is not None:
                        window.last_disk_mounts = msg.data.disk_mounts
                    window.last_uptime_seconds = msg.data.uptime_seconds

                    if (now - window.started_at).total_seconds() >= METRIC_PERSIST_WINDOW_SECONDS:
                        _flush_metric_window(db, device, device_id)
                        db.commit()

                    await ws_hub.broadcast_to_clients(
                        {
                            "type": "client.device.metric.updated",
                            "device_id": device_id,
                            "metric": {
                                "cpu_percent": msg.data.cpu_percent,
                                "ram_percent": msg.data.ram_percent,
                                "disk_percent": msg.data.disk_percent,
                                "net_bytes_recv": msg.data.net_bytes_recv,
                                "net_bytes_sent": msg.data.net_bytes_sent,
                                "cpu_per_core": msg.data.cpu_per_core,
                                "load_avg_1": msg.data.load_avg_1,
                                "load_avg_5": msg.data.load_avg_5,
                                "load_avg_15": msg.data.load_avg_15,
                                "temps": msg.data.temps,
                                "disk_mounts": msg.data.disk_mounts,
                                "uptime_seconds": msg.data.uptime_seconds,
                                "created_at": now.isoformat(),
                            },
                        }
                    )
                    await websocket.send_json({"type": "server.ack", "event": "agent.metrics.push"})
                elif msg_type == "agent.action.result":
                    msg = AgentActionResultMessage.model_validate(raw)
                    run = get_run_by_request_id(db, msg.data.request_id)
                    if not run:
                        await websocket.send_json({"type": "server.error", "detail": "Unknown request_id"})
                    elif run.device_id != device_id:
                        await websocket.send_json({"type": "server.error", "detail": "request_id does not belong to device"})
                    else:
                        mark_run_result(
                            run,
                            status=msg.data.status,
                            exit_code=msg.data.exit_code,
                            output_text=msg.data.output_text,
                            error_text=msg.data.error_text,
                        )
                        db.commit()
                        await ws_hub.broadcast_to_clients(
                            {
                                "type": "client.action.run.updated",
                                "device_id": run.device_id,
                                "run": {
                                    "id": run.id,
                                    "request_id": run.request_id,
                                    "status": run.status,
                                    "exit_code": run.exit_code,
                                    "output_text": run.output_text,
                                    "error_text": run.error_text,
                                    "finished_at": run.finished_at.isoformat() if run.finished_at else None,
                                },
                            }
                        )
                        await websocket.send_json({"type": "server.ack", "event": "agent.action.result"})
                elif msg_type == "agent.docker.snapshot.push":
                    msg = AgentDockerSnapshotMessage.model_validate(raw)
                    emitted = apply_docker_snapshot(
                        db,
                        device=device,
                        containers=[c.model_dump() for c in msg.data.containers],
                    )
                    db.commit()
                    for event in emitted:
                        await ws_hub.broadcast_to_clients(event)
                    await websocket.send_json(
                        {
                            "type": "server.ack",
                            "event": "agent.docker.snapshot.push",
                            "data": {
                                "containers_received": len(msg.data.containers),
                                "changes_detected": len(emitted),
                            },
                        }
                    )
                elif msg_type == "agent.terminal.output":
                    msg = AgentTerminalOutputMessage.model_validate(raw)
                    session = terminal_sessions.get(msg.data.session_id)
                    if not session:
                        await websocket.send_json({"type": "server.error", "detail": "Unknown terminal session"})
                    elif session.device_id != device_id:
                        await websocket.send_json({"type": "server.error", "detail": "terminal session device mismatch"})
                    else:
                        await session.client_ws.send_json(
                            {
                                "type": "client.terminal.output",
                                "device_id": device_id,
                                "data": {
                                    "session_id": session.session_id,
                                    "stream": msg.data.stream,
                                    "chunk": msg.data.chunk,
                                },
                            }
                        )
                        await websocket.send_json({"type": "server.ack", "event": "agent.terminal.output"})
                elif msg_type == "agent.terminal.exit":
                    msg = AgentTerminalExitMessage.model_validate(raw)
                    session = terminal_sessions.pop(msg.data.session_id, None)
                    if not session:
                        await websocket.send_json({"type": "server.error", "detail": "Unknown terminal session"})
                    elif session.device_id != device_id:
                        await websocket.send_json({"type": "server.error", "detail": "terminal session device mismatch"})
                    else:
                        await session.client_ws.send_json(
                            {
                                "type": "client.terminal.exit",
                                "device_id": device_id,
                                "data": {
                                    "session_id": msg.data.session_id,
                                    "exit_code": msg.data.exit_code,
                                },
                            }
                        )
                        await websocket.send_json({"type": "server.ack", "event": "agent.terminal.exit"})
                elif msg_type == "agent.ai.delta":
                    msg = AgentAiDeltaMessage.model_validate(raw)
                    session = ai_sessions.get(msg.data.session_id)
                    if not session:
                        await websocket.send_json({"type": "server.error", "detail": "Unknown AI session"})
                    elif session.device_id != device_id:
                        await websocket.send_json({"type": "server.error", "detail": "AI session device mismatch"})
                    else:
                        await session.client_ws.send_json(
                            {
                                "type": "server.ai.delta",
                                "device_id": device_id,
                                "data": {
                                    "session_id": session.session_id,
                                    "chunk": msg.data.chunk,
                                    "seq": msg.data.seq,
                                },
                            }
                        )
                elif msg_type == "agent.ai.done":
                    msg = AgentAiDoneMessage.model_validate(raw)
                    session = ai_sessions.get(msg.data.session_id)
                    if not session:
                        await websocket.send_json({"type": "server.error", "detail": "Unknown AI session"})
                    elif session.device_id != device_id:
                        await websocket.send_json({"type": "server.error", "detail": "AI session device mismatch"})
                    else:
                        await session.client_ws.send_json(
                            {
                                "type": "server.ai.done",
                                "device_id": device_id,
                                "data": {
                                    "session_id": session.session_id,
                                    "exit_code": msg.data.exit_code,
                                },
                            }
                        )
                elif msg_type == "agent.ai.error":
                    msg = AgentAiErrorMessage.model_validate(raw)
                    session = ai_sessions.get(msg.data.session_id)
                    if not session:
                        await websocket.send_json({"type": "server.error", "detail": "Unknown AI session"})
                    elif session.device_id != device_id:
                        await websocket.send_json({"type": "server.error", "detail": "AI session device mismatch"})
                    else:
                        await session.client_ws.send_json(
                            {
                                "type": "server.ai.error",
                                "device_id": device_id,
                                "data": {
                                    "session_id": session.session_id,
                                    "detail": msg.data.detail,
                                },
                            }
                        )
                elif msg_type == "agent.ai.pty.ready":
                    msg = AgentAiPtyReadyMessage.model_validate(raw)
                    session = ai_sessions.get(msg.data.session_id)
                    if session and session.device_id == device_id:
                        await session.client_ws.send_json(
                            {
                                "type": "server.ai.pty.ready",
                                "device_id": device_id,
                                "data": {"session_id": session.session_id},
                            }
                        )
                else:
                    await websocket.send_json({"type": "server.error", "detail": "Unsupported message type"})
            except ValidationError as exc:
                await websocket.send_json({"type": "server.error", "detail": str(exc)})
            finally:
                db.close()
    except WebSocketDisconnect:
        db = SessionLocal()
        device = get_device(db, device_id)
        if device:
            _flush_metric_window(db, device, device_id)
            db.commit()
        db.close()

        ws_hub.disconnect_agent(device_id)
        db = SessionLocal()
        device = get_device(db, device_id)
        if device:
            device.is_online = False
            create_audit_log(
                db,
                organization_id=device.organization_id,
                event_type="agent.ws.disconnected",
                target_type="device",
                target_id=str(device.id),
            )
            db.commit()
        db.close()
        await ws_hub.broadcast_to_clients(
            {
                "type": "client.device.status.updated",
                "device_id": device_id,
                "is_online": False,
            }
        )
    AgentAiPtyReadyMessage,
