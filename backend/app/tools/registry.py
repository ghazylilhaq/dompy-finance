"""
Tool Registry - Central registry for all assistant tools.

Provides tool discovery, definition export, and execution routing.
"""

from typing import Any

from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolDefinition, ToolResult, ToolKind


class ToolRegistry:
    """
    Central registry for assistant tools.

    Maintains a collection of tools and provides methods to:
    - Register new tools
    - Get tool definitions for LLM
    - Execute tools by name
    - Query tool properties (read/write classification)
    """

    def __init__(self):
        self._tools: dict[str, BaseTool] = {}

    def register(self, tool: BaseTool) -> None:
        """Register a tool instance."""
        self._tools[tool.name] = tool

    def get(self, name: str) -> BaseTool | None:
        """Get a tool by name."""
        return self._tools.get(name)

    def get_definitions(self, kind: ToolKind | None = None) -> list[ToolDefinition]:
        """
        Get all tool definitions, optionally filtered by kind.

        Args:
            kind: Optional filter for tool kind (read/write)

        Returns:
            List of ToolDefinition objects
        """
        tools = self._tools.values()
        if kind is not None:
            tools = [t for t in tools if t.kind == kind]
        return [t.definition for t in tools]

    def get_openai_tools(
        self,
        include_internal: bool = False,
    ) -> list[dict[str, Any]]:
        """
        Get tool definitions in OpenAI function calling format.

        Args:
            include_internal: Whether to include apply_* tools (normally hidden)

        Returns:
            List of OpenAI tool definitions
        """
        tools = []
        for tool in self._tools.values():
            # Skip apply_* tools unless explicitly requested
            if not include_internal and tool.name.startswith("apply_"):
                continue
            tools.append(tool.definition.to_openai_function())
        return tools

    def execute(
        self,
        name: str,
        arguments: dict[str, Any],
        db: Session,
        user_id: str,
    ) -> ToolResult:
        """
        Execute a tool by name.

        Args:
            name: Tool name
            arguments: Tool arguments
            db: Database session
            user_id: Current user's ID

        Returns:
            ToolResult from execution
        """
        tool = self.get(name)
        if not tool:
            return ToolResult(
                success=False,
                error=f"Unknown tool: {name}",
            )

        try:
            return tool.execute(arguments, db, user_id)
        except Exception as e:
            return ToolResult(
                success=False,
                error=f"Tool execution failed: {str(e)}",
            )

    def is_read_tool(self, name: str) -> bool:
        """Check if a tool is read-only."""
        tool = self.get(name)
        return tool.is_read_tool if tool else False

    def is_write_tool(self, name: str) -> bool:
        """Check if a tool is a write tool."""
        tool = self.get(name)
        return tool.is_write_tool if tool else False

    def is_proposal_tool(self, name: str) -> bool:
        """Check if a tool generates proposals (propose_* tools)."""
        return name.startswith("propose_")

    def is_apply_tool(self, name: str) -> bool:
        """Check if a tool applies proposals (apply_* tools)."""
        return name.startswith("apply_")

    @property
    def tool_names(self) -> list[str]:
        """Get list of all registered tool names."""
        return list(self._tools.keys())


# Global registry instance
tool_registry = ToolRegistry()


def register_all_tools() -> None:
    """
    Register all available tools with the global registry.

    Called during application startup.
    """
    # Import and register read tools
    from app.tools.read.get_transactions import GetTransactionsTool
    from app.tools.read.get_budget_overview import GetBudgetOverviewTool
    from app.tools.read.get_cashflow_summary import GetCashflowSummaryTool
    from app.tools.read.get_accounts import GetAccountsTool
    from app.tools.read.get_categories import GetCategoriesTool

    tool_registry.register(GetTransactionsTool())
    tool_registry.register(GetBudgetOverviewTool())
    tool_registry.register(GetCashflowSummaryTool())
    tool_registry.register(GetAccountsTool())
    tool_registry.register(GetCategoriesTool())

    # Import and register write tools
    from app.tools.write.propose_transaction import ProposeTransactionTool
    from app.tools.write.apply_transaction import ApplyTransactionTool
    from app.tools.write.propose_budget_plan import ProposeBudgetPlanTool
    from app.tools.write.apply_budget_plan import ApplyBudgetPlanTool

    tool_registry.register(ProposeTransactionTool())
    tool_registry.register(ApplyTransactionTool())
    tool_registry.register(ProposeBudgetPlanTool())
    tool_registry.register(ApplyBudgetPlanTool())



