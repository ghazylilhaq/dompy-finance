"""
CRUD operations for Category entity.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


def get_categories(
    db: Session,
    user_id: str,
    category_type: str | None = None,
) -> list[Category]:
    """
    Get all categories for a user, optionally filtered by type.
    Ordered by type, then name.
    """
    stmt = (
        select(Category)
        .where(Category.user_id == user_id)
        .order_by(Category.type, Category.name)
    )

    if category_type:
        stmt = stmt.where(Category.type == category_type)

    return list(db.scalars(stmt).all())


def get_categories_hierarchical(db: Session, user_id: str) -> dict[str, list[Category]]:
    """
    Get categories for a user organized hierarchically.
    Returns dict with 'income' and 'expense' keys, each containing parent categories.
    Children are loaded via relationship.
    """
    stmt = (
        select(Category)
        .where(Category.user_id == user_id, Category.parent_id.is_(None))
        .order_by(Category.type, Category.name)
    )
    parents = list(db.scalars(stmt).all())

    return {
        "income": [c for c in parents if c.type == "income"],
        "expense": [c for c in parents if c.type == "expense"],
    }


def get_category(db: Session, category_id: UUID, user_id: str) -> Category | None:
    """Get a single category by ID, verifying ownership."""
    stmt = select(Category).where(
        Category.id == category_id, Category.user_id == user_id
    )
    return db.scalars(stmt).first()


def create_category(db: Session, data: CategoryCreate, user_id: str) -> Category:
    """
    Create a new category for a user.
    Validates 2-level hierarchy constraint.
    """
    # Validate parent if provided
    if data.parent_id:
        parent = get_category(db, data.parent_id, user_id)
        if not parent:
            raise ValueError("Parent category not found")
        if parent.parent_id is not None:
            raise ValueError("Cannot create more than 2 levels of category hierarchy")
        if parent.type != data.type:
            raise ValueError("Child category must have the same type as parent")

    category = Category(**data.model_dump(), user_id=user_id)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(
    db: Session, category_id: UUID, data: CategoryUpdate, user_id: str
) -> Category | None:
    """Update an existing category, verifying ownership."""
    category = get_category(db, category_id, user_id)
    if not category:
        return None

    update_data = data.model_dump(exclude_unset=True)

    # Validate parent_id if being updated
    if "parent_id" in update_data and update_data["parent_id"]:
        parent = get_category(db, update_data["parent_id"], user_id)
        if not parent:
            raise ValueError("Parent category not found")
        if parent.parent_id is not None:
            raise ValueError("Cannot create more than 2 levels of category hierarchy")

        # Check type consistency
        new_type = update_data.get("type", category.type)
        if parent.type != new_type:
            raise ValueError("Child category must have the same type as parent")

    for field, value in update_data.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)
    return category


def delete_category(
    db: Session, category_id: UUID, user_id: str
) -> tuple[bool, int]:
    """
    Delete a category by ID, verifying ownership.
    First deletes all associated transactions (cascade delete).
    Children will have their parent_id set to NULL (ON DELETE SET NULL).

    Note: Only deletes transactions for this category, not child categories.
    Child categories retain their transactions and become root categories.

    Returns:
        tuple[bool, int]: (success, deleted_transaction_count)
        - (False, 0) if category not found
        - (True, count) if deleted successfully
    """
    # Import here to avoid circular imports
    from app.crud import transaction as transaction_crud

    category = get_category(db, category_id, user_id)
    if not category:
        return (False, 0)

    # Cascade delete all transactions for this category only
    # (child categories retain their transactions)
    deleted_count = transaction_crud.delete_transactions_by_category(
        db, category_id, user_id
    )

    db.delete(category)
    db.commit()
    return (True, deleted_count)
