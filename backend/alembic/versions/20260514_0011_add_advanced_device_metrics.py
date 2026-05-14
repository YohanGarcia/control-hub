"""add advanced device metric fields

Revision ID: 20260514_0011
Revises: 20260514_0010
Create Date: 2026-05-14 09:45:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260514_0011"
down_revision: str | None = "20260514_0010"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("device_metrics", sa.Column("net_bytes_recv", sa.Float(), nullable=True))
    op.add_column("device_metrics", sa.Column("net_bytes_sent", sa.Float(), nullable=True))
    op.add_column("device_metrics", sa.Column("cpu_per_core", sa.JSON(), nullable=True))
    op.add_column("device_metrics", sa.Column("load_avg_1", sa.Float(), nullable=True))
    op.add_column("device_metrics", sa.Column("load_avg_5", sa.Float(), nullable=True))
    op.add_column("device_metrics", sa.Column("load_avg_15", sa.Float(), nullable=True))
    op.add_column("device_metrics", sa.Column("temps", sa.JSON(), nullable=True))
    op.add_column("device_metrics", sa.Column("disk_mounts", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("device_metrics", "disk_mounts")
    op.drop_column("device_metrics", "temps")
    op.drop_column("device_metrics", "load_avg_15")
    op.drop_column("device_metrics", "load_avg_5")
    op.drop_column("device_metrics", "load_avg_1")
    op.drop_column("device_metrics", "cpu_per_core")
    op.drop_column("device_metrics", "net_bytes_sent")
    op.drop_column("device_metrics", "net_bytes_recv")
