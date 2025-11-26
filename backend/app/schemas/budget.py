"""
Pydantic schemas for Budget operations.
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict, field_validator


# Budget status types
BudgetStatus = Literal["safe", "warning", "over"]


class BudgetCreate(BaseModel):
    """Schema for creating a new budget."""

    category_id: UUID = Field(..., description="Category ID")
    month: str = Field(
        ..., pattern=r"^\d{4}-\d{2}$", description="Month in YYYY-MM format"
    )
    limit_amount: Decimal = Field(..., gt=0, description="Budget limit amount")

    @field_validator("month")
    @classmethod
    def validate_month(cls, v: str) -> str:
        """Validate month format."""
        year, month = v.split("-")
        if not (1 <= int(month) <= 12):
            raise ValueError("Month must be between 01 and 12")
        return v


class BudgetUpdate(BaseModel):
    """Schema for updating an existing budget."""

    limit_amount: Optional[Decimal] = Field(
        None, gt=0, description="Budget limit amount"
    )


class BudgetResponse(BaseModel):
    """Schema for budget responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    category_id: UUID
    month: date
    limit_amount: Decimal
    spent_amount: Decimal
    created_at: datetime
    updated_at: datetime

    # Computed fields (from model properties)
    percentage_used: float = Field(default=0.0)
    status: BudgetStatus = Field(default="safe")

    # Category info (populated in router)
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    category_icon: Optional[str] = None







