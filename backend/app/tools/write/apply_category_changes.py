"""
Apply Category Changes Tool - Executes confirmed category modifications.

This tool is INTERNAL ONLY - it should never be called directly by the LLM.
It's used by the system after user confirms a category change proposal.
"""

from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolDefinition, ToolResult, ToolKind
from app.crud import category as category_crud
from app.schemas.category import CategoryCreate, CategoryUpdate


class ApplyCategoryChangesTool(BaseTool):
    """
    Applies confirmed category changes to the database.

    Supports create, rename, delete, and merge operations.
    """

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="apply_category_changes",
            description=(
                "INTERNAL: Apply confirmed category changes to the database. "
                "This tool is called by the system after user confirms a proposal. "
                "Do NOT call this directly."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["create", "rename", "delete", "merge"],
                        "description": "The action to perform.",
                    },
                    "category_id": {
                        "type": "string",
                        "description": "Category ID (for rename/delete/merge source).",
                    },
                    "name": {
                        "type": "string",
                        "description": "Category name (for create) or new name (for rename).",
                    },
                    "new_name": {
                        "type": "string",
                        "description": "New name for rename action.",
                    },
                    "type": {
                        "type": "string",
                        "enum": ["income", "expense"],
                        "description": "Category type (for create).",
                    },
                    "color": {
                        "type": "string",
                        "description": "Category color (for create).",
                    },
                    "icon": {
                        "type": "string",
                        "description": "Category icon (for create).",
                    },
                    "source_category_id": {
                        "type": "string",
                        "description": "Source category ID (for merge).",
                    },
                    "target_category_id": {
                        "type": "string",
                        "description": "Target category ID (for merge).",
                    },
                },
                "required": ["action"],
            },
            result_schema={
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "category_id": {"type": "string"},
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
            action = arguments["action"]

            if action == "create":
                return self._create_category(arguments, db, user_id)
            elif action == "rename":
                return self._rename_category(arguments, db, user_id)
            elif action == "delete":
                return self._delete_category(arguments, db, user_id)
            elif action == "merge":
                return self._merge_category(arguments, db, user_id)
            else:
                return ToolResult(
                    success=False,
                    error=f"Unknown action: {action}",
                )

        except Exception as e:
            return ToolResult(success=False, error=str(e))

    def _create_category(
        self, arguments: dict[str, Any], db: Session, user_id: str
    ) -> ToolResult:
        """Create a new category."""
        cat_data = CategoryCreate(
            name=arguments["name"],
            type=arguments.get("type", "expense"),
            color=arguments.get("color", "#6366f1"),
            icon=arguments.get("icon", "Tag"),
        )
        
        category = category_crud.create_category(db, cat_data, user_id)
        
        return ToolResult(
            data={
                "success": True,
                "category_id": str(category.id),
                "action": "create",
            }
        )

    def _rename_category(
        self, arguments: dict[str, Any], db: Session, user_id: str
    ) -> ToolResult:
        """Rename an existing category."""
        cat_id = UUID(arguments["category_id"])
        new_name = arguments.get("new_name") or arguments.get("name")

        if not new_name:
            return ToolResult(
                success=False,
                error="New name is required for rename",
            )

        update_data = CategoryUpdate(name=new_name)
        category = category_crud.update_category(db, cat_id, update_data, user_id)

        if not category:
            return ToolResult(
                success=False,
                error="Category not found",
            )

        return ToolResult(
            data={
                "success": True,
                "category_id": str(category.id),
                "action": "rename",
            }
        )

    def _delete_category(
        self, arguments: dict[str, Any], db: Session, user_id: str
    ) -> ToolResult:
        """Delete a category."""
        cat_id = UUID(arguments["category_id"])

        # delete_category handles transaction deletion internally
        success, deleted_count = category_crud.delete_category(db, cat_id, user_id)

        if not success:
            return ToolResult(
                success=False,
                error="Category not found or could not be deleted",
            )

        return ToolResult(
            data={
                "success": True,
                "category_id": str(cat_id),
                "action": "delete",
                "deleted_transactions": deleted_count,
            }
        )

    def _merge_category(
        self, arguments: dict[str, Any], db: Session, user_id: str
    ) -> ToolResult:
        """Merge one category into another."""
        source_id = UUID(arguments["source_category_id"])
        target_id = UUID(arguments["target_category_id"])

        # Update all transactions from source to target category
        from sqlalchemy import update
        from app.models.transaction import Transaction

        stmt = (
            update(Transaction)
            .where(
                Transaction.user_id == user_id,
                Transaction.category_id == source_id,
            )
            .values(category_id=target_id)
        )
        db.execute(stmt)

        # Delete the source category (returns tuple)
        success, _ = category_crud.delete_category(db, source_id, user_id)
        
        db.commit()

        return ToolResult(
            data={
                "success": success,
                "source_category_id": str(source_id),
                "target_category_id": str(target_id),
                "action": "merge",
            }
        )

