"""add actions catalog and action runs

Revision ID: 20260508_0004
Revises: 20260508_0003
Create Date: 2026-05-08
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260508_0004"
down_revision: str | None = "20260508_0003"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "actions_catalog",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("host_type", sa.String(length=20), nullable=False),
        sa.Column("command_template", sa.Text(), nullable=False),
        sa.Column("timeout_seconds", sa.Integer(), nullable=False),
        sa.Column("max_output_chars", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_actions_catalog")),
        sa.UniqueConstraint("slug", name=op.f("uq_actions_catalog_slug")),
    )
    op.create_index(op.f("ix_actions_catalog_id"), "actions_catalog", ["id"], unique=False)
    op.create_index(op.f("ix_actions_catalog_slug"), "actions_catalog", ["slug"], unique=False)
    op.create_index(op.f("ix_actions_catalog_host_type"), "actions_catalog", ["host_type"], unique=False)

    op.create_table(
        "action_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("device_id", sa.Integer(), nullable=False),
        sa.Column("action_id", sa.Integer(), nullable=False),
        sa.Column("requested_by_user_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("exit_code", sa.Integer(), nullable=True),
        sa.Column("params_json", sa.Text(), nullable=True),
        sa.Column("output_text", sa.Text(), nullable=True),
        sa.Column("error_text", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["action_id"], ["actions_catalog.id"], name=op.f("fk_action_runs_action_id_actions_catalog")),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"], name=op.f("fk_action_runs_device_id_devices")),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"], name=op.f("fk_action_runs_requested_by_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_action_runs")),
        sa.UniqueConstraint("request_id", name=op.f("uq_action_runs_request_id")),
    )
    op.create_index(op.f("ix_action_runs_id"), "action_runs", ["id"], unique=False)
    op.create_index(op.f("ix_action_runs_request_id"), "action_runs", ["request_id"], unique=False)
    op.create_index(op.f("ix_action_runs_device_id"), "action_runs", ["device_id"], unique=False)
    op.create_index(op.f("ix_action_runs_action_id"), "action_runs", ["action_id"], unique=False)
    op.create_index(op.f("ix_action_runs_requested_by_user_id"), "action_runs", ["requested_by_user_id"], unique=False)
    op.create_index(op.f("ix_action_runs_status"), "action_runs", ["status"], unique=False)
    op.create_index(op.f("ix_action_runs_created_at"), "action_runs", ["created_at"], unique=False)

    op.execute(
        """
        INSERT INTO actions_catalog (slug, name, host_type, command_template, timeout_seconds, max_output_chars, is_active, created_at, updated_at)
        VALUES
        ('restart_service', 'Restart Service', 'ubuntu', 'systemctl restart {{service_name}}', 120, 4000, TRUE, NOW(), NOW()),
        ('update_system', 'Update System', 'ubuntu', 'apt-get update && apt-get upgrade -y', 600, 8000, TRUE, NOW(), NOW()),
        ('run_backup', 'Run Backup', 'ubuntu', '/usr/local/bin/backup.sh', 900, 8000, TRUE, NOW(), NOW()),
        ('cleanup_tmp', 'Cleanup Tmp', 'ubuntu', 'find /tmp -type f -mtime +7 -delete', 180, 4000, TRUE, NOW(), NOW()),
        ('check_docker', 'Check Docker', 'ubuntu', 'docker ps --format "table {{.Names}}\t{{.Status}}"', 120, 6000, TRUE, NOW(), NOW())
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_action_runs_created_at"), table_name="action_runs")
    op.drop_index(op.f("ix_action_runs_status"), table_name="action_runs")
    op.drop_index(op.f("ix_action_runs_requested_by_user_id"), table_name="action_runs")
    op.drop_index(op.f("ix_action_runs_action_id"), table_name="action_runs")
    op.drop_index(op.f("ix_action_runs_device_id"), table_name="action_runs")
    op.drop_index(op.f("ix_action_runs_request_id"), table_name="action_runs")
    op.drop_index(op.f("ix_action_runs_id"), table_name="action_runs")
    op.drop_table("action_runs")

    op.drop_index(op.f("ix_actions_catalog_host_type"), table_name="actions_catalog")
    op.drop_index(op.f("ix_actions_catalog_slug"), table_name="actions_catalog")
    op.drop_index(op.f("ix_actions_catalog_id"), table_name="actions_catalog")
    op.drop_table("actions_catalog")
