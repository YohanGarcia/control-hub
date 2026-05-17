"""add docker inventory tables

Revision ID: 20260514_0012
Revises: 20260514_0011
Create Date: 2026-05-14 11:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260514_0012"
down_revision: str | None = "20260514_0011"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "docker_containers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("device_id", sa.Integer(), nullable=False),
        sa.Column("container_id", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("image", sa.String(length=300), nullable=False),
        sa.Column("image_id", sa.String(length=200), nullable=True),
        sa.Column("state", sa.String(length=32), nullable=False),
        sa.Column("health", sa.String(length=32), nullable=True),
        sa.Column("restart_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ports_json", sa.JSON(), nullable=True),
        sa.Column("labels_json", sa.JSON(), nullable=True),
        sa.Column("networks_json", sa.JSON(), nullable=True),
        sa.Column("mounts_json", sa.JSON(), nullable=True),
        sa.Column("command", sa.Text(), nullable=True),
        sa.Column("created_at_container", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started_at_container", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_present", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"], name=op.f("fk_docker_containers_device_id_devices")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_docker_containers")),
        sa.UniqueConstraint("device_id", "container_id", name="uq_docker_containers_device_container"),
    )
    op.create_index(op.f("ix_docker_containers_id"), "docker_containers", ["id"], unique=False)
    op.create_index(op.f("ix_docker_containers_device_id"), "docker_containers", ["device_id"], unique=False)
    op.create_index(op.f("ix_docker_containers_state"), "docker_containers", ["state"], unique=False)
    op.create_index(op.f("ix_docker_containers_last_seen_at"), "docker_containers", ["last_seen_at"], unique=False)

    op.create_table(
        "docker_container_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("device_id", sa.Integer(), nullable=False),
        sa.Column("container_id", sa.String(length=128), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"], name=op.f("fk_docker_container_events_device_id_devices")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_docker_container_events")),
    )
    op.create_index(op.f("ix_docker_container_events_id"), "docker_container_events", ["id"], unique=False)
    op.create_index(op.f("ix_docker_container_events_device_id"), "docker_container_events", ["device_id"], unique=False)
    op.create_index(op.f("ix_docker_container_events_container_id"), "docker_container_events", ["container_id"], unique=False)
    op.create_index(op.f("ix_docker_container_events_event_type"), "docker_container_events", ["event_type"], unique=False)
    op.create_index(op.f("ix_docker_container_events_severity"), "docker_container_events", ["severity"], unique=False)
    op.create_index(op.f("ix_docker_container_events_created_at"), "docker_container_events", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_docker_container_events_created_at"), table_name="docker_container_events")
    op.drop_index(op.f("ix_docker_container_events_severity"), table_name="docker_container_events")
    op.drop_index(op.f("ix_docker_container_events_event_type"), table_name="docker_container_events")
    op.drop_index(op.f("ix_docker_container_events_container_id"), table_name="docker_container_events")
    op.drop_index(op.f("ix_docker_container_events_device_id"), table_name="docker_container_events")
    op.drop_index(op.f("ix_docker_container_events_id"), table_name="docker_container_events")
    op.drop_table("docker_container_events")

    op.drop_index(op.f("ix_docker_containers_last_seen_at"), table_name="docker_containers")
    op.drop_index(op.f("ix_docker_containers_state"), table_name="docker_containers")
    op.drop_index(op.f("ix_docker_containers_device_id"), table_name="docker_containers")
    op.drop_index(op.f("ix_docker_containers_id"), table_name="docker_containers")
    op.drop_table("docker_containers")
