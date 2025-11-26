"""Add import profiles and value mappings tables

Revision ID: 003
Revises: 002
Create Date: 2024-11-26 00:00:00.000000

Creates tables for transaction import functionality:
- import_profiles: Stores import configuration per user
- import_value_mappings: Stores CSV value to internal ID mappings
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create import_profiles table
    op.create_table(
        "import_profiles",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("column_mapping", sa.JSON(), nullable=False),
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
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name", name="uq_import_profile_user_name"),
    )
    op.create_index("idx_import_profiles_user_id", "import_profiles", ["user_id"])

    # 2. Create import_value_mappings table
    op.create_table(
        "import_value_mappings",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("profile_id", sa.UUID(), nullable=False),
        sa.Column("mapping_type", sa.String(length=20), nullable=False),
        sa.Column("csv_value", sa.String(length=255), nullable=False),
        sa.Column("internal_id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "mapping_type IN ('category', 'account')",
            name="check_mapping_type",
        ),
        sa.ForeignKeyConstraint(
            ["profile_id"],
            ["import_profiles.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "profile_id",
            "mapping_type",
            "csv_value",
            name="uq_import_value_mapping",
        ),
    )
    op.create_index(
        "idx_import_value_mappings_lookup",
        "import_value_mappings",
        ["profile_id", "mapping_type"],
    )


def downgrade() -> None:
    op.drop_table("import_value_mappings")
    op.drop_table("import_profiles")

