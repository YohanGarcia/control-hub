from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class DockerContainer(Base):
    __tablename__ = "docker_containers"
    __table_args__ = (UniqueConstraint("device_id", "container_id", name="uq_docker_containers_device_container"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), nullable=False, index=True)
    container_id: Mapped[str] = mapped_column(String(128), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    image: Mapped[str] = mapped_column(String(300), nullable=False)
    image_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    state: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    health: Mapped[str | None] = mapped_column(String(32), nullable=True)
    restart_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ports_json: Mapped[list[dict[str, str | int]] | None] = mapped_column(JSON, nullable=True)
    labels_json: Mapped[dict[str, str] | None] = mapped_column(JSON, nullable=True)
    networks_json: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    mounts_json: Mapped[list[dict[str, str | bool]] | None] = mapped_column(JSON, nullable=True)
    command: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at_container: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at_container: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    is_present: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
