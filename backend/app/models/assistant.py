"""
Assistant models - Conversation, Message, and Action Proposals.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Any

from sqlalchemy import String, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Conversation(Base):
    """
    A chat conversation with the Dompy Assistant.

    Attributes:
        id: Unique conversation identifier (UUID)
        user_id: Clerk user ID for ownership
        title: Auto-generated or user-set conversation title
        created_at: Creation timestamp
        updated_at: Last activity timestamp

    Relationships:
        messages: List of messages in this conversation
        proposals: List of action proposals generated in this conversation
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
    )

    # Relationships
    messages: Mapped[list["ConversationMessage"]] = relationship(
        "ConversationMessage",
        back_populates="conversation",
        order_by="ConversationMessage.created_at",
        cascade="all, delete-orphan",
    )
    proposals: Mapped[list["ActionProposal"]] = relationship(
        "ActionProposal",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        title = self.title or "Untitled"
        return f"<Conversation {self.id} - {title[:30]}>"


class ConversationMessage(Base):
    """
    A single message in a conversation.

    Supports user, assistant, system, and tool result messages.

    Attributes:
        id: Unique message identifier (UUID)
        conversation_id: Parent conversation
        role: Message role (user, assistant, system, tool)
        content: Message text content
        image_url: Optional image attachment URL
        tool_calls: Array of tool calls made (for assistant messages)
        tool_call_id: Tool call ID (for tool result messages)
        tool_name: Tool name (for tool result messages)
        created_at: Message timestamp

    Relationships:
        conversation: Parent conversation
        proposals: Action proposals created by this message
    """

    __tablename__ = "conversation_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"),
        index=True,
    )
    role: Mapped[str] = mapped_column(String(20))  # user, assistant, system, tool
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tool_calls: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSON, nullable=True
    )  # Array of tool calls
    tool_call_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )  # For tool result messages
    tool_name: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )  # For tool result messages
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    conversation: Mapped["Conversation"] = relationship(
        "Conversation", back_populates="messages"
    )
    proposals: Mapped[list["ActionProposal"]] = relationship(
        "ActionProposal",
        back_populates="message",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        content_preview = (self.content or "")[:30]
        return f"<Message {self.role}: {content_preview}>"


class ActionProposal(Base):
    """
    A proposed action from the assistant that requires user confirmation.

    Tracks the lifecycle of write operations: pending → confirmed/discarded.

    Attributes:
        id: Proposal identifier (UUID)
        conversation_id: Parent conversation
        message_id: Message that created this proposal
        proposal_type: Type of proposal (transaction, budget, category, transfer)
        status: Current status (pending, confirmed, revised, discarded)
        original_payload: Initial payload from tool
        revised_payload: User-modified payload
        applied_at: When applied to database
        result_id: ID of created/updated entity
        created_at: Creation timestamp

    Relationships:
        conversation: Parent conversation
        message: Message that created this proposal
    """

    __tablename__ = "action_proposals"

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
        index=True,
    )
    proposal_type: Mapped[str] = mapped_column(
        String(50)
    )  # transaction, budget, category, transfer
    status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # pending, confirmed, revised, discarded
    original_payload: Mapped[dict[str, Any]] = mapped_column(JSON)
    revised_payload: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSON, nullable=True
    )
    applied_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    result_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True
    )  # UUID as string
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    conversation: Mapped["Conversation"] = relationship(
        "Conversation", back_populates="proposals"
    )
    message: Mapped["ConversationMessage"] = relationship(
        "ConversationMessage", back_populates="proposals"
    )

    def __repr__(self) -> str:
        return f"<ActionProposal {self.proposal_type} - {self.status}>"

    @property
    def effective_payload(self) -> dict[str, Any]:
        """Return revised payload if available, otherwise original."""
        return self.revised_payload if self.revised_payload else self.original_payload

