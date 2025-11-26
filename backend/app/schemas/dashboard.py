"""
Pydantic schemas for Dashboard operations.
"""

from decimal import Decimal

from pydantic import BaseModel, Field


class DashboardStats(BaseModel):
    """Dashboard statistics response."""

    total_balance: Decimal = Field(..., description="Sum of all account balances")
    monthly_income: Decimal = Field(..., description="Total income for current month")
    monthly_expense: Decimal = Field(
        ..., description="Total expenses for current month"
    )







