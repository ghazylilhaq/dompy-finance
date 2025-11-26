"""
Pydantic schemas for Category operations.
"""

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# Valid category types
CategoryType = Literal["income", "expense"]


class CategoryBase(BaseModel):
    """Base schema with common category fields."""

    name: str = Field(..., min_length=1, max_length=100, description="Category name")
    type: CategoryType = Field(..., description="income or expense")
    color: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$", description="Hex color code")
    icon: str = Field(..., min_length=1, max_length=50, description="Lucide icon name")


class CategoryCreate(CategoryBase):
    """Schema for creating a new category."""

    parent_id: Optional[UUID] = Field(
        None, description="Parent category ID (for subcategories)"
    )


class CategoryUpdate(BaseModel):
    """Schema for updating an existing category. All fields optional."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    type: Optional[CategoryType] = None
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, min_length=1, max_length=50)
    parent_id: Optional[UUID] = None


class CategoryResponse(CategoryBase):
    """Schema for category responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    parent_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime


class CategoryWithChildren(CategoryResponse):
    """Schema for category with nested children (hierarchical view)."""

    children: list["CategoryResponse"] = Field(default_factory=list)







