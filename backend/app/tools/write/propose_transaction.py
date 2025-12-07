"""
Propose Transaction Tool - Creates transaction proposals from user input.
"""

import re
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolDefinition, ToolResult, ToolKind
from app.crud import category as category_crud
from app.crud import account as account_crud


class ProposeTransactionTool(BaseTool):
    """
    Creates transaction proposals from natural language input.

    Parses user text to extract:
    - Amount (e.g., "35k", "Rp 50.000", "100rb")
    - Date (e.g., "today", "yesterday", "kemarin", specific date)
    - Category hints (matched against user's categories)
    - Account hints (matched against user's accounts)
    - Description

    Returns a proposal that must be confirmed by the user.
    """

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="propose_transaction",
            description=(
                "Create a transaction proposal from user input text. "
                "Use this when user wants to add a new transaction. "
                "The proposal will be shown to user for confirmation. "
                "Extract amount, date, category, account, and description from the text."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "source_text": {
                        "type": "string",
                        "description": "The user's original message describing the transaction.",
                    },
                    "amount": {
                        "type": "number",
                        "description": "Transaction amount if you can extract it.",
                    },
                    "transaction_type": {
                        "type": "string",
                        "enum": ["income", "expense"],
                        "description": "Transaction type. Default to 'expense' for purchases.",
                    },
                    "category_hint": {
                        "type": "string",
                        "description": "Category name or keyword from user input.",
                    },
                    "account_hint": {
                        "type": "string",
                        "description": "Account name or keyword from user input.",
                    },
                    "description": {
                        "type": "string",
                        "description": "Transaction description.",
                    },
                    "date": {
                        "type": "string",
                        "format": "date",
                        "description": "Transaction date (YYYY-MM-DD). Defaults to today.",
                    },
                    "fallback_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Fallback date if not specified in source_text.",
                    },
                },
                "required": ["source_text"],
            },
            result_schema={
                "type": "object",
                "properties": {
                    "proposals": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "proposal_type": {"type": "string"},
                                "payload": {"type": "object"},
                            },
                        },
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
            source_text = arguments.get("source_text", "")

            # Get user's categories and accounts for matching
            categories = category_crud.get_categories(db, user_id)
            accounts = account_crud.get_accounts(db, user_id)

            # Extract or use provided values
            amount = arguments.get("amount") or self._parse_amount(source_text)
            tx_type = arguments.get("transaction_type", "expense")
            date_str = arguments.get("date") or arguments.get("fallback_date")
            
            if not date_str:
                date_str = datetime.now().strftime("%Y-%m-%d")

            # Match category
            category_hint = arguments.get("category_hint", "")
            category_id = None
            category_name = None
            
            # Filter categories by type
            type_categories = [c for c in categories if c.type == tx_type and not c.is_system]
            
            if category_hint:
                category_id, category_name = self._match_category(
                    category_hint, type_categories
                )
            
            # If no match found, use first category of the type as default
            if not category_id and type_categories:
                category_id = str(type_categories[0].id)
                category_name = type_categories[0].name

            # Match account
            account_hint = arguments.get("account_hint", "")
            account_id = None
            account_name = None
            
            if account_hint:
                account_id, account_name = self._match_account(account_hint, accounts)
            
            # If no match, use first account as default
            if not account_id and accounts:
                account_id = str(accounts[0].id)
                account_name = accounts[0].name

            # Build description
            description = arguments.get("description") or source_text[:200]

            # Create proposal
            proposal = {
                "proposal_type": "transaction",
                "payload": {
                    "date": date_str,
                    "type": tx_type,
                    "amount": float(amount) if amount else 0,
                    "category_id": category_id,
                    "category_name": category_name,
                    "account_id": account_id,
                    "account_name": account_name,
                    "description": description,
                    "tags": [],
                },
            }

            return ToolResult(
                data={"message": "Transaction proposal created"},
                proposals=[proposal],
            )

        except Exception as e:
            return ToolResult(success=False, error=str(e))

    def _parse_amount(self, text: str) -> float | None:
        """Parse amount from Indonesian-style text."""
        # Common patterns:
        # - "35k", "35K" -> 35000
        # - "35rb", "35ribu" -> 35000
        # - "Rp 50.000" -> 50000
        # - "Rp50000" -> 50000
        # - "50,000" -> 50000
        # - "1.5jt", "1,5juta" -> 1500000

        text = text.lower()

        # Pattern for "jt" / "juta" (millions)
        jt_match = re.search(r"(\d+[.,]?\d*)\s*(jt|juta)", text)
        if jt_match:
            num = jt_match.group(1).replace(",", ".")
            return float(num) * 1_000_000

        # Pattern for "k" / "rb" / "ribu" (thousands)
        k_match = re.search(r"(\d+[.,]?\d*)\s*(k|rb|ribu)", text)
        if k_match:
            num = k_match.group(1).replace(",", ".")
            return float(num) * 1_000

        # Pattern for "Rp" prefix with dots/commas
        rp_match = re.search(r"rp\.?\s*([\d.,]+)", text)
        if rp_match:
            num_str = rp_match.group(1)
            # Remove thousand separators (dots in Indonesian format)
            num_str = num_str.replace(".", "").replace(",", "")
            return float(num_str)

        # Plain number with commas/dots as thousand separator
        num_match = re.search(r"(\d{1,3}(?:[.,]\d{3})+)", text)
        if num_match:
            num_str = num_match.group(1).replace(".", "").replace(",", "")
            return float(num_str)

        # Simple number
        simple_match = re.search(r"(\d+(?:\.\d+)?)", text)
        if simple_match:
            return float(simple_match.group(1))

        return None

    def _match_category(
        self, hint: str, categories: list
    ) -> tuple[str | None, str | None]:
        """Match hint against categories, return (id, name)."""
        hint_lower = hint.lower()

        # Exact match
        for cat in categories:
            if cat.name.lower() == hint_lower:
                return str(cat.id), cat.name

        # Partial match
        for cat in categories:
            if hint_lower in cat.name.lower() or cat.name.lower() in hint_lower:
                return str(cat.id), cat.name

        return None, None

    def _match_account(
        self, hint: str, accounts: list
    ) -> tuple[str | None, str | None]:
        """Match hint against accounts, return (id, name)."""
        hint_lower = hint.lower()

        # Exact match
        for acc in accounts:
            if acc.name.lower() == hint_lower:
                return str(acc.id), acc.name

        # Partial match
        for acc in accounts:
            if hint_lower in acc.name.lower() or acc.name.lower() in hint_lower:
                return str(acc.id), acc.name

        return None, None


