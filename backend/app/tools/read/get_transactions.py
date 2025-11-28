"""
Get Transactions Tool - Retrieve transactions with filters.
"""

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolDefinition, ToolResult, ToolKind
from app.schemas.transaction import TransactionFilter
from app.crud import transaction as tx_crud


class GetTransactionsTool(BaseTool):
    """
    Retrieve transactions with optional filters.

    Supports filtering by:
    - Date range (date_from, date_to)
    - Category ID
    - Account ID
    - Transaction type (income/expense)
    - Search text in description
    - Limit for pagination
    """

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="get_transactions",
            description=(
                "Retrieve user's transactions with optional filters. "
                "Use this to look up recent transactions, search by description, "
                "filter by category or account, or get transactions in a date range."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "date_from": {
                        "type": "string",
                        "description": "Start date (ISO format YYYY-MM-DD). Inclusive.",
                    },
                    "date_to": {
                        "type": "string",
                        "description": "End date (ISO format YYYY-MM-DD). Inclusive.",
                    },
                    "month": {
                        "type": "string",
                        "description": "Filter by month (YYYY-MM format). Alternative to date range.",
                    },
                    "category_id": {
                        "type": "string",
                        "description": "Filter by category UUID.",
                    },
                    "account_id": {
                        "type": "string",
                        "description": "Filter by account UUID.",
                    },
                    "type": {
                        "type": "string",
                        "enum": ["income", "expense"],
                        "description": "Filter by transaction type.",
                    },
                    "search": {
                        "type": "string",
                        "description": "Search text in transaction description.",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of transactions to return. Default 20, max 100.",
                        "default": 20,
                    },
                },
                "additionalProperties": False,
            },
            result_schema={
                "type": "object",
                "properties": {
                    "transactions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "date": {"type": "string"},
                                "type": {"type": "string"},
                                "amount": {"type": "number"},
                                "description": {"type": "string"},
                                "category_name": {"type": "string"},
                                "account_name": {"type": "string"},
                            },
                        },
                    },
                    "total_count": {"type": "integer"},
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
            # Build filter from arguments
            limit = min(arguments.get("limit", 20), 100)

            filters = TransactionFilter(
                search=arguments.get("search"),
                type=arguments.get("type"),
                category_id=arguments.get("category_id"),
                account_id=arguments.get("account_id"),
                month=arguments.get("month"),
                skip=0,
                limit=limit,
            )

            # Get transactions
            transactions = tx_crud.get_transactions(db, filters, user_id)

            # Format results
            tx_list = []
            for tx in transactions:
                tx_list.append({
                    "id": str(tx.id),
                    "date": tx.date.strftime("%Y-%m-%d"),
                    "type": tx.type,
                    "amount": float(tx.amount),
                    "description": tx.description,
                    "category_name": tx.category.name if tx.category else None,
                    "category_id": str(tx.category_id),
                    "account_name": tx.account.name if tx.account else None,
                    "account_id": str(tx.account_id),
                    "is_transfer": tx.is_transfer,
                })

            return ToolResult(
                success=True,
                data={
                    "transactions": tx_list,
                    "total_count": len(tx_list),
                },
            )

        except Exception as e:
            return ToolResult(
                success=False,
                error=f"Failed to get transactions: {str(e)}",
            )


