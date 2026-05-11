"""unique slug per host_type

Revision ID: ed661a014615
Revises: 20260508_0004
Create Date: 2026-05-08

"""
from alembic import op
import sqlalchemy as sa

revision = "ed661a014615"
down_revision = "20260508_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("uq_actions_catalog_slug", "actions_catalog", type_="unique")
    op.create_unique_constraint("uq_slug_host", "actions_catalog", ["slug", "host_type"])


def downgrade() -> None:
    op.drop_constraint("uq_slug_host", "actions_catalog", type_="unique")
    op.create_unique_constraint("uq_actions_catalog_slug", "actions_catalog", ["slug"])
