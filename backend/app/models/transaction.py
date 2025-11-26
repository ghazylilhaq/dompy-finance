"""
Transaction model - represents income and expense records.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, Numeric, ForeignKey, CheckConstraint, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.tag import transaction_tags


class Transaction(Base):
    """
    Financial transaction (income or expense).

    Attributes:
        id: Unique identifier (UUID)
        user_id: Clerk user ID for multi-user support
        date: Transaction date/time
        type: Transaction type (income or expense)
        amount: Transaction amount (always positive)
        category_id: Reference to the category
        account_id: Reference to the account
        description: Transaction description
        is_transfer: Whether this is part of a transfer pair
        transfer_group_id: Links two transfer legs together
        hide_from_summary: Excludes from income/expense summaries
        created_at: Creation timestamp
        updated_at: Last update timestamp

    Relationships:
        category: Associated category
        account: Associated account
        tags: List of associated tags
    """

    __tablename__ = "transactions"

    __table_args__ = (
        CheckConstraint("type IN ('income', 'expense')", name="check_transaction_type"),
        CheckConstraint("amount > 0", name="check_transaction_amount_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[str] = mapped_column(String(255), index=True)
    date: Mapped[datetime] = mapped_column()
    type: Mapped[str] = mapped_column(String(10))
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"),
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("accounts.id", ondelete="RESTRICT"),
    )
    description: Mapped[str] = mapped_column(String(500))
    is_transfer: Mapped[bool] = mapped_column(Boolean, default=False)
    transfer_group_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True, index=True
    )
    hide_from_summary: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    category: Mapped["Category"] = relationship("Category")
    account: Mapped["Account"] = relationship("Account")
    tags: Mapped[list["Tag"]] = relationship(
        "Tag",
        secondary=transaction_tags,
    )

    def __repr__(self) -> str:
        return f"<Transaction {self.type} {self.amount} - {self.description[:20]}>"
