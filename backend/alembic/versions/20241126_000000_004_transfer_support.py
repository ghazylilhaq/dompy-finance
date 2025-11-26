"""Add transfer support columns

Revision ID: 004
Revises: 003
Create Date: 2024-11-26 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add transfer-related columns to transactions table
    op.add_column(
        "transactions",
        sa.Column("is_transfer", sa.Boolean(), nullable=False, server_default="0"),
    )
    op.add_column(
        "transactions", sa.Column("transfer_group_id", sa.String(36), nullable=True)
    )
    op.add_column(
        "transactions",
        sa.Column(
            "hide_from_summary", sa.Boolean(), nullable=False, server_default="0"
        ),
    )

    # Create index on transfer_group_id for efficient linked-leg lookups
    op.create_index(
        "ix_transactions_transfer_group_id",
        "transactions",
        ["transfer_group_id"],
        unique=False,
    )

    # Add is_system column to categories table
    op.add_column(
        "categories",
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    # Remove is_system from categories
    op.drop_column("categories", "is_system")

    # Remove transfer columns from transactions
    op.drop_index("ix_transactions_transfer_group_id", table_name="transactions")
    op.drop_column("transactions", "hide_from_summary")
    op.drop_column("transactions", "transfer_group_id")
    op.drop_column("transactions", "is_transfer")
