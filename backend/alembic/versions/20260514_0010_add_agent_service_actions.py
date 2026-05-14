"""add agent service control actions

Revision ID: 20260514_0010
Revises: 20260514_0009
Create Date: 2026-05-14
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260514_0010"
down_revision: str | None = "20260514_0009"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO actions_catalog (slug, name, host_type, command_template, timeout_seconds, max_output_chars, is_active, created_at, updated_at)
        VALUES
        ('agent_service_status', 'Agent Service Status', 'windows', 'Get-Service ControlHubAgent', 60, 4000, TRUE, NOW(), NOW()),
        ('agent_service_start', 'Start Agent Service', 'windows', 'Start-Service ControlHubAgent', 60, 4000, TRUE, NOW(), NOW()),
        ('agent_service_stop', 'Stop Agent Service', 'windows', 'Stop-Service ControlHubAgent', 60, 4000, TRUE, NOW(), NOW()),
        ('agent_service_restart', 'Restart Agent Service', 'windows', 'Restart-Service ControlHubAgent', 90, 5000, TRUE, NOW(), NOW()),
        ('agent_service_status', 'Agent Service Status', 'ubuntu', 'systemctl status controlhub-agent --no-pager', 60, 4000, TRUE, NOW(), NOW()),
        ('agent_service_start', 'Start Agent Service', 'ubuntu', 'systemctl start controlhub-agent', 60, 4000, TRUE, NOW(), NOW()),
        ('agent_service_stop', 'Stop Agent Service', 'ubuntu', 'systemctl stop controlhub-agent', 60, 4000, TRUE, NOW(), NOW()),
        ('agent_service_restart', 'Restart Agent Service', 'ubuntu', 'systemctl restart controlhub-agent', 90, 5000, TRUE, NOW(), NOW())
        ON CONFLICT (slug, host_type) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM actions_catalog
        WHERE slug IN ('agent_service_status', 'agent_service_start', 'agent_service_stop', 'agent_service_restart')
        """
    )
