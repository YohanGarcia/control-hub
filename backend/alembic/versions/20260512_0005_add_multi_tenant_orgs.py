"""add organizations and tenant scoping

Revision ID: 20260512_0005
Revises: ed661a014615
Create Date: 2026-05-12
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260512_0005"
down_revision: str | None = "ed661a014615"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_organizations")),
        sa.UniqueConstraint("slug", name=op.f("uq_organizations_slug")),
    )
    op.create_index(op.f("ix_organizations_id"), "organizations", ["id"], unique=False)
    op.create_index(op.f("ix_organizations_slug"), "organizations", ["slug"], unique=False)

    op.create_table(
        "organization_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], name=op.f("fk_organization_members_organization_id_organizations")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_organization_members_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_organization_members")),
        sa.UniqueConstraint("organization_id", "user_id", name="uq_org_member"),
    )
    op.create_index(op.f("ix_organization_members_id"), "organization_members", ["id"], unique=False)
    op.create_index(op.f("ix_organization_members_organization_id"), "organization_members", ["organization_id"], unique=False)
    op.create_index(op.f("ix_organization_members_role"), "organization_members", ["role"], unique=False)
    op.create_index(op.f("ix_organization_members_user_id"), "organization_members", ["user_id"], unique=False)

    op.execute(
        """
        INSERT INTO organizations (name, slug, is_active, created_at, updated_at)
        VALUES ('Default Organization', 'default-organization', TRUE, NOW(), NOW())
        """
    )

    op.execute(
        """
        INSERT INTO organization_members (organization_id, user_id, role, status, created_at, updated_at)
        SELECT
            o.id,
            u.id,
            CASE WHEN r.name = 'admin' THEN 'owner' ELSE 'viewer' END,
            'active',
            NOW(),
            NOW()
        FROM users u
        JOIN roles r ON r.id = u.role_id
        CROSS JOIN organizations o
        WHERE o.slug = 'default-organization'
        """
    )

    op.add_column("devices", sa.Column("organization_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_devices_organization_id"), "devices", ["organization_id"], unique=False)
    op.create_foreign_key(
        op.f("fk_devices_organization_id_organizations"),
        "devices",
        "organizations",
        ["organization_id"],
        ["id"],
    )

    op.execute(
        """
        UPDATE devices d
        SET organization_id = o.id
        FROM organizations o
        WHERE o.slug = 'default-organization'
        """
    )

    op.add_column("action_runs", sa.Column("organization_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_action_runs_organization_id"), "action_runs", ["organization_id"], unique=False)
    op.create_foreign_key(
        op.f("fk_action_runs_organization_id_organizations"),
        "action_runs",
        "organizations",
        ["organization_id"],
        ["id"],
    )

    op.execute(
        """
        UPDATE action_runs ar
        SET organization_id = d.organization_id
        FROM devices d
        WHERE d.id = ar.device_id
        """
    )

    op.add_column("audit_logs", sa.Column("organization_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_audit_logs_organization_id"), "audit_logs", ["organization_id"], unique=False)
    op.create_foreign_key(
        op.f("fk_audit_logs_organization_id_organizations"),
        "audit_logs",
        "organizations",
        ["organization_id"],
        ["id"],
    )

    op.execute(
        """
        UPDATE audit_logs al
        SET organization_id = om.organization_id
        FROM organization_members om
        WHERE al.actor_user_id = om.user_id
        """
    )

    op.alter_column("devices", "organization_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("action_runs", "organization_id", existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    op.alter_column("action_runs", "organization_id", existing_type=sa.Integer(), nullable=True)
    op.alter_column("devices", "organization_id", existing_type=sa.Integer(), nullable=True)

    op.drop_constraint(op.f("fk_audit_logs_organization_id_organizations"), "audit_logs", type_="foreignkey")
    op.drop_index(op.f("ix_audit_logs_organization_id"), table_name="audit_logs")
    op.drop_column("audit_logs", "organization_id")

    op.drop_constraint(op.f("fk_action_runs_organization_id_organizations"), "action_runs", type_="foreignkey")
    op.drop_index(op.f("ix_action_runs_organization_id"), table_name="action_runs")
    op.drop_column("action_runs", "organization_id")

    op.drop_constraint(op.f("fk_devices_organization_id_organizations"), "devices", type_="foreignkey")
    op.drop_index(op.f("ix_devices_organization_id"), table_name="devices")
    op.drop_column("devices", "organization_id")

    op.drop_index(op.f("ix_organization_members_user_id"), table_name="organization_members")
    op.drop_index(op.f("ix_organization_members_role"), table_name="organization_members")
    op.drop_index(op.f("ix_organization_members_organization_id"), table_name="organization_members")
    op.drop_index(op.f("ix_organization_members_id"), table_name="organization_members")
    op.drop_table("organization_members")

    op.drop_index(op.f("ix_organizations_slug"), table_name="organizations")
    op.drop_index(op.f("ix_organizations_id"), table_name="organizations")
    op.drop_table("organizations")
