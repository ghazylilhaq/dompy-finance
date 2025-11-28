"""
Base classes for the Dompy Assistant tool system.

Provides the foundational abstractions for defining and executing tools.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from sqlalchemy.orm import Session


class ToolKind(str, Enum):
    """Classification of tool types."""

    READ = "read"  # Read-only data access, auto-executed
    WRITE = "write"  # Data modification, requires confirmation


@dataclass
class ToolDefinition:
    """
    Metadata describing a tool's interface.

    Attributes:
        name: Unique tool identifier (e.g., "get_transactions")
        description: Human-readable description for the LLM
        input_schema: JSON Schema describing expected input
        result_schema: JSON Schema describing output format
        kind: Tool classification (read/write)
        requires_confirmation: Whether user must confirm (defaults to kind == write)
    """

    name: str
    description: str
    input_schema: dict[str, Any]
    result_schema: dict[str, Any] = field(default_factory=dict)
    kind: ToolKind = ToolKind.READ
    requires_confirmation: bool | None = None

    def __post_init__(self):
        if self.requires_confirmation is None:
            self.requires_confirmation = self.kind == ToolKind.WRITE

    def to_openai_function(self) -> dict[str, Any]:
        """Convert to OpenAI function calling format."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.input_schema,
            },
        }


@dataclass
class ToolResult:
    """
    Result of tool execution.

    Attributes:
        success: Whether execution succeeded
        data: Result data (varies by tool)
        error: Error message if failed
        proposals: List of proposals generated (for propose_* tools)
    """

    success: bool
    data: Any = None
    error: str | None = None
    proposals: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = {"success": self.success}
        if self.data is not None:
            result["data"] = self.data
        if self.error:
            result["error"] = self.error
        if self.proposals:
            result["proposals"] = self.proposals
        return result


class BaseTool(ABC):
    """
    Abstract base class for all assistant tools.

    Subclasses must implement:
    - definition: Property returning ToolDefinition
    - execute: Method that performs the tool's action
    """

    @property
    @abstractmethod
    def definition(self) -> ToolDefinition:
        """Return the tool's definition metadata."""
        pass

    @abstractmethod
    def execute(
        self,
        arguments: dict[str, Any],
        db: Session,
        user_id: str,
    ) -> ToolResult:
        """
        Execute the tool with given arguments.

        Args:
            arguments: Parsed arguments matching input_schema
            db: Database session
            user_id: Current user's ID

        Returns:
            ToolResult with success status and data/error
        """
        pass

    @property
    def name(self) -> str:
        """Convenience property for tool name."""
        return self.definition.name

    @property
    def kind(self) -> ToolKind:
        """Convenience property for tool kind."""
        return self.definition.kind

    @property
    def is_read_tool(self) -> bool:
        """Check if this is a read-only tool."""
        return self.kind == ToolKind.READ

    @property
    def is_write_tool(self) -> bool:
        """Check if this is a write tool."""
        return self.kind == ToolKind.WRITE



