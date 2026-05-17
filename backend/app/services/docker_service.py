from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.device import Device
from app.models.docker_container import DockerContainer
from app.models.docker_container_event import DockerContainerEvent


def _as_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _event(db: Session, *, device_id: int, container_id: str, event_type: str, severity: str, summary: str, payload: dict) -> None:
    db.add(
        DockerContainerEvent(
            device_id=device_id,
            container_id=container_id,
            event_type=event_type,
            severity=severity,
            summary=summary,
            payload_json=payload,
            created_at=datetime.now(timezone.utc),
        )
    )


def apply_docker_snapshot(db: Session, *, device: Device, containers: list[dict]) -> list[dict]:
    now = datetime.now(timezone.utc)
    existing = {
        c.container_id: c
        for c in db.scalars(select(DockerContainer).where(DockerContainer.device_id == device.id))
    }
    seen: set[str] = set()
    emitted: list[dict] = []

    for item in containers:
        container_id = str(item.get("container_id") or "").strip()
        if not container_id:
            continue
        seen.add(container_id)

        state = str(item.get("state") or item.get("status") or "unknown")[:32]
        health = item.get("health")
        restart_count = int(item.get("restart_count") or 0)
        payload = {
            "container_id": container_id,
            "name": str(item.get("name") or container_id[:12]),
            "image": str(item.get("image") or "unknown"),
            "state": state,
            "health": health,
            "restart_count": restart_count,
        }

        row = existing.get(container_id)
        if row is None:
            row = DockerContainer(device_id=device.id, container_id=container_id, name=payload["name"], image=payload["image"], state=state, restart_count=restart_count, last_seen_at=now, updated_at=now)
            db.add(row)
            existing[container_id] = row
            _event(
                db,
                device_id=device.id,
                container_id=container_id,
                event_type="container_detected",
                severity="info",
                summary=f"Container {payload['name']} detected",
                payload=payload,
            )
            emitted.append({"type": "client.docker.event.created", "device_id": device.id, "event_type": "container_detected", "container": payload})
        else:
            if row.state != state:
                _event(
                    db,
                    device_id=device.id,
                    container_id=container_id,
                    event_type="container_state_changed",
                    severity="warn" if state in {"exited", "dead"} else "info",
                    summary=f"Container {payload['name']} state {row.state} -> {state}",
                    payload={"before": row.state, "after": state, **payload},
                )
                emitted.append({"type": "client.docker.event.created", "device_id": device.id, "event_type": "container_state_changed", "container": payload})
            if (row.health or "none") != (health or "none"):
                _event(
                    db,
                    device_id=device.id,
                    container_id=container_id,
                    event_type="container_health_changed",
                    severity="error" if health == "unhealthy" else "info",
                    summary=f"Container {payload['name']} health {row.health or 'none'} -> {health or 'none'}",
                    payload={"before": row.health, "after": health, **payload},
                )
                emitted.append({"type": "client.docker.event.created", "device_id": device.id, "event_type": "container_health_changed", "container": payload})

        row.name = payload["name"]
        row.image = payload["image"]
        row.image_id = item.get("image_id")
        row.state = state
        row.health = health
        row.restart_count = restart_count
        row.ports_json = item.get("ports")
        row.labels_json = item.get("labels")
        row.networks_json = item.get("networks")
        row.mounts_json = item.get("mounts")
        row.command = item.get("command")
        row.created_at_container = _as_dt(item.get("created_at"))
        row.started_at_container = _as_dt(item.get("started_at"))
        row.last_seen_at = now
        row.is_present = True
        row.updated_at = now

        emitted.append(
            {
                "type": "client.docker.container.updated",
                "device_id": device.id,
                "container": {
                    "container_id": row.container_id,
                    "name": row.name,
                    "image": row.image,
                    "state": row.state,
                    "health": row.health,
                    "restart_count": row.restart_count,
                },
            }
        )

    for cid, row in existing.items():
        if cid in seen or not row.is_present:
            continue
        row.is_present = False
        row.updated_at = now
        _event(
            db,
            device_id=device.id,
            container_id=cid,
            event_type="container_missing",
            severity="warn",
            summary=f"Container {row.name} no longer present",
            payload={"container_id": cid, "name": row.name, "image": row.image},
        )
        emitted.append({"type": "client.docker.container.removed", "device_id": device.id, "container_id": cid, "name": row.name})

    return emitted


def list_device_containers(db: Session, *, device_id: int) -> list[DockerContainer]:
    query = (
        select(DockerContainer)
        .where(DockerContainer.device_id == device_id, DockerContainer.is_present.is_(True))
        .order_by(DockerContainer.name.asc())
    )
    return list(db.scalars(query))


def list_device_container_events(db: Session, *, device_id: int, limit: int = 100) -> list[DockerContainerEvent]:
    query = (
        select(DockerContainerEvent)
        .where(DockerContainerEvent.device_id == device_id)
        .order_by(DockerContainerEvent.created_at.desc())
        .limit(limit)
    )
    return list(db.scalars(query))
