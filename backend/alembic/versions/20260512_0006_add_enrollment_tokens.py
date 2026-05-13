"""add enrollment tokens table

Revision ID: 20260512_0006
Revises: 20260512_0005
Create Date: 2026-05-12
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260512_0006"
down_revision: str | None = "20260512_0005"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "enrollment_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("max_uses", sa.Integer(), nullable=False),
        sa.Column("used_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], name=op.f("fk_enrollment_tokens_created_by_user_id_users")),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], name=op.f("fk_enrollment_tokens_organization_id_organizations")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_enrollment_tokens")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_enrollment_tokens_token_hash")),
    )
    op.create_index(op.f("ix_enrollment_tokens_id"), "enrollment_tokens", ["id"], unique=False)
    op.create_index(op.f("ix_enrollment_tokens_created_by_user_id"), "enrollment_tokens", ["created_by_user_id"], unique=False)
    op.create_index(op.f("ix_enrollment_tokens_organization_id"), "enrollment_tokens", ["organization_id"], unique=False)
    op.create_index(op.f("ix_enrollment_tokens_expires_at"), "enrollment_tokens", ["expires_at"], unique=False)
    op.create_index(op.f("ix_enrollment_tokens_token_hash"), "enrollment_tokens", ["token_hash"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_enrollment_tokens_token_hash"), table_name="enrollment_tokens")
    op.drop_index(op.f("ix_enrollment_tokens_expires_at"), table_name="enrollment_tokens")
    op.drop_index(op.f("ix_enrollment_tokens_organization_id"), table_name="enrollment_tokens")
    op.drop_index(op.f("ix_enrollment_tokens_created_by_user_id"), table_name="enrollment_tokens")
    op.drop_index(op.f("ix_enrollment_tokens_id"), table_name="enrollment_tokens")
    op.drop_table("enrollment_tokens")
