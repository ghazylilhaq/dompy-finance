"""
Pydantic schemas for Account operations.
"""

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# Valid account types
AccountType = Literal["cash", "bank", "e-wallet", "credit_card"]


class AccountBase(BaseModel):
    """Base schema with common account fields."""

    name: str = Field(..., min_length=1, max_length=100, description="Account name")
    type: AccountType = Field(..., description="Account type")
    balance: Decimal = Field(default=Decimal("0"), description="Current balance")
    color: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$", description="Hex color code")
    icon: str = Field(..., min_length=1, max_length=50, description="Lucide icon name")


class AccountCreate(AccountBase):
    """Schema for creating a new account."""

    pass


class AccountUpdate(BaseModel):
    """Schema for updating an existing account. All fields optional."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    type: Optional[AccountType] = None
    balance: Optional[Decimal] = None
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, min_length=1, max_length=50)


class AccountResponse(AccountBase):
    """Schema for account responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime







