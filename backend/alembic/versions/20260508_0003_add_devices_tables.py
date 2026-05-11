"""add devices and device metrics tables

Revision ID: 20260508_0003
Revises: 20260508_0002
Create Date: 2026-05-08
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260508_0003"
down_revision: str | None = "20260508_0002"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "devices",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("host_type", sa.String(length=20), nullable=False),
        sa.Column("os_name", sa.String(length=50), nullable=True),
        sa.Column("agent_version", sa.String(length=30), nullable=True),
        sa.Column("is_online", sa.Boolean(), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("agent_key_hash", sa.String(length=255), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], name=op.f("fk_devices_created_by_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_devices")),
    )
    op.create_index(op.f("ix_devices_id"), "devices", ["id"], unique=False)

    op.create_table(
        "device_metrics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("device_id", sa.Integer(), nullable=False),
        sa.Column("cpu_percent", sa.Float(), nullable=False),
        sa.Column("ram_percent", sa.Float(), nullable=False),
        sa.Column("disk_percent", sa.Float(), nullable=False),
        sa.Column("uptime_seconds", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"], name=op.f("fk_device_metrics_device_id_devices")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_device_metrics")),
    )
    op.create_index(op.f("ix_device_metrics_id"), "device_metrics", ["id"], unique=False)
    op.create_index(op.f("ix_device_metrics_device_id"), "device_metrics", ["device_id"], unique=False)
    op.create_index(op.f("ix_device_metrics_created_at"), "device_metrics", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_device_metrics_created_at"), table_name="device_metrics")
    op.drop_index(op.f("ix_device_metrics_device_id"), table_name="device_metrics")
    op.drop_index(op.f("ix_device_metrics_id"), table_name="device_metrics")
    op.drop_table("device_metrics")

    op.drop_index(op.f("ix_devices_id"), table_name="devices")
    op.drop_table("devices")
