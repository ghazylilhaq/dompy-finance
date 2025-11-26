"""
Category model - represents transaction categories with 2-level hierarchy.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Category(Base):
    """
    Transaction category with optional parent-child hierarchy (max 2 levels).

    Attributes:
        id: Unique identifier (UUID)
        user_id: Clerk user ID for multi-user support
        name: Category name (e.g., "Food & Dining", "Salary")
        type: Category type (income or expense)
        color: Hex color code for UI display
        icon: Lucide icon name for UI display
        parent_id: Optional reference to parent category
        created_at: Creation timestamp
        updated_at: Last update timestamp

    Relationships:
        parent: Parent category (if this is a child)
        children: Child categories (if this is a parent)
    """

    __tablename__ = "categories"

    __table_args__ = (
        CheckConstraint("type IN ('income', 'expense')", name="check_category_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[str] = mapped_column(String(255), index=True)
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[str] = mapped_column(String(10))
    color: Mapped[str] = mapped_column(String(7))
    icon: Mapped[str] = mapped_column(String(50))
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Self-referential relationships
    parent: Mapped[Optional["Category"]] = relationship(
        "Category",
        back_populates="children",
        remote_side="Category.id",
    )
    children: Mapped[list["Category"]] = relationship(
        "Category",
        back_populates="parent",
    )

    def __repr__(self) -> str:
        return f"<Category {self.name} ({self.type})>"
