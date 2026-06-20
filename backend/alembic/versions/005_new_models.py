"""add project_memberships, notifications, subscriptions, comments, attachments

Revision ID: 005
Revises: 004
Create Date: 2026-06-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns to projects (batch mode for SQLite)
    with op.batch_alter_table("projects") as batch_op:
        batch_op.add_column(sa.Column("created_by", sa.String(36), nullable=True))
        batch_op.add_column(sa.Column("visibility", sa.String(20), server_default="private", nullable=False))
        batch_op.create_foreign_key("fk_projects_created_by", "users", ["created_by"], ["id"], ondelete="SET NULL")

    # Create project_memberships
    op.create_table(
        "project_memberships",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("project_id", sa.String(36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="viewer"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("invited_by", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create notifications
    op.create_table(
        "notifications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("document_id", sa.String(36), sa.ForeignKey("document_instances.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_read", sa.Boolean(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create doc_type_subscriptions
    op.create_table(
        "doc_type_subscriptions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("document_type_id", sa.String(36), sa.ForeignKey("document_types.id", ondelete="CASCADE"), nullable=False),
        sa.Column("notify_on", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create document_comments
    op.create_table(
        "document_comments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("document_id", sa.String(36), sa.ForeignKey("document_instances.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("parent_id", sa.String(36), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create document_attachments
    op.create_table(
        "document_attachments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("document_id", sa.String(36), sa.ForeignKey("document_instances.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("file_path", sa.String(512), nullable=False),
        sa.Column("mime_type", sa.String(127), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Add self-referencing FK for comments after table creation
    with op.batch_alter_table("document_comments") as batch_op:
        batch_op.create_foreign_key(
            "fk_comments_parent", "document_comments", ["parent_id"], ["id"], ondelete="CASCADE"
        )


def downgrade() -> None:
    op.drop_table("document_attachments")
    op.drop_table("document_comments")
    op.drop_table("doc_type_subscriptions")
    op.drop_table("notifications")
    op.drop_table("project_memberships")
    with op.batch_alter_table("projects") as batch_op:
        batch_op.drop_constraint("fk_projects_created_by", type_="foreignkey")
        batch_op.drop_column("visibility")
        batch_op.drop_column("created_by")
