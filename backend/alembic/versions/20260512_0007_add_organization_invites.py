"""add organization invites

Revision ID: 20260512_0007
Revises: 20260512_0006
Create Date: 2026-05-12
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260512_0007"
down_revision: str | None = "20260512_0006"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "organization_invites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], name=op.f("fk_organization_invites_created_by_user_id_users")),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], name=op.f("fk_organization_invites_organization_id_organizations")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_organization_invites")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_organization_invites_token_hash")),
    )
    op.create_index(op.f("ix_organization_invites_id"), "organization_invites", ["id"], unique=False)
    op.create_index(op.f("ix_organization_invites_organization_id"), "organization_invites", ["organization_id"], unique=False)
    op.create_index(op.f("ix_organization_invites_created_by_user_id"), "organization_invites", ["created_by_user_id"], unique=False)
    op.create_index(op.f("ix_organization_invites_token_hash"), "organization_invites", ["token_hash"], unique=False)
    op.create_index(op.f("ix_organization_invites_expires_at"), "organization_invites", ["expires_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_organization_invites_expires_at"), table_name="organization_invites")
    op.drop_index(op.f("ix_organization_invites_token_hash"), table_name="organization_invites")
    op.drop_index(op.f("ix_organization_invites_created_by_user_id"), table_name="organization_invites")
    op.drop_index(op.f("ix_organization_invites_organization_id"), table_name="organization_invites")
    op.drop_index(op.f("ix_organization_invites_id"), table_name="organization_invites")
    op.drop_table("organization_invites")
