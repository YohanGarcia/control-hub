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
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'uq_actions_catalog_slug'
            ) THEN
                ALTER TABLE actions_catalog DROP CONSTRAINT uq_actions_catalog_slug;
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'uq_slug_host'
            ) THEN
                ALTER TABLE actions_catalog ADD CONSTRAINT uq_slug_host UNIQUE (slug, host_type);
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'uq_slug_host'
            ) THEN
                ALTER TABLE actions_catalog DROP CONSTRAINT uq_slug_host;
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'uq_actions_catalog_slug'
            ) THEN
                ALTER TABLE actions_catalog ADD CONSTRAINT uq_actions_catalog_slug UNIQUE (slug);
            END IF;
        END $$;
        """
    )
