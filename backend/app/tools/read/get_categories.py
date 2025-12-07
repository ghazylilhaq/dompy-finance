"""
Get Categories Tool - Retrieves user's categories.
"""

from typing import Any

from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolDefinition, ToolResult, ToolKind
from app.crud import category as category_crud


class GetCategoriesTool(BaseTool):
    """
    Retrieves all user categories.

    Returns category list organized by type (income/expense).
    Useful for understanding available categories for transactions.
    """

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="get_categories",
            description=(
                "Get all user categories organized by type (income/expense). "
                "Use this to find category IDs for transactions or "
                "understand the user's category structure."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["income", "expense"],
                        "description": "Filter by category type. If not provided, returns all.",
                    },
                    "include_system": {
                        "type": "boolean",
                        "default": False,
                        "description": "Include system categories (like Transfer In/Out).",
                    },
                },
                "required": [],
            },
            result_schema={
                "type": "object",
                "properties": {
                    "income_categories": {
                        "type": "array",
                        "items": {"type": "object"},
                    },
                    "expense_categories": {
                        "type": "array",
                        "items": {"type": "object"},
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
            category_type = arguments.get("type")
            include_system = arguments.get("include_system", False)

            categories = category_crud.get_categories(db, user_id, category_type)

            income_categories = []
            expense_categories = []

            for cat in categories:
                # Skip system categories unless requested
                if cat.is_system and not include_system:
                    continue

                cat_data = {
                    "id": str(cat.id),
                    "name": cat.name,
                    "type": cat.type,
                    "color": cat.color,
                    "icon": cat.icon,
                    "parent_id": str(cat.parent_id) if cat.parent_id else None,
                    "is_system": cat.is_system,
                }

                if cat.type == "income":
                    income_categories.append(cat_data)
                else:
                    expense_categories.append(cat_data)

            return ToolResult(
                data={
                    "income_categories": income_categories,
                    "expense_categories": expense_categories,
                    "total_count": len(income_categories) + len(expense_categories),
                }
            )

        except Exception as e:
            return ToolResult(success=False, error=str(e))


