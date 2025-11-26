"""
Pydantic schemas for Tag operations.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TagResponse(BaseModel):
    """Schema for tag responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    created_at: datetime







