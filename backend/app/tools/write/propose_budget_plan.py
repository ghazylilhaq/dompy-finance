"""
Propose Budget Plan Tool - Creates budget allocation proposals.
"""

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolDefinition, ToolResult, ToolKind
from app.crud import category as category_crud
from app.crud import budget as budget_crud


class ProposeBudgetPlanTool(BaseTool):
    """
    Creates a budget plan proposal based on user's income and goals.

    Takes income, savings target, and mandatory payments to suggest
    budget allocations across expense categories.
    """

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="propose_budget_plan",
            description=(
                "Create a budget plan proposal based on user's income and goals. "
                "Use this when user wants to set up or adjust their monthly budget. "
                "The proposal shows suggested allocations per category."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "income": {
                        "type": "number",
                        "description": "Monthly income amount.",
                    },
                    "target_savings": {
                        "type": "number",
                        "description": "Desired monthly savings amount.",
                    },
                    "mandatory_payments": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "amount": {"type": "number"},
                            },
                        },
                        "description": "Fixed payments like rent, loans, insurance.",
                    },
                    "preferences": {
                        "type": "string",
                        "description": "User preferences or constraints in natural language.",
                    },
                    "month": {
                        "type": "string",
                        "pattern": "^\\d{4}-\\d{2}$",
                        "description": "Target month (YYYY-MM). Defaults to current month.",
                    },
                },
                "required": ["income"],
            },
            result_schema={
                "type": "object",
                "properties": {
                    "proposals": {
                        "type": "array",
                        "items": {"type": "object"},
                    },
                },
            },
            kind=ToolKind.WRITE,
        )

    def execute(
        self,
        arguments: dict[str, Any],
        db: Session,
        user_id: str,
    ) -> ToolResult:
        try:
            income = arguments.get("income", 0)
            target_savings = arguments.get("target_savings", 0)
            mandatory_payments = arguments.get("mandatory_payments", [])
            month_str = arguments.get("month")

            if not month_str:
                today = datetime.now()
                month_str = f"{today.year}-{today.month:02d}"

            # Calculate available for budgeting
            mandatory_total = sum(p.get("amount", 0) for p in mandatory_payments)
            available = income - target_savings - mandatory_total

            if available <= 0:
                return ToolResult(
                    is_error=True,
                    error_message=(
                        f"No remaining budget after savings ({target_savings:,.0f}) "
                        f"and mandatory payments ({mandatory_total:,.0f})"
                    ),
                )

            # Get expense categories (non-system)
            categories = category_crud.get_categories(db, user_id, "expense")
            expense_categories = [c for c in categories if not c.is_system]

            if not expense_categories:
                return ToolResult(
                    is_error=True,
                    error_message="No expense categories found. Create categories first.",
                )

            # Get existing budgets for reference
            existing_budgets = budget_crud.get_budgets(db, user_id, month_str)
            existing_map = {str(b.category_id): b for b in existing_budgets}

            # Simple allocation strategy:
            # Distribute available budget proportionally or equally
            # More sophisticated logic could be added based on historical spending

            allocations = []
            per_category = available / len(expense_categories)

            for cat in expense_categories:
                cat_id = str(cat.id)
                existing = existing_map.get(cat_id)
                
                # Use existing limit if available, otherwise suggest equal split
                suggested_amount = (
                    float(existing.limit_amount) if existing else per_category
                )

                allocations.append({
                    "category_id": cat_id,
                    "category_name": cat.name,
                    "category_color": cat.color,
                    "category_icon": cat.icon,
                    "suggested_amount": round(suggested_amount, 0),
                    "has_existing": existing is not None,
                })

            # Sort by suggested amount descending
            allocations.sort(key=lambda x: x["suggested_amount"], reverse=True)

            # Create proposal
            proposal = {
                "proposal_type": "budget",
                "payload": {
                    "month": month_str,
                    "income": income,
                    "target_savings": target_savings,
                    "mandatory_payments": mandatory_payments,
                    "available_for_budgets": available,
                    "allocations": allocations,
                },
            }

            return ToolResult(
                data={
                    "message": "Budget plan proposal created",
                    "summary": {
                        "income": income,
                        "savings": target_savings,
                        "mandatory": mandatory_total,
                        "available": available,
                        "categories": len(allocations),
                    },
                },
                proposals=[proposal],
            )

        except Exception as e:
            return ToolResult(is_error=True, error_message=str(e))


