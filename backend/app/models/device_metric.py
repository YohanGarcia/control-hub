from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class DeviceMetric(Base):
    __tablename__ = "device_metrics"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), nullable=False, index=True)
    cpu_percent: Mapped[float] = mapped_column(Float, nullable=False)
    ram_percent: Mapped[float] = mapped_column(Float, nullable=False)
    disk_percent: Mapped[float] = mapped_column(Float, nullable=False)
    cpu_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    cpu_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    ram_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    ram_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    disk_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    disk_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    sample_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    window_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    uptime_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )
