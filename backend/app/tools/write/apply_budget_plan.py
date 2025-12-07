"""
Apply Budget Plan Tool - Executes confirmed budget allocations.

This tool is INTERNAL ONLY - it should never be called directly by the LLM.
It's used by the system after user confirms a budget plan proposal.
"""

from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolDefinition, ToolResult, ToolKind
from app.crud import budget as budget_crud
from app.schemas.budget import BudgetCreate, BudgetUpdate


class ApplyBudgetPlanTool(BaseTool):
    """
    Applies confirmed budget allocations to the database.

    Creates or updates budgets for the specified month.
    """

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="apply_budget_plan",
            description=(
                "INTERNAL: Apply confirmed budget allocations to the database. "
                "This tool is called by the system after user confirms a proposal. "
                "Do NOT call this directly."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "month": {
                        "type": "string",
                        "pattern": "^\\d{4}-\\d{2}$",
                        "description": "Target month (YYYY-MM).",
                    },
                    "allocations": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "category_id": {"type": "string"},
                                "amount": {"type": "number"},
                            },
                            "required": ["category_id", "amount"],
                        },
                        "description": "Budget allocations per category.",
                    },
                },
                "required": ["month", "allocations"],
            },
            result_schema={
                "type": "object",
                "properties": {
                    "budget_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "success": {"type": "boolean"},
                },
            },
            kind=ToolKind.WRITE,
            requires_confirmation=False,  # Already confirmed via proposal
        )

    def execute(
        self,
        arguments: dict[str, Any],
        db: Session,
        user_id: str,
    ) -> ToolResult:
        try:
            month_str = arguments["month"]
            allocations = arguments["allocations"]

            # Parse month string to date
            month_date = budget_crud.parse_month(month_str)

            budget_ids = []

            for alloc in allocations:
                category_id = UUID(alloc["category_id"])
                amount = Decimal(str(alloc["amount"]))

                if amount <= 0:
                    continue  # Skip zero/negative allocations

                # Check if budget already exists
                existing = budget_crud.get_budget_by_category_month(
                    db, category_id, month_date, user_id
                )

                if existing:
                    # Update existing budget
                    update_data = BudgetUpdate(limit_amount=amount)
                    budget_crud.update_budget(
                        db,
                        existing.id,
                        update_data,
                        user_id,
                    )
                    budget_ids.append(str(existing.id))
                else:
                    # Create new budget
                    budget_data = BudgetCreate(
                        category_id=category_id,
                        month=month_str,
                        limit_amount=amount,
                    )
                    budget = budget_crud.create_budget(db, budget_data, user_id)
                    budget_ids.append(str(budget.id))

            return ToolResult(
                data={
                    "budget_ids": budget_ids,
                    "success": True,
                    "count": len(budget_ids),
                }
            )

        except Exception as e:
            return ToolResult(success=False, error=str(e))

