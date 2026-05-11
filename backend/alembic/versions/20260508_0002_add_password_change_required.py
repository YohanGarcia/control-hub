"""add password_change_required column

Revision ID: 20260508_0002
Revises: 20260507_0001
Create Date: 2026-05-08
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260508_0002"
down_revision: str | None = "20260507_0001"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("password_change_required", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.execute("UPDATE users SET password_change_required = TRUE")
    op.alter_column("users", "password_change_required", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "password_change_required")
