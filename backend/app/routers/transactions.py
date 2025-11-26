"""
Transaction API routes.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionFilter,
)
from app.crud import transaction as crud

router = APIRouter()


def transaction_to_response(tx) -> dict:
    """Convert transaction model to response dict with related data."""
    return {
        "id": tx.id,
        "date": tx.date,
        "type": tx.type,
        "amount": tx.amount,
        "category_id": tx.category_id,
        "account_id": tx.account_id,
        "description": tx.description,
        "created_at": tx.created_at,
        "updated_at": tx.updated_at,
        "tags": [t.name for t in tx.tags],
        "category_name": tx.category.name if tx.category else None,
        "category_color": tx.category.color if tx.category else None,
        "category_icon": tx.category.icon if tx.category else None,
        "account_name": tx.account.name if tx.account else None,
    }


@router.get("/count")
def count_transactions(
    account_id: UUID | None = Query(None, description="Filter by account"),
    category_id: UUID | None = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Get count of transactions for the current user.
    Used to show warnings before cascade deletion.
    """
    count = crud.count_transactions(db, user_id, account_id, category_id)
    return {"count": count}


@router.get("/", response_model=list[TransactionResponse])
def list_transactions(
    search: str | None = Query(None, description="Search in description"),
    type: str | None = Query(None, description="Filter by type (income/expense)"),
    category_id: UUID | None = Query(None, description="Filter by category"),
    account_id: UUID | None = Query(None, description="Filter by account"),
    month: str | None = Query(
        None, pattern=r"^\d{4}-\d{2}$", description="Filter by month (YYYY-MM)"
    ),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum records to return"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Get transactions for the current user with filters and pagination.
    Results are ordered by date descending.
    """
    filters = TransactionFilter(
        search=search,
        type=type,
        category_id=category_id,
        account_id=account_id,
        month=month,
        skip=skip,
        limit=limit,
    )
    transactions = crud.get_transactions(db, filters, user_id)
    return [transaction_to_response(tx) for tx in transactions]


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Get a single transaction by ID."""
    tx = crud.get_transaction(db, transaction_id, user_id)
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )
    return transaction_to_response(tx)


@router.post(
    "/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED
)
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Create a new transaction.
    Automatically updates account balance and budget spent amount.
    """
    tx = crud.create_transaction(db, data, user_id)
    # Reload to get relationships
    tx = crud.get_transaction(db, tx.id, user_id)
    return transaction_to_response(tx)


@router.patch("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: UUID,
    data: TransactionUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Update an existing transaction.
    Recalculates account balance and budget spent amount.
    """
    tx = crud.update_transaction(db, transaction_id, data, user_id)
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )
    # Reload to get relationships
    tx = crud.get_transaction(db, tx.id, user_id)
    return transaction_to_response(tx)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Delete a transaction by ID.
    Recalculates account balance and budget spent amount.
    """
    deleted = crud.delete_transaction(db, transaction_id, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )
