"""
Pydantic schemas for Transaction operations.
"""

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# Valid transaction types
TransactionType = Literal["income", "expense"]


class TransactionBase(BaseModel):
    """Base schema with common transaction fields."""

    date: datetime = Field(..., description="Transaction date/time")
    type: TransactionType = Field(..., description="income or expense")
    amount: Decimal = Field(..., gt=0, description="Transaction amount (positive)")
    category_id: UUID = Field(..., description="Category ID")
    account_id: UUID = Field(..., description="Account ID")
    description: str = Field(
        ..., min_length=1, max_length=500, description="Description"
    )


class TransactionCreate(TransactionBase):
    """Schema for creating a new transaction."""

    tags: list[str] = Field(default_factory=list, description="List of tag names")


class TransactionUpdate(BaseModel):
    """Schema for updating an existing transaction. All fields optional."""

    date: Optional[datetime] = None
    type: Optional[TransactionType] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    category_id: Optional[UUID] = None
    account_id: Optional[UUID] = None
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    tags: Optional[list[str]] = None


class TransactionResponse(TransactionBase):
    """Schema for transaction responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime

    # Transfer fields
    is_transfer: bool = False
    transfer_group_id: Optional[str] = None
    hide_from_summary: bool = False

    # Related data (populated in router)
    tags: list[str] = Field(default_factory=list)
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    category_icon: Optional[str] = None
    account_name: Optional[str] = None


class TransactionFilter(BaseModel):
    """Schema for transaction query filters."""

    search: Optional[str] = Field(None, description="Search in description")
    type: Optional[TransactionType] = Field(None, description="Filter by type")
    category_id: Optional[UUID] = Field(None, description="Filter by category")
    account_id: Optional[UUID] = Field(None, description="Filter by account")
    month: Optional[str] = Field(
        None, pattern=r"^\d{4}-\d{2}$", description="Filter by month (YYYY-MM)"
    )

    # Pagination
    skip: int = Field(default=0, ge=0, description="Number of records to skip")
    limit: int = Field(
        default=50, ge=1, le=100, description="Maximum records to return"
    )


class TransferCreate(BaseModel):
    """Schema for creating a transfer between accounts."""

    from_account_id: UUID = Field(..., description="Source account ID")
    to_account_id: UUID = Field(..., description="Destination account ID")
    amount: Decimal = Field(..., gt=0, description="Transfer amount (positive)")
    date: datetime = Field(..., description="Transfer date/time")
    description: str = Field(
        default="Transfer", max_length=500, description="Transfer note/memo"
    )
    hide_from_summary: bool = Field(
        default=True, description="Exclude from income/expense summaries"
    )


class TransferResponse(BaseModel):
    """Schema for transfer response with both legs."""

    model_config = ConfigDict(from_attributes=True)

    transfer_group_id: str
    outgoing_transaction: TransactionResponse
    incoming_transaction: TransactionResponse
