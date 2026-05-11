from sqlalchemy import Boolean, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ActionCatalog(Base, TimestampMixin):
    __tablename__ = "actions_catalog"
    __table_args__ = (UniqueConstraint("slug", "host_type", name="uq_slug_host"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    host_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    command_template: Mapped[str] = mapped_column(Text, nullable=False)
    timeout_seconds: Mapped[int] = mapped_column(Integer, default=120, nullable=False)
    max_output_chars: Mapped[int] = mapped_column(Integer, default=4000, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
