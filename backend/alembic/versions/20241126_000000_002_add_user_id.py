"""Add user_id column to all tables for Clerk authentication

Revision ID: 002
Revises: 001
Create Date: 2024-11-26 00:00:00.000000

Adds user_id column to:
- accounts
- categories
- budgets
- tags
- transactions

This enables multi-user support with Clerk authentication.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add user_id to accounts
    op.add_column(
        "accounts",
        sa.Column(
            "user_id",
            sa.String(length=255),
            nullable=False,
            server_default="default_user",
        ),
    )
    op.create_index("idx_accounts_user_id", "accounts", ["user_id"])

    # Add user_id to categories
    op.add_column(
        "categories",
        sa.Column(
            "user_id",
            sa.String(length=255),
            nullable=False,
            server_default="default_user",
        ),
    )
    op.create_index("idx_categories_user_id", "categories", ["user_id"])

    # Add user_id to budgets - use batch mode with recreate for SQLite
    with op.batch_alter_table("budgets", recreate="always") as batch_op:
        batch_op.add_column(
            sa.Column(
                "user_id",
                sa.String(length=255),
                nullable=False,
                server_default="default_user",
            ),
        )
        batch_op.drop_constraint("uq_budget_category_month", type_="unique")
        batch_op.create_unique_constraint(
            "uq_budget_user_category_month", ["user_id", "category_id", "month"]
        )
    op.create_index("idx_budgets_user_id", "budgets", ["user_id"])

    # Add user_id to tags - use batch mode to recreate table with new schema
    with op.batch_alter_table("tags", recreate="always") as batch_op:
        batch_op.add_column(
            sa.Column(
                "user_id",
                sa.String(length=255),
                nullable=False,
                server_default="default_user",
            ),
        )
        # Create new composite unique constraint (old one on name will be removed in recreate)
        batch_op.create_unique_constraint("uq_tags_user_name", ["user_id", "name"])
    op.create_index("idx_tags_user_id", "tags", ["user_id"])

    # Add user_id to transactions
    op.add_column(
        "transactions",
        sa.Column(
            "user_id",
            sa.String(length=255),
            nullable=False,
            server_default="default_user",
        ),
    )
    op.create_index("idx_transactions_user_id", "transactions", ["user_id"])


def downgrade() -> None:
    # Remove user_id from transactions
    op.drop_index("idx_transactions_user_id", table_name="transactions")
    op.drop_column("transactions", "user_id")

    # Restore tags
    op.drop_index("idx_tags_user_id", table_name="tags")
    with op.batch_alter_table("tags", recreate="always") as batch_op:
        batch_op.drop_constraint("uq_tags_user_name", type_="unique")
        batch_op.drop_column("user_id")
        batch_op.create_unique_constraint(None, ["name"])

    # Restore budgets unique constraint
    op.drop_index("idx_budgets_user_id", table_name="budgets")
    with op.batch_alter_table("budgets", recreate="always") as batch_op:
        batch_op.drop_constraint("uq_budget_user_category_month", type_="unique")
        batch_op.create_unique_constraint(
            "uq_budget_category_month", ["category_id", "month"]
        )
        batch_op.drop_column("user_id")

    # Remove user_id from categories
    op.drop_index("idx_categories_user_id", table_name="categories")
    op.drop_column("categories", "user_id")

    # Remove user_id from accounts
    op.drop_index("idx_accounts_user_id", table_name="accounts")
    op.drop_column("accounts", "user_id")
