"""
Get Cashflow Summary Tool - Retrieves income/expense totals.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import select, func, extract
from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolDefinition, ToolResult, ToolKind
from app.models.transaction import Transaction
from app.models.category import Category


class GetCashflowSummaryTool(BaseTool):
    """
    Retrieves cashflow summary for a period.

    Shows total income, expenses, net cashflow, and breakdown by category.
    """

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="get_cashflow_summary",
            description=(
                "Get cashflow summary showing income, expenses, and net for a period. "
                "Use this for financial overview, checking monthly totals, "
                "or analyzing spending patterns by category."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "period": {
                        "type": "string",
                        "enum": ["week", "month", "custom"],
                        "default": "month",
                        "description": "Time period: 'week' (last 7 days), 'month' (current month), or 'custom'.",
                    },
                    "date_from": {
                        "type": "string",
                        "format": "date",
                        "description": "Start date for custom period (YYYY-MM-DD).",
                    },
                    "date_to": {
                        "type": "string",
                        "format": "date",
                        "description": "End date for custom period (YYYY-MM-DD).",
                    },
                },
                "required": [],
            },
            result_schema={
                "type": "object",
                "properties": {
                    "period": {"type": "string"},
                    "date_from": {"type": "string"},
                    "date_to": {"type": "string"},
                    "income": {"type": "number"},
                    "expense": {"type": "number"},
                    "net": {"type": "number"},
                    "by_category": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "category_id": {"type": "string"},
                                "category_name": {"type": "string"},
                                "type": {"type": "string"},
                                "amount": {"type": "number"},
                            },
                        },
                    },
                },
            },
            kind=ToolKind.READ,
        )

    def execute(
        self,
        arguments: dict[str, Any],
        db: Session,
        user_id: str,
    ) -> ToolResult:
        try:
            today = datetime.now()
            period = arguments.get("period", "month")

            # Determine date range
            if period == "week":
                date_from = (today - timedelta(days=7)).date()
                date_to = today.date()
            elif period == "month":
                date_from = today.replace(day=1).date()
                date_to = today.date()
            else:  # custom
                date_from_str = arguments.get("date_from")
                date_to_str = arguments.get("date_to")
                if not date_from_str or not date_to_str:
                    return ToolResult(
                        is_error=True,
                        error_message="Custom period requires date_from and date_to",
                    )
                date_from = datetime.strptime(date_from_str, "%Y-%m-%d").date()
                date_to = datetime.strptime(date_to_str, "%Y-%m-%d").date()

            # Query totals by type
            totals_stmt = (
                select(
                    Transaction.type,
                    func.sum(Transaction.amount).label("total"),
                )
                .where(
                    Transaction.user_id == user_id,
                    Transaction.hide_from_summary == False,
                    func.date(Transaction.date) >= date_from,
                    func.date(Transaction.date) <= date_to,
                )
                .group_by(Transaction.type)
            )
            totals = {r.type: float(r.total) for r in db.execute(totals_stmt).all()}
            
            income = totals.get("income", 0.0)
            expense = totals.get("expense", 0.0)
            net = income - expense

            # Query by category
            category_stmt = (
                select(
                    Transaction.category_id,
                    Category.name.label("category_name"),
                    Transaction.type,
                    func.sum(Transaction.amount).label("total"),
                )
                .join(Category, Transaction.category_id == Category.id)
                .where(
                    Transaction.user_id == user_id,
                    Transaction.hide_from_summary == False,
                    func.date(Transaction.date) >= date_from,
                    func.date(Transaction.date) <= date_to,
                )
                .group_by(Transaction.category_id, Category.name, Transaction.type)
                .order_by(func.sum(Transaction.amount).desc())
            )
            
            by_category = []
            for row in db.execute(category_stmt).all():
                by_category.append({
                    "category_id": str(row.category_id),
                    "category_name": row.category_name,
                    "type": row.type,
                    "amount": float(row.total),
                })

            return ToolResult(
                data={
                    "period": period,
                    "date_from": date_from.isoformat(),
                    "date_to": date_to.isoformat(),
                    "income": income,
                    "expense": expense,
                    "net": net,
                    "by_category": by_category,
                }
            )

        except Exception as e:
            return ToolResult(is_error=True, error_message=str(e))


