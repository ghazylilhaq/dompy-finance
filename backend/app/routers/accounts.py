"""
Account API routes.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse
from app.crud import account as crud

router = APIRouter()


@router.get("/", response_model=list[AccountResponse])
def list_accounts(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Get all accounts for the current user."""
    return crud.get_accounts(db, user_id)


@router.get("/{account_id}", response_model=AccountResponse)
def get_account(
    account_id: UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Get a single account by ID."""
    account = crud.get_account(db, account_id, user_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
    return account


@router.post("/", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(
    data: AccountCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Create a new account."""
    return crud.create_account(db, data, user_id)


@router.patch("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: UUID,
    data: AccountUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Update an existing account."""
    account = crud.update_account(db, account_id, data, user_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account_id: UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Delete an account by ID.
    Cascade deletes all associated transactions first.
    """
    deleted, _transactions_deleted = crud.delete_account(db, account_id, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
