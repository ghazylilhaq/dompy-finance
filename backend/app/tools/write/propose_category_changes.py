"""
Propose Category Changes Tool - Creates category modification proposals.
"""

from typing import Any

from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolDefinition, ToolResult, ToolKind
from app.crud import category as category_crud


class ProposeCategoryChangesTool(BaseTool):
    """
    Creates proposals for category modifications.

    Supports:
    - Creating new categories
    - Renaming categories
    - Deleting categories
    - Merging categories (move transactions, then delete source)
    """

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="propose_category_changes",
            description=(
                "Create proposals for category modifications. "
                "Use this when user wants to create, rename, delete, or merge categories. "
                "The proposals will be shown to user for confirmation."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "instructions": {
                        "type": "string",
                        "description": "Natural language instructions for category changes.",
                    },
                    "changes": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "action": {
                                    "type": "string",
                                    "enum": ["create", "rename", "delete", "merge"],
                                },
                                "category_id": {
                                    "type": "string",
                                    "description": "ID of category to modify (for rename/delete/merge).",
                                },
                                "category_name": {
                                    "type": "string",
                                    "description": "Current or new category name.",
                                },
                                "new_name": {
                                    "type": "string",
                                    "description": "New name (for rename action).",
                                },
                                "type": {
                                    "type": "string",
                                    "enum": ["income", "expense"],
                                    "description": "Category type (for create action).",
                                },
                                "color": {
                                    "type": "string",
                                    "description": "Category color (for create action).",
                                },
                                "icon": {
                                    "type": "string",
                                    "description": "Category icon (for create action).",
                                },
                                "merge_into_id": {
                                    "type": "string",
                                    "description": "Target category ID (for merge action).",
                                },
                                "merge_into_name": {
                                    "type": "string",
                                    "description": "Target category name (for merge action).",
                                },
                            },
                            "required": ["action"],
                        },
                        "description": "List of category changes to propose.",
                    },
                },
                "required": ["changes"],
            },
            result_schema={
                "type": "object",
                "properties": {
                    "proposals": {
                        "type": "array",
                        "items": {"type": "object"},
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
            changes = arguments.get("changes", [])

            if not changes:
                return ToolResult(
                    success=False,
                    error="No changes specified",
                )

            # Get existing categories for validation
            existing_categories = category_crud.get_categories(db, user_id)
            cat_by_id = {str(c.id): c for c in existing_categories}
            cat_by_name = {c.name.lower(): c for c in existing_categories}

            proposals = []
            errors = []

            for change in changes:
                action = change.get("action")
                
                if action == "create":
                    # Validate create
                    name = change.get("category_name")
                    cat_type = change.get("type", "expense")
                    
                    if not name:
                        errors.append("Create action requires category_name")
                        continue

                    if name.lower() in cat_by_name:
                        errors.append(f"Category '{name}' already exists")
                        continue

                    proposals.append({
                        "proposal_type": "category",
                        "payload": {
                            "action": "create",
                            "name": name,
                            "type": cat_type,
                            "color": change.get("color", "#6366f1"),
                            "icon": change.get("icon", "Tag"),
                        },
                    })

                elif action == "rename":
                    cat_id = change.get("category_id")
                    new_name = change.get("new_name")

                    if not cat_id or not new_name:
                        errors.append("Rename action requires category_id and new_name")
                        continue

                    if cat_id not in cat_by_id:
                        errors.append(f"Category {cat_id} not found")
                        continue

                    cat = cat_by_id[cat_id]
                    if cat.is_system:
                        errors.append(f"Cannot rename system category '{cat.name}'")
                        continue

                    proposals.append({
                        "proposal_type": "category",
                        "payload": {
                            "action": "rename",
                            "category_id": cat_id,
                            "current_name": cat.name,
                            "new_name": new_name,
                        },
                    })

                elif action == "delete":
                    cat_id = change.get("category_id")

                    if not cat_id:
                        errors.append("Delete action requires category_id")
                        continue

                    if cat_id not in cat_by_id:
                        errors.append(f"Category {cat_id} not found")
                        continue

                    cat = cat_by_id[cat_id]
                    if cat.is_system:
                        errors.append(f"Cannot delete system category '{cat.name}'")
                        continue

                    proposals.append({
                        "proposal_type": "category",
                        "payload": {
                            "action": "delete",
                            "category_id": cat_id,
                            "category_name": cat.name,
                        },
                    })

                elif action == "merge":
                    cat_id = change.get("category_id")
                    merge_into_id = change.get("merge_into_id")

                    if not cat_id or not merge_into_id:
                        errors.append("Merge action requires category_id and merge_into_id")
                        continue

                    if cat_id not in cat_by_id:
                        errors.append(f"Source category {cat_id} not found")
                        continue

                    if merge_into_id not in cat_by_id:
                        errors.append(f"Target category {merge_into_id} not found")
                        continue

                    source_cat = cat_by_id[cat_id]
                    target_cat = cat_by_id[merge_into_id]

                    if source_cat.is_system:
                        errors.append(f"Cannot merge system category '{source_cat.name}'")
                        continue

                    proposals.append({
                        "proposal_type": "category",
                        "payload": {
                            "action": "merge",
                            "source_category_id": cat_id,
                            "source_category_name": source_cat.name,
                            "target_category_id": merge_into_id,
                            "target_category_name": target_cat.name,
                        },
                    })

                else:
                    errors.append(f"Unknown action: {action}")

            if errors and not proposals:
                return ToolResult(
                    success=False,
                    error="; ".join(errors),
                )

            return ToolResult(
                data={
                    "message": f"Created {len(proposals)} category change proposal(s)",
                    "warnings": errors if errors else None,
                },
                proposals=proposals,
            )

        except Exception as e:
            return ToolResult(success=False, error=str(e))


