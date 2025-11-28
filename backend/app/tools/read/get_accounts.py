"""
Get Accounts Tool - Retrieves user's accounts.
"""

from typing import Any

from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolDefinition, ToolResult, ToolKind
from app.crud import account as account_crud


class GetAccountsTool(BaseTool):
    """
    Retrieves all user accounts with balances.

    Returns account list with names, types, and current balances.
    """

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="get_accounts",
            description=(
                "Get all user accounts with their current balances. "
                "Use this to see available accounts, total balance, "
                "or find account IDs for transactions."
            ),
            input_schema={
                "type": "object",
                "properties": {},
                "required": [],
            },
            result_schema={
                "type": "object",
                "properties": {
                    "accounts": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "name": {"type": "string"},
                                "type": {"type": "string"},
                                "balance": {"type": "number"},
                            },
                        },
                    },
                    "total_balance": {"type": "number"},
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
            accounts = account_crud.get_accounts(db, user_id)

            result_list = []
            total_balance = 0.0

            for acc in accounts:
                balance = float(acc.balance)
                total_balance += balance
                result_list.append({
                    "id": str(acc.id),
                    "name": acc.name,
                    "type": acc.type,
                    "balance": balance,
                    "color": acc.color,
                    "icon": acc.icon,
                })

            return ToolResult(
                data={
                    "accounts": result_list,
                    "total_balance": total_balance,
                }
            )

        except Exception as e:
            return ToolResult(is_error=True, error_message=str(e))


