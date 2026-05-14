"""harden refresh token sessions

Revision ID: 20260513_0008
Revises: 20260512_0007
Create Date: 2026-05-13
"""

from collections.abc import Sequence
from hashlib import sha256
from uuid import uuid4

from alembic import op
import sqlalchemy as sa


revision: str = "20260513_0008"
down_revision: str | None = "20260512_0007"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("refresh_tokens", sa.Column("token_hash", sa.String(length=255), nullable=True))
    op.add_column("refresh_tokens", sa.Column("token_family", sa.String(length=64), nullable=True))
    op.add_column("refresh_tokens", sa.Column("replaced_by_id", sa.Integer(), nullable=True))
    op.add_column("refresh_tokens", sa.Column("revoked_reason", sa.String(length=100), nullable=True))
    op.add_column("refresh_tokens", sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("refresh_tokens", sa.Column("created_ip", sa.String(length=64), nullable=True))
    op.add_column("refresh_tokens", sa.Column("created_user_agent", sa.String(length=255), nullable=True))

    op.create_foreign_key(
        op.f("fk_refresh_tokens_replaced_by_id_refresh_tokens"),
        "refresh_tokens",
        "refresh_tokens",
        ["replaced_by_id"],
        ["id"],
    )

    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, token FROM refresh_tokens")).fetchall()
    for row in rows:
        token_hash = sha256(row.token.encode("utf-8")).hexdigest()
        family = str(uuid4())
        bind.execute(
            sa.text("UPDATE refresh_tokens SET token_hash = :token_hash, token_family = :token_family WHERE id = :id"),
            {"id": row.id, "token_hash": token_hash, "token_family": family},
        )

    op.alter_column("refresh_tokens", "token_hash", existing_type=sa.String(length=255), nullable=False)
    op.alter_column("refresh_tokens", "token_family", existing_type=sa.String(length=64), nullable=False)

    op.create_unique_constraint(op.f("uq_refresh_tokens_token_hash"), "refresh_tokens", ["token_hash"])
    op.create_index(op.f("ix_refresh_tokens_token_hash"), "refresh_tokens", ["token_hash"], unique=False)
    op.create_index(op.f("ix_refresh_tokens_token_family"), "refresh_tokens", ["token_family"], unique=False)

    op.drop_index(op.f("ix_refresh_tokens_token"), table_name="refresh_tokens")
    op.drop_constraint(op.f("uq_refresh_tokens_token"), "refresh_tokens", type_="unique")
    op.drop_column("refresh_tokens", "token")


def downgrade() -> None:
    op.add_column("refresh_tokens", sa.Column("token", sa.String(length=255), nullable=True))

    bind = op.get_bind()
    bind.execute(sa.text("UPDATE refresh_tokens SET token = token_hash"))

    op.alter_column("refresh_tokens", "token", existing_type=sa.String(length=255), nullable=False)
    op.create_unique_constraint(op.f("uq_refresh_tokens_token"), "refresh_tokens", ["token"])
    op.create_index(op.f("ix_refresh_tokens_token"), "refresh_tokens", ["token"], unique=False)

    op.drop_index(op.f("ix_refresh_tokens_token_family"), table_name="refresh_tokens")
    op.drop_index(op.f("ix_refresh_tokens_token_hash"), table_name="refresh_tokens")
    op.drop_constraint(op.f("uq_refresh_tokens_token_hash"), "refresh_tokens", type_="unique")
    op.drop_constraint(op.f("fk_refresh_tokens_replaced_by_id_refresh_tokens"), "refresh_tokens", type_="foreignkey")

    op.drop_column("refresh_tokens", "created_user_agent")
    op.drop_column("refresh_tokens", "created_ip")
    op.drop_column("refresh_tokens", "last_used_at")
    op.drop_column("refresh_tokens", "revoked_reason")
    op.drop_column("refresh_tokens", "replaced_by_id")
    op.drop_column("refresh_tokens", "token_family")
    op.drop_column("refresh_tokens", "token_hash")
