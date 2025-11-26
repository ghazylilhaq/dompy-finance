"""
Pydantic schemas for Import Profile operations.
"""

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# Valid mapping types
MappingType = Literal["category", "account"]


class ImportProfileBase(BaseModel):
    """Base schema with common import profile fields."""

    name: str = Field(..., min_length=1, max_length=100, description="Profile name")
    column_mapping: dict = Field(..., description="Column mapping configuration")


class ImportProfileCreate(ImportProfileBase):
    """Schema for creating a new import profile."""

    pass


class ImportProfileResponse(ImportProfileBase):
    """Schema for import profile responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime


class ImportValueMappingBase(BaseModel):
    """Base schema for value mappings."""

    mapping_type: MappingType = Field(..., description="Type: category or account")
    csv_value: str = Field(..., max_length=255, description="Original CSV value")
    internal_id: UUID = Field(..., description="Target category_id or account_id")


class ImportValueMappingCreate(ImportValueMappingBase):
    """Schema for creating a value mapping."""

    pass


class ImportValueMappingResponse(ImportValueMappingBase):
    """Schema for value mapping responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    profile_id: UUID
    created_at: datetime


# =============================================================================
# Import Flow Schemas
# =============================================================================


class ParsedRow(BaseModel):
    """A single parsed row from the import file."""

    row_index: int = Field(..., description="Row index in the file (0-based)")
    external_id: str = Field(..., description="External ID from CSV")
    date: str = Field(..., description="Original date string from CSV")
    category_value: str = Field(..., description="Category string from CSV")
    account_value: str = Field(..., description="Account string from CSV")
    amount: Decimal = Field(..., description="Amount (can be negative)")
    description: str = Field(..., description="Transaction description")


class ParseResult(BaseModel):
    """Result of parsing an import file."""

    profile_id: UUID = Field(..., description="Import profile ID")
    total_rows: int = Field(..., description="Total number of data rows")
    parsed_rows: list[ParsedRow] = Field(..., description="List of parsed rows")
    unmapped_categories: list[str] = Field(
        ..., description="Distinct category values not yet mapped"
    )
    unmapped_accounts: list[str] = Field(
        ..., description="Distinct account values not yet mapped"
    )
    existing_category_mappings: dict[str, str] = Field(
        ..., description="Already mapped: csv_value -> category_id"
    )
    existing_account_mappings: dict[str, str] = Field(
        ..., description="Already mapped: csv_value -> account_id"
    )


class MappingItem(BaseModel):
    """A single mapping from CSV value to internal ID."""

    csv_value: str = Field(..., description="Original CSV value")
    internal_id: UUID = Field(..., description="Target internal ID")


class ConfirmImportRequest(BaseModel):
    """Request to confirm and execute the import."""

    profile_id: UUID = Field(..., description="Import profile ID")
    category_mappings: list[MappingItem] = Field(
        default_factory=list, description="New category mappings to persist"
    )
    account_mappings: list[MappingItem] = Field(
        default_factory=list, description="New account mappings to persist"
    )
    parsed_rows: list[ParsedRow] = Field(..., description="Rows to import")


class ImportResult(BaseModel):
    """Result of the import operation."""

    imported_count: int = Field(..., description="Number of transactions imported")
    skipped_count: int = Field(..., description="Number of rows skipped")
    errors: list[str] = Field(
        default_factory=list, description="Row-level error messages"
    )

