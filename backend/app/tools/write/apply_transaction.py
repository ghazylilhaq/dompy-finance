"""
Apply Transaction Tool - Executes a confirmed transaction proposal.

This tool is INTERNAL ONLY - it should never be called directly by the LLM.
It's used by the system after user confirms a transaction proposal.
"""

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolDefinition, ToolResult, ToolKind
from app.crud import transaction as tx_crud
from app.schemas.transaction import TransactionCreate


class ApplyTransactionTool(BaseTool):
    """
    Applies a confirmed transaction proposal to the database.

    This tool is called by the system after user confirms a proposal.
    It should NOT be exposed to the LLM for direct calling.
    """

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="apply_transaction",
            description=(
                "INTERNAL: Apply a confirmed transaction to the database. "
                "This tool is called by the system after user confirms a proposal. "
                "Do NOT call this directly."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "date": {
                        "type": "string",
                        "format": "date",
                        "description": "Transaction date (YYYY-MM-DD).",
                    },
                    "type": {
                        "type": "string",
                        "enum": ["income", "expense"],
                        "description": "Transaction type.",
                    },
                    "amount": {
                        "type": "number",
                        "description": "Transaction amount (positive).",
                    },
                    "category_id": {
                        "type": "string",
                        "format": "uuid",
                        "description": "Category ID.",
                    },
                    "account_id": {
                        "type": "string",
                        "format": "uuid",
                        "description": "Account ID.",
                    },
                    "description": {
                        "type": "string",
                        "description": "Transaction description.",
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Transaction tags.",
                    },
                },
                "required": ["date", "type", "amount", "category_id", "account_id", "description"],
            },
            result_schema={
                "type": "object",
                "properties": {
                    "transaction_id": {"type": "string"},
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
            # Parse date
            date_str = arguments["date"]
            if isinstance(date_str, str):
                tx_date = datetime.strptime(date_str, "%Y-%m-%d")
            else:
                tx_date = date_str

            # Create transaction data
            tx_data = TransactionCreate(
                date=tx_date,
                type=arguments["type"],
                amount=Decimal(str(arguments["amount"])),
                category_id=UUID(arguments["category_id"]),
                account_id=UUID(arguments["account_id"]),
                description=arguments["description"],
                tags=arguments.get("tags", []),
            )

            # Create transaction
            transaction = tx_crud.create_transaction(db, tx_data, user_id)

            return ToolResult(
                data={
                    "transaction_id": str(transaction.id),
                    "success": True,
                }
            )

        except Exception as e:
            return ToolResult(success=False, error=str(e))


