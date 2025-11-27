"""
Pydantic schemas for Dashboard operations.
"""

from decimal import Decimal
from typing import List

from pydantic import BaseModel, Field


class MonthlyActivity(BaseModel):
    """Monthly income and expense data."""

    month: str = Field(..., description="Month name/label (e.g., 'Jan')")
    income: Decimal = Field(..., description="Total income")
    expense: Decimal = Field(..., description="Total expense")


class DashboardStats(BaseModel):
    """Dashboard statistics response."""

    total_balance: Decimal = Field(..., description="Sum of all account balances")
    monthly_income: Decimal = Field(..., description="Total income for current month")
    monthly_expense: Decimal = Field(
        ..., description="Total expenses for current month"
    )
    chart_data: List[MonthlyActivity] = Field(
        default=[], description="Historical activity data for chart"
    )
