"""add metric aggregates

Revision ID: 20260514_0009
Revises: 20260513_0008
Create Date: 2026-05-14
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260514_0009"
down_revision: str | None = "20260513_0008"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("device_metrics", sa.Column("cpu_min", sa.Float(), nullable=True))
    op.add_column("device_metrics", sa.Column("cpu_max", sa.Float(), nullable=True))
    op.add_column("device_metrics", sa.Column("ram_min", sa.Float(), nullable=True))
    op.add_column("device_metrics", sa.Column("ram_max", sa.Float(), nullable=True))
    op.add_column("device_metrics", sa.Column("disk_min", sa.Float(), nullable=True))
    op.add_column("device_metrics", sa.Column("disk_max", sa.Float(), nullable=True))
    op.add_column("device_metrics", sa.Column("sample_count", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("device_metrics", sa.Column("window_seconds", sa.Integer(), nullable=False, server_default="1"))
    op.alter_column("device_metrics", "sample_count", server_default=None)
    op.alter_column("device_metrics", "window_seconds", server_default=None)


def downgrade() -> None:
    op.drop_column("device_metrics", "window_seconds")
    op.drop_column("device_metrics", "sample_count")
    op.drop_column("device_metrics", "disk_max")
    op.drop_column("device_metrics", "disk_min")
    op.drop_column("device_metrics", "ram_max")
    op.drop_column("device_metrics", "ram_min")
    op.drop_column("device_metrics", "cpu_max")
    op.drop_column("device_metrics", "cpu_min")
