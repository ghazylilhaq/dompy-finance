"""
Import Profile models - stores import configurations and value mappings.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, ForeignKey, CheckConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ImportProfile(Base):
    """
    Import profile storing configuration for a specific import template.

    Attributes:
        id: Unique identifier (UUID)
        user_id: Clerk user ID for multi-user support
        name: Profile name (e.g., "Default Template")
        column_mapping: JSON storing column mapping configuration
        created_at: Creation timestamp
        updated_at: Last update timestamp

    Relationships:
        value_mappings: List of CSV value to internal ID mappings
    """

    __tablename__ = "import_profiles"

    __table_args__ = (
        # Unique constraint on user_id + name
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[str] = mapped_column(String(255), index=True)
    name: Mapped[str] = mapped_column(String(100))
    column_mapping: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    value_mappings: Mapped[list["ImportValueMapping"]] = relationship(
        "ImportValueMapping",
        back_populates="profile",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<ImportProfile {self.name} ({self.user_id})>"


class ImportValueMapping(Base):
    """
    Mapping from CSV string values to internal category/account IDs.

    Attributes:
        id: Unique identifier (UUID)
        profile_id: Reference to the import profile
        mapping_type: Type of mapping ('category' or 'account')
        csv_value: Original string from CSV (normalized/trimmed)
        internal_id: Target category_id or account_id
        created_at: Creation timestamp

    Relationships:
        profile: Parent import profile
    """

    __tablename__ = "import_value_mappings"

    __table_args__ = (
        CheckConstraint(
            "mapping_type IN ('category', 'account')",
            name="check_mapping_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("import_profiles.id", ondelete="CASCADE"),
    )
    mapping_type: Mapped[str] = mapped_column(String(20))
    csv_value: Mapped[str] = mapped_column(String(255))
    internal_id: Mapped[uuid.UUID] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    profile: Mapped["ImportProfile"] = relationship(
        "ImportProfile",
        back_populates="value_mappings",
    )

    def __repr__(self) -> str:
        return f"<ImportValueMapping {self.mapping_type}: {self.csv_value} -> {self.internal_id}>"

