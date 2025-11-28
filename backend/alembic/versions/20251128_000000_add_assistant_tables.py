"""Add assistant tables for Dompy AI chat

Revision ID: 006
Revises: 87623744c40c
Create Date: 2025-11-28 00:00:00.000000

Creates tables for the Dompy Assistant feature:
- conversations: Chat sessions
- conversation_messages: Individual messages with tool call support
- action_proposals: Write operation proposals pending user confirmation
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "006"
down_revision: Union[str, None] = "87623744c40c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create conversations table
    op.create_table(
        "conversations",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.String(length=255), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_conversations_user_id", "conversations", ["user_id"])
    op.create_index(
        "idx_conversations_updated_at", "conversations", [sa.text("updated_at DESC")]
    )

    # 2. Create conversation_messages table
    op.create_table(
        "conversation_messages",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("conversation_id", sa.UUID(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("tool_calls", sa.JSON(), nullable=True),
        sa.Column("tool_call_id", sa.String(length=100), nullable=True),
        sa.Column("tool_name", sa.String(length=100), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "role IN ('user', 'assistant', 'system', 'tool')",
            name="check_message_role",
        ),
        sa.ForeignKeyConstraint(
            ["conversation_id"],
            ["conversations.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_messages_conversation_id", "conversation_messages", ["conversation_id"]
    )
    op.create_index(
        "idx_messages_created_at",
        "conversation_messages",
        [sa.text("created_at ASC")],
    )

    # 3. Create action_proposals table
    op.create_table(
        "action_proposals",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("conversation_id", sa.UUID(), nullable=False),
        sa.Column("message_id", sa.UUID(), nullable=False),
        sa.Column("proposal_type", sa.String(length=50), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("original_payload", sa.JSON(), nullable=False),
        sa.Column("revised_payload", sa.JSON(), nullable=True),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("result_id", sa.String(length=36), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "proposal_type IN ('transaction', 'budget', 'category', 'transfer')",
            name="check_proposal_type",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'confirmed', 'revised', 'discarded')",
            name="check_proposal_status",
        ),
        sa.ForeignKeyConstraint(
            ["conversation_id"],
            ["conversations.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["message_id"],
            ["conversation_messages.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_proposals_conversation_id", "action_proposals", ["conversation_id"]
    )
    op.create_index("idx_proposals_message_id", "action_proposals", ["message_id"])
    op.create_index("idx_proposals_status", "action_proposals", ["status"])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table("action_proposals")
    op.drop_table("conversation_messages")
    op.drop_table("conversations")

