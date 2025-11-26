"""
Tag model - represents reusable labels for transactions.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, ForeignKey, Table, Column, UniqueConstraint

from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


# Association table for many-to-many relationship between transactions and tags
transaction_tags = Table(
    "transaction_tags",
    Base.metadata,
    Column(
        "transaction_id",
        ForeignKey("transactions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tag_id",
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Tag(Base):
    """
    Reusable tag/label for categorizing transactions.

    Attributes:
        id: Unique identifier (UUID)
        user_id: Clerk user ID for multi-user support
        name: Tag name (unique per user)
        created_at: Creation timestamp
    """

    __tablename__ = "tags"

    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_tags_user_name"),)

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[str] = mapped_column(String(255), index=True)
    name: Mapped[str] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<Tag {self.name}>"
