"""
Account model - represents financial accounts (cash, bank, e-wallet, credit card).
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import String, Numeric, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Account(Base):
    """
    Financial account entity.

    Attributes:
        id: Unique identifier (UUID)
        user_id: Clerk user ID for multi-user support
        name: Display name (e.g., "Main Wallet", "Chase Bank")
        type: Account type (cash, bank, e-wallet, credit_card)
        balance: Current balance (can be negative for credit cards)
        color: Hex color code for UI display
        icon: Lucide icon name for UI display
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "accounts"

    __table_args__ = (
        CheckConstraint(
            "type IN ('cash', 'bank', 'e-wallet', 'credit_card')",
            name="check_account_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[str] = mapped_column(String(255), index=True)
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[str] = mapped_column(String(20))
    balance: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        default=Decimal("0"),
    )
    color: Mapped[str] = mapped_column(String(7))  # #RRGGBB
    icon: Mapped[str] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<Account {self.name} ({self.type})>"
