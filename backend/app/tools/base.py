"""
Base classes for Dompy Assistant tools.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from sqlalchemy.orm import Session


class ToolKind(str, Enum):
    """Tool classification for permission handling."""

    READ = "read"  # Auto-execute, no confirmation needed
    WRITE = "write"  # Requires user confirmation


@dataclass
class ToolDefinition:
    """
    Metadata for a tool that the LLM can call.

    Attributes:
        name: Unique tool identifier (e.g., "get_transactions")
        description: Human-readable description for the LLM
        input_schema: JSON Schema for tool arguments
        result_schema: JSON Schema for tool result
        kind: Whether this is a read or write tool
        requires_confirmation: Override for confirmation requirement
    """

    name: str
    description: str
    input_schema: dict[str, Any]
    result_schema: dict[str, Any] = field(default_factory=dict)
    kind: ToolKind = ToolKind.READ
    requires_confirmation: bool | None = None

    def __post_init__(self):
        """Set default confirmation based on kind if not specified."""
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
    Result of executing a tool.

    Attributes:
        data: The result data from the tool
        is_error: Whether the execution failed
        error_message: Error description if is_error is True
        proposals: For write tools, list of proposal payloads
    """

    data: Any = None
    is_error: bool = False
    error_message: str | None = None
    proposals: list[dict[str, Any]] | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        if self.is_error:
            return {"error": self.error_message}
        return {"result": self.data, "proposals": self.proposals}


class BaseTool(ABC):
    """
    Abstract base class for all Dompy Assistant tools.

    Subclasses must implement:
    - definition: ToolDefinition property
    - execute: The actual tool logic
    """

    @property
    @abstractmethod
    def definition(self) -> ToolDefinition:
        """Return the tool's metadata and schema."""
        pass

    @abstractmethod
    def execute(
        self,
        arguments: dict[str, Any],
        db: Session,
        user_id: str,
    ) -> ToolResult:
        """
        Execute the tool with the given arguments.

        Args:
            arguments: Tool arguments from the LLM
            db: Database session
            user_id: Current user's ID

        Returns:
            ToolResult with data or error
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

    def validate_arguments(self, arguments: dict[str, Any]) -> tuple[bool, str | None]:
        """
        Basic argument validation.

        Override for custom validation logic.

        Returns:
            Tuple of (is_valid, error_message)
        """
        required = self.definition.input_schema.get("required", [])
        for field_name in required:
            if field_name not in arguments:
                return False, f"Missing required field: {field_name}"
        return True, None

