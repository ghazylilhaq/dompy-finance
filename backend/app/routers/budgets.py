"""
Budget API routes.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetResponse
from app.crud import budget as crud

router = APIRouter()


def budget_to_response(budget) -> dict:
    """Convert budget model to response dict with computed fields."""
    return {
        "id": budget.id,
        "category_id": budget.category_id,
        "month": budget.month,
        "limit_amount": budget.limit_amount,
        "spent_amount": budget.spent_amount,
        "created_at": budget.created_at,
        "updated_at": budget.updated_at,
        "percentage_used": budget.percentage_used,
        "status": budget.status,
        "category_name": budget.category.name if budget.category else None,
        "category_color": budget.category.color if budget.category else None,
        "category_icon": budget.category.icon if budget.category else None,
    }


@router.get("/", response_model=list[BudgetResponse])
def list_budgets(
    month: str | None = Query(
        None, pattern=r"^\d{4}-\d{2}$", description="Filter by month (YYYY-MM)"
    ),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Get all budgets for the current user, optionally filtered by month."""
    budgets = crud.get_budgets(db, user_id, month=month)
    return [budget_to_response(b) for b in budgets]


@router.get("/{budget_id}", response_model=BudgetResponse)
def get_budget(
    budget_id: UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Get a single budget by ID with progress info."""
    budget = crud.get_budget(db, budget_id, user_id)
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )
    return budget_to_response(budget)


@router.post("/", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    data: BudgetCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Create a new budget.
    Only one budget per category per month is allowed.
    """
    try:
        budget = crud.create_budget(db, data, user_id)
        return budget_to_response(budget)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.patch("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: UUID,
    data: BudgetUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Update an existing budget (limit amount only)."""
    budget = crud.update_budget(db, budget_id, data, user_id)
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )
    return budget_to_response(budget)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Delete a budget by ID."""
    deleted = crud.delete_budget(db, budget_id, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )
