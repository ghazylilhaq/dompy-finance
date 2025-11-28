"""
Pydantic schemas for the Dompy Assistant API.

Defines request/response models for conversations, messages, and proposals.
"""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


# =============================================================================
# Tool Call Schemas
# =============================================================================


class ToolCallInfo(BaseModel):
    """Information about a tool call made by the assistant."""

    id: str = Field(..., description="Unique tool call identifier")
    tool_name: str = Field(..., description="Name of the tool called")
    arguments: dict[str, Any] = Field(..., description="Arguments passed to the tool")
    result: Any | None = Field(None, description="Result from tool execution")


# =============================================================================
# Message Schemas
# =============================================================================


class MessageRequest(BaseModel):
    """Request to send a message to the assistant."""

    conversation_id: UUID | None = Field(
        None, description="Existing conversation ID, or None to create new"
    )
    message: str = Field(..., min_length=1, description="User's message text")
    image_url: str | None = Field(None, description="Optional image attachment URL")


class MessageBase(BaseModel):
    """Base message fields."""

    id: UUID
    role: Literal["user", "assistant", "system", "tool"]
    content: str | None
    image_url: str | None = None
    tool_calls: list[ToolCallInfo] | None = None
    tool_call_id: str | None = None
    tool_name: str | None = None
    created_at: datetime


class MessageResponse(BaseModel):
    """Response after sending a message."""

    conversation_id: UUID = Field(..., description="Conversation ID")
    message_id: UUID = Field(..., description="ID of the assistant's response message")
    content: str = Field(..., description="Assistant's response text")
    tool_calls: list[ToolCallInfo] = Field(
        default_factory=list, description="Tools called during processing"
    )
    proposals: list["ProposalResponse"] = Field(
        default_factory=list, description="Action proposals created"
    )


# =============================================================================
# Proposal Schemas
# =============================================================================


class ProposalResponse(BaseModel):
    """Response schema for an action proposal."""

    id: UUID
    proposal_type: Literal["transaction", "budget", "category", "transfer"]
    status: Literal["pending", "confirmed", "revised", "discarded"]
    payload: dict[str, Any] = Field(..., description="Current proposal payload")
    original_payload: dict[str, Any] = Field(..., description="Original payload")
    revised_payload: dict[str, Any] | None = Field(
        None, description="User-revised payload"
    )
    created_at: datetime
    applied_at: datetime | None = None
    result_id: UUID | None = None


class ProposalUpdate(BaseModel):
    """Request to update a proposal."""

    revised_payload: dict[str, Any] | None = Field(
        None, description="Updated payload values"
    )
    status: Literal["revised", "discarded"] | None = Field(
        None, description="New status"
    )


class ApplyRequest(BaseModel):
    """Request to apply (confirm) proposals."""

    proposal_ids: list[UUID] = Field(..., min_length=1, description="IDs to apply")
    revisions: dict[str, dict[str, Any]] | None = Field(
        None, description="Last-minute revisions keyed by proposal ID"
    )


class ApplyResultItem(BaseModel):
    """Result of applying a single proposal."""

    proposal_id: UUID
    success: bool
    entity_id: UUID | None = None
    error: str | None = None


class ApplyResponse(BaseModel):
    """Response after applying proposals."""

    results: list[ApplyResultItem]


# =============================================================================
# Conversation Schemas
# =============================================================================


class ConversationSummary(BaseModel):
    """Summary of a conversation for listing."""

    id: UUID
    title: str | None
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    last_message_preview: str | None = None


class ConversationDetail(BaseModel):
    """Full conversation with messages and proposals."""

    id: UUID
    title: str | None
    created_at: datetime
    updated_at: datetime
    messages: list[MessageBase]
    proposals: list[ProposalResponse]


class ConversationListResponse(BaseModel):
    """Paginated list of conversations."""

    conversations: list[ConversationSummary]
    total: int
    has_more: bool


# =============================================================================
# Transaction Proposal Payload
# =============================================================================


class TransactionProposalPayload(BaseModel):
    """Payload structure for a transaction proposal."""

    date: str = Field(..., description="Transaction date (ISO format)")
    amount: float = Field(..., gt=0, description="Transaction amount")
    type: Literal["income", "expense"] = Field(..., description="Transaction type")
    category_id: UUID | None = Field(None, description="Category ID")
    category_name: str | None = Field(None, description="Category name for display")
    account_id: UUID | None = Field(None, description="Account ID")
    account_name: str | None = Field(None, description="Account name for display")
    description: str = Field("", description="Transaction description")
    tags: list[str] = Field(default_factory=list, description="Transaction tags")


# =============================================================================
# Budget Proposal Payload
# =============================================================================


class BudgetAllocation(BaseModel):
    """Single budget allocation in a plan."""

    category_id: UUID
    category_name: str
    suggested_amount: float


class BudgetPlanProposalPayload(BaseModel):
    """Payload structure for a budget plan proposal."""

    month: str = Field(..., description="Budget month (YYYY-MM format)")
    allocations: list[BudgetAllocation]
    total_income: float | None = None
    total_allocated: float | None = None


# =============================================================================
# Category Change Proposal Payload
# =============================================================================


class CategoryChangeItem(BaseModel):
    """Single category change operation."""

    action: Literal["create", "rename", "merge", "delete"]
    category_id: UUID | None = None
    new_name: str | None = None
    new_type: Literal["income", "expense"] | None = None
    merge_into_id: UUID | None = None
    color: str | None = None
    icon: str | None = None


class CategoryChangesProposalPayload(BaseModel):
    """Payload structure for category changes proposal."""

    changes: list[CategoryChangeItem]


# Rebuild models to resolve forward references
MessageResponse.model_rebuild()



