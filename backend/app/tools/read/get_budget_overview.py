"""
Get Budget Overview Tool - Retrieve budget vs actual spending.
"""

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolDefinition, ToolResult, ToolKind
from app.crud import budget as budget_crud


class GetBudgetOverviewTool(BaseTool):
    """
    Retrieve budget overview for a specific month.

    Shows each category's budget limit, actual spending, remaining amount,
    and percentage used.
    """

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="get_budget_overview",
            description=(
                "Get an overview of budgets vs actual spending for a given month. "
                "Shows each category's budget limit, how much has been spent, "
                "remaining amount, and percentage used. Use this to help users "
                "understand their spending relative to their budget."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "month": {
                        "type": "string",
                        "description": "Month to get budget overview for (YYYY-MM format). Defaults to current month.",
                    },
                },
                "additionalProperties": False,
            },
            result_schema={
                "type": "object",
                "properties": {
                    "month": {"type": "string"},
                    "budgets": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "category_id": {"type": "string"},
                                "category_name": {"type": "string"},
                                "limit": {"type": "number"},
                                "spent": {"type": "number"},
                                "remaining": {"type": "number"},
                                "percentage_used": {"type": "number"},
                                "status": {"type": "string"},
                            },
                        },
                    },
                    "total_budget": {"type": "number"},
                    "total_spent": {"type": "number"},
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
            # Default to current month
            month = arguments.get("month")
            if not month:
                month = datetime.now().strftime("%Y-%m")

            # Get budgets for the month
            budgets = budget_crud.get_budgets(db, user_id, month)

            # Format results
            budget_list = []
            total_budget = 0.0
            total_spent = 0.0

            for budget in budgets:
                limit_amount = float(budget.limit_amount)
                spent_amount = float(budget.spent_amount)
                remaining = limit_amount - spent_amount
                percentage = (spent_amount / limit_amount * 100) if limit_amount > 0 else 0

                # Determine status
                if percentage >= 100:
                    status = "over_budget"
                elif percentage >= 80:
                    status = "warning"
                else:
                    status = "on_track"

                budget_list.append({
                    "category_id": str(budget.category_id),
                    "category_name": budget.category.name if budget.category else "Unknown",
                    "limit": limit_amount,
                    "spent": spent_amount,
                    "remaining": remaining,
                    "percentage_used": round(percentage, 1),
                    "status": status,
                })

                total_budget += limit_amount
                total_spent += spent_amount

            return ToolResult(
                success=True,
                data={
                    "month": month,
                    "budgets": budget_list,
                    "total_budget": total_budget,
                    "total_spent": total_spent,
                    "total_remaining": total_budget - total_spent,
                },
            )

        except Exception as e:
            return ToolResult(
                success=False,
                error=f"Failed to get budget overview: {str(e)}",
            )


