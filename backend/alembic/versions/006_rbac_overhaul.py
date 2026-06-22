"""RBAC overhaul: audit_logs, api_key_project_scopes, access_level rename, constraints

Revision ID: 006
Revises: 005
Create Date: 2026-06-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create audit_logs table
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("actor_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("target_type", sa.String(50), nullable=False),
        sa.Column("target_id", sa.String(36), nullable=False),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create api_key_project_scopes table
    op.create_table(
        "api_key_project_scopes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("api_key_id", sa.String(36), sa.ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("project_id", sa.String(36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Rename project_memberships.role -> access_level and add constraints
    with op.batch_alter_table("project_memberships") as batch_op:
        batch_op.alter_column("role", new_column_name="access_level")
        batch_op.create_check_constraint("ck_membership_access_level", "access_level IN ('owner', 'editor', 'approver', 'viewer')")
        batch_op.create_unique_constraint("uq_membership_project_user", ["project_id", "user_id"])

    # Add check constraint on users.role
    with op.batch_alter_table("users") as batch_op:
        batch_op.create_check_constraint("ck_users_role", "role IN ('admin', 'editor', 'viewer')")

    # Migrate existing data: 'reviewer' -> 'editor' in users.role
    op.execute("UPDATE users SET role = 'editor' WHERE role = 'reviewer'")


def downgrade() -> None:
    op.drop_table("api_key_project_scopes")
    op.drop_table("audit_logs")

    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint("ck_users_role", type_="check")

    with op.batch_alter_table("project_memberships") as batch_op:
        batch_op.drop_constraint("uq_membership_project_user", type_="unique")
        batch_op.drop_constraint("ck_membership_access_level", type_="check")
        batch_op.alter_column("access_level", new_column_name="role")
