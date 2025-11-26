"""
Budget model - represents monthly budget limits per category.
"""

import uuid
from datetime import datetime, timezone, date
from decimal import Decimal

from sqlalchemy import (
    String,
    Numeric,
    ForeignKey,
    UniqueConstraint,
    Date,
    CheckConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Budget(Base):
    """
    Monthly budget for a specific category.

    Attributes:
        id: Unique identifier (UUID)
        user_id: Clerk user ID for multi-user support
        category_id: Reference to the category
        month: Budget month (stored as first day of month)
        limit_amount: Budget limit
        spent_amount: Amount spent (updated when transactions change)
        created_at: Creation timestamp
        updated_at: Last update timestamp

    Constraints:
        - One budget per user per category per month
        - limit_amount must be positive
    """

    __tablename__ = "budgets"

    __table_args__ = (
        UniqueConstraint(
            "user_id", "category_id", "month", name="uq_budget_user_category_month"
        ),
        CheckConstraint("limit_amount > 0", name="check_budget_limit_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[str] = mapped_column(String(255), index=True)
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"),
    )
    month: Mapped[date] = mapped_column(Date)  # Stored as YYYY-MM-01
    limit_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    spent_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        default=Decimal("0"),
    )
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    category: Mapped["Category"] = relationship("Category")

    @property
    def percentage_used(self) -> float:
        """Calculate percentage of budget used."""
        if self.limit_amount == 0:
            return 0.0
        return float(self.spent_amount / self.limit_amount * 100)

    @property
    def status(self) -> str:
        """Get budget status: safe, warning, or over."""
        pct = self.percentage_used
        if pct >= 100:
            return "over"
        elif pct >= 80:
            return "warning"
        return "safe"

    def __repr__(self) -> str:
        return f"<Budget {self.month} - {self.limit_amount}>"
