"""Initial database schema

Revision ID: 001
Revises:
Create Date: 2024-11-26 00:00:00.000000

Creates all tables for the NeoBudget application:
- accounts: Financial accounts
- categories: Transaction categories (hierarchical)
- budgets: Monthly budget limits
- tags: Transaction labels
- transactions: Income/expense records
- transaction_tags: M:N junction table
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create accounts table
    op.create_table(
        "accounts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column(
            "balance",
            sa.Numeric(precision=15, scale=2),
            nullable=False,
            server_default="0",
        ),
        sa.Column("color", sa.String(length=7), nullable=False),
        sa.Column("icon", sa.String(length=50), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "type IN ('cash', 'bank', 'e-wallet', 'credit_card')",
            name="check_account_type",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_accounts_type", "accounts", ["type"])

    # 2. Create categories table
    op.create_table(
        "categories",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("type", sa.String(length=10), nullable=False),
        sa.Column("color", sa.String(length=7), nullable=False),
        sa.Column("icon", sa.String(length=50), nullable=False),
        sa.Column("parent_id", sa.UUID(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint("type IN ('income', 'expense')", name="check_category_type"),
        sa.ForeignKeyConstraint(["parent_id"], ["categories.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_categories_type", "categories", ["type"])
    op.create_index("idx_categories_parent_id", "categories", ["parent_id"])

    # 3. Create budgets table
    op.create_table(
        "budgets",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("category_id", sa.UUID(), nullable=False),
        sa.Column("month", sa.Date(), nullable=False),
        sa.Column("limit_amount", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column(
            "spent_amount",
            sa.Numeric(precision=15, scale=2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint("limit_amount > 0", name="check_budget_limit_positive"),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("category_id", "month", name="uq_budget_category_month"),
    )
    op.create_index("idx_budgets_category_id", "budgets", ["category_id"])
    op.create_index("idx_budgets_month", "budgets", ["month"])

    # 4. Create tags table
    op.create_table(
        "tags",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("idx_tags_name", "tags", ["name"])

    # 5. Create transactions table
    op.create_table(
        "transactions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("type", sa.String(length=10), nullable=False),
        sa.Column("amount", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("category_id", sa.UUID(), nullable=False),
        sa.Column("account_id", sa.UUID(), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "type IN ('income', 'expense')", name="check_transaction_type"
        ),
        sa.CheckConstraint("amount > 0", name="check_transaction_amount_positive"),
        sa.ForeignKeyConstraint(
            ["category_id"], ["categories.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_transactions_date", "transactions", [sa.text("date DESC")])
    op.create_index("idx_transactions_type", "transactions", ["type"])
    op.create_index("idx_transactions_category_id", "transactions", ["category_id"])
    op.create_index("idx_transactions_account_id", "transactions", ["account_id"])

    # 6. Create transaction_tags junction table
    op.create_table(
        "transaction_tags",
        sa.Column("transaction_id", sa.UUID(), nullable=False),
        sa.Column("tag_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(
            ["transaction_id"], ["transactions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("transaction_id", "tag_id"),
    )
    op.create_index("idx_transaction_tags_tag_id", "transaction_tags", ["tag_id"])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table("transaction_tags")
    op.drop_table("transactions")
    op.drop_table("tags")
    op.drop_table("budgets")
    op.drop_table("categories")
    op.drop_table("accounts")







