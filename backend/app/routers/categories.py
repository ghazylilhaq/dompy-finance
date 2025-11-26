"""
Category API routes.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.auth import get_current_user
from app.schemas.category import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CategoryWithChildren,
)
from app.crud import category as crud

router = APIRouter()


@router.get("/", response_model=list[CategoryResponse])
def list_categories(
    type: str | None = Query(None, description="Filter by type (income/expense)"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Get all categories for the current user, optionally filtered by type."""
    return crud.get_categories(db, user_id, category_type=type)


@router.get("/hierarchical")
def list_hierarchical(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Get categories organized hierarchically.
    Returns dict with 'income' and 'expense' keys containing parent categories with children.
    """
    result = crud.get_categories_hierarchical(db, user_id)

    # Convert to response format with children
    def to_response(cat) -> dict:
        return {
            "id": cat.id,
            "name": cat.name,
            "type": cat.type,
            "color": cat.color,
            "icon": cat.icon,
            "parent_id": cat.parent_id,
            "created_at": cat.created_at,
            "updated_at": cat.updated_at,
            "children": [
                {
                    "id": c.id,
                    "name": c.name,
                    "type": c.type,
                    "color": c.color,
                    "icon": c.icon,
                    "parent_id": c.parent_id,
                    "created_at": c.created_at,
                    "updated_at": c.updated_at,
                }
                for c in cat.children
            ],
        }

    return {
        "income": [to_response(c) for c in result["income"]],
        "expense": [to_response(c) for c in result["expense"]],
    }


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(
    category_id: UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Get a single category by ID."""
    category = crud.get_category(db, category_id, user_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    return category


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Create a new category.
    Validates 2-level hierarchy constraint.
    """
    try:
        return crud.create_category(db, data, user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.patch("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: UUID,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Update an existing category."""
    try:
        category = crud.update_category(db, category_id, data, user_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )
        return category
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Delete a category by ID.
    Children will have their parent_id set to NULL.
    Will fail if category has associated transactions.
    """
    try:
        deleted = crud.delete_category(db, category_id, user_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete category with associated transactions",
        )
