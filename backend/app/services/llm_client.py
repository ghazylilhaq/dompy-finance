"""
LLM Client - OpenAI API wrapper for Dompy Assistant.
"""

import json
from dataclasses import dataclass
from typing import Any

from openai import OpenAI

from app.config import settings


@dataclass
class ToolCall:
    """Represents a tool call from the LLM."""

    id: str
    name: str
    arguments: dict[str, Any]


@dataclass
class LLMResponse:
    """Response from the LLM."""

    content: str | None
    tool_calls: list[ToolCall]
    finish_reason: str


class LLMClient:
    """
    OpenAI API client for chat completions with tool calling.

    Handles:
    - Chat completion requests
    - Tool call parsing
    - Error handling
    """

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
    ):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.ASSISTANT_MODEL
        
        if not self.api_key:
            raise ValueError("OpenAI API key not configured")
        
        self.client = OpenAI(api_key=self.api_key)

    def chat_completion(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        tool_choice: str = "auto",
    ) -> LLMResponse:
        """
        Send a chat completion request to OpenAI.

        Args:
            messages: List of messages in OpenAI format
            tools: Optional list of tool definitions
            tool_choice: Tool selection mode ("auto", "none", or specific tool)

        Returns:
            LLMResponse with content and/or tool calls
        """
        try:
            # Build request kwargs
            kwargs: dict[str, Any] = {
                "model": self.model,
                "messages": messages,
            }

            if tools:
                kwargs["tools"] = tools
                kwargs["tool_choice"] = tool_choice

            # Make API call
            response = self.client.chat.completions.create(**kwargs)
            
            # Parse response
            choice = response.choices[0]
            message = choice.message

            # Extract tool calls
            tool_calls = []
            if message.tool_calls:
                for tc in message.tool_calls:
                    try:
                        arguments = json.loads(tc.function.arguments)
                    except json.JSONDecodeError:
                        arguments = {}
                    
                    tool_calls.append(
                        ToolCall(
                            id=tc.id,
                            name=tc.function.name,
                            arguments=arguments,
                        )
                    )

            return LLMResponse(
                content=message.content,
                tool_calls=tool_calls,
                finish_reason=choice.finish_reason,
            )

        except Exception as e:
            # Return error as content for now
            return LLMResponse(
                content=f"Error calling LLM: {str(e)}",
                tool_calls=[],
                finish_reason="error",
            )

    def build_system_prompt(
        self,
        current_date: str,
        accounts: list[dict[str, Any]],
        categories: dict[str, list[dict[str, Any]]],
    ) -> str:
        """
        Build the system prompt with user context.

        Args:
            current_date: Today's date string
            accounts: List of user's accounts
            categories: Dict with income/expense category lists
        """
        # Format account list
        account_list = ", ".join(
            f"{a['name']} ({a['type']})" for a in accounts
        ) or "No accounts yet"

        # Format category lists
        expense_cats = ", ".join(
            c["name"] for c in categories.get("expense_categories", [])
        ) or "No categories yet"
        
        income_cats = ", ".join(
            c["name"] for c in categories.get("income_categories", [])
        ) or "No categories yet"

        return f"""You are Dompy, a helpful personal finance assistant for Indonesian users. You help users manage their transactions, budgets, and accounts.

## Your Capabilities

You have access to tools that let you:
- Read financial data: transactions, budgets, accounts, summaries
- Propose changes: new transactions, budget plans, category modifications

## Tool Usage Rules

1. **Read tools** (get_transactions, get_budget_overview, get_cashflow_summary, get_accounts, get_categories):
   - Use freely to answer questions about user's finances
   - These execute automatically

2. **Propose tools** (propose_transaction, propose_budget_plan, propose_category_changes):
   - Use when user wants to add/change data
   - These create proposals that user must confirm
   - Never assume confirmation - always wait for user

3. You should NEVER mention "apply_" tools - they are internal system tools.

## Conversation Style

- Be concise and helpful
- Respond in the user's language (detect from their message)
- When proposing changes, explain briefly what you're creating
- If unsure about something (amount, category, date), ask
- Format currency as Indonesian Rupiah using "Rp" prefix with dots for thousands (e.g., Rp 50.000)

## Context

Today's date: {current_date}
User's accounts: {account_list}
User's expense categories: {expense_cats}
User's income categories: {income_cats}

Remember: Always be helpful, accurate, and respect user privacy."""


# Global client instance
_llm_client: LLMClient | None = None


def get_llm_client() -> LLMClient:
    """Get the global LLM client instance (singleton)."""
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client


