"""
Pydantic schemas for Assistant operations.
"""

from datetime import datetime
from typing import Optional, Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# =============================================================================
# Enums and Types
# =============================================================================

MessageRole = Literal["user", "assistant", "system", "tool"]
ProposalType = Literal["transaction", "budget", "category", "transfer"]
ProposalStatus = Literal["pending", "confirmed", "revised", "discarded"]


# =============================================================================
# Tool Call Schemas
# =============================================================================


class ToolCallInfo(BaseModel):
    """Information about a tool call made by the assistant."""

    id: str = Field(..., description="Unique tool call ID")
    tool_name: str = Field(..., description="Name of the tool")
    arguments: dict[str, Any] = Field(..., description="Tool arguments")


class ToolResult(BaseModel):
    """Result of a tool execution."""

    tool_call_id: str = Field(..., description="ID of the tool call this is for")
    tool_name: str = Field(..., description="Name of the tool")
    result: Any = Field(..., description="Tool execution result")
    is_error: bool = Field(default=False, description="Whether execution failed")


# =============================================================================
# Message Schemas
# =============================================================================


class MessageRequest(BaseModel):
    """Request to send a message to the assistant."""

    conversation_id: Optional[UUID] = Field(
        None, description="Existing conversation ID, or null for new"
    )
    message: str = Field(..., min_length=1, description="User message content")
    image_url: Optional[str] = Field(None, description="Optional image attachment URL")


class ConversationMessageResponse(BaseModel):
    """A single message in a conversation."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    role: MessageRole
    content: Optional[str] = None
    image_url: Optional[str] = None
    tool_calls: Optional[list[ToolCallInfo]] = None
    tool_call_id: Optional[str] = None
    tool_name: Optional[str] = None
    created_at: datetime


# =============================================================================
# Proposal Schemas
# =============================================================================


class ProposalResponse(BaseModel):
    """An action proposal requiring user confirmation."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    proposal_type: ProposalType
    status: ProposalStatus
    payload: dict[str, Any] = Field(
        ..., description="Effective payload (revised if available)"
    )
    original_payload: dict[str, Any]
    revised_payload: Optional[dict[str, Any]] = None
    applied_at: Optional[datetime] = None
    result_id: Optional[str] = None
    created_at: datetime


class ProposalUpdate(BaseModel):
    """Request to update a proposal."""

    revised_payload: Optional[dict[str, Any]] = Field(
        None, description="Updated payload"
    )
    status: Optional[Literal["revised", "discarded"]] = Field(
        None, description="New status"
    )


# =============================================================================
# Response Schemas
# =============================================================================


class MessageResponse(BaseModel):
    """Response after sending a message to the assistant."""

    conversation_id: UUID
    message_id: UUID
    content: str = Field(..., description="Assistant's reply text")
    tool_calls: list[ToolCallInfo] = Field(
        default_factory=list, description="Tools called during processing"
    )
    proposals: list[ProposalResponse] = Field(
        default_factory=list, description="Generated action proposals"
    )


class ApplyProposalRequest(BaseModel):
    """Request to apply one or more proposals."""

    proposal_ids: list[UUID] = Field(..., min_length=1, description="Proposal IDs to apply")
    revisions: Optional[dict[str, dict[str, Any]]] = Field(
        None,
        description="Optional payload revisions keyed by proposal ID string",
    )


class ApplyProposalResult(BaseModel):
    """Result of applying a single proposal."""

    proposal_id: UUID
    success: bool
    entity_id: Optional[str] = Field(None, description="ID of created/updated entity")
    error: Optional[str] = Field(None, description="Error message if failed")


class ApplyProposalsResponse(BaseModel):
    """Response after applying proposals."""

    results: list[ApplyProposalResult]


# =============================================================================
# Conversation Schemas
# =============================================================================


class ConversationSummary(BaseModel):
    """Summary of a conversation for list views."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    message_count: int = Field(default=0, description="Number of messages")


class ConversationDetail(BaseModel):
    """Full conversation with messages and proposals."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    messages: list[ConversationMessageResponse] = Field(default_factory=list)
    proposals: list[ProposalResponse] = Field(default_factory=list)


class ConversationListResponse(BaseModel):
    """Paginated list of conversations."""

    conversations: list[ConversationSummary]
    total: int
    skip: int
    limit: int

