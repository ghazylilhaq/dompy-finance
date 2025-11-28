"""
Assistant models - Conversations, Messages, and Action Proposals.

These models support the Dompy Assistant chat interface with tool calling.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Any

from sqlalchemy import String, Text, ForeignKey, CheckConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Conversation(Base):
    """
    A chat conversation between user and assistant.

    Attributes:
        id: Unique identifier (UUID)
        user_id: Clerk user ID for ownership
        title: Auto-generated or user-set conversation title
        created_at: Creation timestamp
        updated_at: Last activity timestamp

    Relationships:
        messages: List of messages in this conversation
        proposals: List of action proposals created in this conversation
    """

    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[str] = mapped_column(String(255), index=True)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        index=True,
    )

    # Relationships
    messages: Mapped[list["ConversationMessage"]] = relationship(
        "ConversationMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ConversationMessage.created_at",
    )
    proposals: Mapped[list["ActionProposal"]] = relationship(
        "ActionProposal",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        title = self.title[:30] if self.title else "Untitled"
        return f"<Conversation {self.id} - {title}>"


class ConversationMessage(Base):
    """
    A single message in a conversation.

    Supports multiple roles:
    - user: User's input message
    - assistant: AI assistant's response
    - system: System prompts (not shown to user)
    - tool: Tool execution results

    Attributes:
        id: Unique identifier (UUID)
        conversation_id: Parent conversation
        role: Message role (user/assistant/system/tool)
        content: Text content of the message
        image_url: Optional image attachment URL
        tool_calls: Array of tool calls (for assistant messages)
        tool_call_id: Tool call ID (for tool result messages)
        tool_name: Tool name (for tool result messages)
        created_at: Message timestamp

    Relationships:
        conversation: Parent conversation
        proposals: Action proposals created by this message
    """

    __tablename__ = "conversation_messages"

    __table_args__ = (
        CheckConstraint(
            "role IN ('user', 'assistant', 'system', 'tool')",
            name="check_message_role",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"),
        index=True,
    )
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tool_calls: Mapped[Optional[list[dict[str, Any]]]] = mapped_column(
        JSON, nullable=True
    )
    tool_call_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tool_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    conversation: Mapped["Conversation"] = relationship(
        "Conversation",
        back_populates="messages",
    )
    proposals: Mapped[list["ActionProposal"]] = relationship(
        "ActionProposal",
        back_populates="message",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        content_preview = (self.content[:30] + "...") if self.content else "[no content]"
        return f"<Message {self.role}: {content_preview}>"


class ActionProposal(Base):
    """
    A proposed action that requires user confirmation.

    Created when the assistant calls a "propose_*" tool.
    Stored until user confirms, revises, or discards.

    Statuses:
    - pending: Waiting for user action
    - confirmed: User approved, action applied
    - revised: User modified the proposal (can still be pending)
    - discarded: User rejected the proposal

    Attributes:
        id: Unique identifier (UUID)
        conversation_id: Parent conversation
        message_id: Message that created this proposal
        proposal_type: Type of proposal (transaction/budget/category/transfer)
        status: Current status
        original_payload: Initial payload from tool
        revised_payload: User-modified payload
        applied_at: When the proposal was applied to DB
        result_id: ID of created/updated entity
        created_at: Creation timestamp

    Relationships:
        conversation: Parent conversation
        message: Message that created this proposal
    """

    __tablename__ = "action_proposals"

    __table_args__ = (
        CheckConstraint(
            "proposal_type IN ('transaction', 'budget', 'category', 'transfer')",
            name="check_proposal_type",
        ),
        CheckConstraint(
            "status IN ('pending', 'confirmed', 'revised', 'discarded')",
            name="check_proposal_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"),
        index=True,
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversation_messages.id", ondelete="CASCADE"),
    )
    proposal_type: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), index=True, default="pending")
    original_payload: Mapped[dict[str, Any]] = mapped_column(JSON)
    revised_payload: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSON, nullable=True
    )
    applied_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    result_id: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    conversation: Mapped["Conversation"] = relationship(
        "Conversation",
        back_populates="proposals",
    )
    message: Mapped["ConversationMessage"] = relationship(
        "ConversationMessage",
        back_populates="proposals",
    )

    @property
    def payload(self) -> dict[str, Any]:
        """Get the effective payload (revised if available, else original)."""
        return self.revised_payload if self.revised_payload else self.original_payload

    def __repr__(self) -> str:
        return f"<ActionProposal {self.proposal_type} - {self.status}>"



