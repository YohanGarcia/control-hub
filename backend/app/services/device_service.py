from hashlib import sha256
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.device import Device
from app.models.device_metric import DeviceMetric
from app.models.user import User
from app.schemas.device import DeviceCreateRequest, DeviceUpdateRequest


def _hash_agent_key(agent_key: str) -> str:
    return sha256(agent_key.encode("utf-8")).hexdigest()


def verify_agent_key(device: Device, raw_agent_key: str) -> bool:
    return device.agent_key_hash == _hash_agent_key(raw_agent_key)


def create_device(db: Session, payload: DeviceCreateRequest, user: User) -> Device:
    device = Device(
        name=payload.name,
        host_type=payload.host_type,
        os_name=payload.os_name,
        agent_version=payload.agent_version,
        agent_key_hash=_hash_agent_key(payload.agent_key),
        created_by_user_id=user.id,
    )
    db.add(device)
    return device


def list_devices(db: Session) -> list[Device]:
    return list(db.scalars(select(Device).order_by(Device.id.desc())))


def get_device(db: Session, device_id: int) -> Device | None:
    return db.get(Device, device_id)


def update_device(db: Session, device: Device, payload: DeviceUpdateRequest) -> Device:
    if payload.name is not None:
        device.name = payload.name
    if payload.is_online is not None:
        device.is_online = payload.is_online
    return device


def get_latest_metric(db: Session, device_id: int) -> DeviceMetric | None:
    query = (
        select(DeviceMetric)
        .where(DeviceMetric.device_id == device_id)
        .order_by(DeviceMetric.created_at.desc())
        .limit(1)
    )
    return db.scalar(query)


def list_device_metrics(
    db: Session,
    device_id: int,
    *,
    offset: int,
    limit: int,
    from_dt: datetime | None = None,
    to_dt: datetime | None = None,
) -> list[DeviceMetric]:
    query = select(DeviceMetric).where(DeviceMetric.device_id == device_id)
    if from_dt is not None:
        query = query.where(DeviceMetric.created_at >= from_dt)
    if to_dt is not None:
        query = query.where(DeviceMetric.created_at <= to_dt)

    query = query.order_by(DeviceMetric.created_at.desc()).offset(offset).limit(limit)
    return list(db.scalars(query))


def store_device_metric(
    db: Session,
    *,
    device: Device,
    cpu_percent: float,
    ram_percent: float,
    disk_percent: float,
    uptime_seconds: float,
) -> DeviceMetric:
    metric = DeviceMetric(
        device_id=device.id,
        cpu_percent=cpu_percent,
        ram_percent=ram_percent,
        disk_percent=disk_percent,
        uptime_seconds=uptime_seconds,
    )
    device.is_online = True
    device.last_seen_at = datetime.now(timezone.utc)
    db.add(metric)
    return metric


def register_heartbeat(device: Device) -> None:
    device.is_online = True
    device.last_seen_at = datetime.now(timezone.utc)
