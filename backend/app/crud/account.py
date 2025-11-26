"""
CRUD operations for Account entity.
"""

from uuid import UUID
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.schemas.account import AccountCreate, AccountUpdate


def get_accounts(db: Session, user_id: str) -> list[Account]:
    """Get all accounts for a user ordered by name."""
    stmt = select(Account).where(Account.user_id == user_id).order_by(Account.name)
    return list(db.scalars(stmt).all())


def get_account(db: Session, account_id: UUID, user_id: str) -> Account | None:
    """Get a single account by ID, verifying ownership."""
    stmt = select(Account).where(Account.id == account_id, Account.user_id == user_id)
    return db.scalars(stmt).first()


def create_account(db: Session, data: AccountCreate, user_id: str) -> Account:
    """Create a new account for a user."""
    account = Account(**data.model_dump(), user_id=user_id)
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def update_account(
    db: Session, account_id: UUID, data: AccountUpdate, user_id: str
) -> Account | None:
    """Update an existing account, verifying ownership."""
    account = get_account(db, account_id, user_id)
    if not account:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)

    db.commit()
    db.refresh(account)
    return account


def delete_account(
    db: Session, account_id: UUID, user_id: str
) -> tuple[bool, int]:
    """
    Delete an account by ID, verifying ownership.
    First deletes all associated transactions (cascade delete).

    Returns:
        tuple[bool, int]: (success, deleted_transaction_count)
        - (False, 0) if account not found
        - (True, count) if deleted successfully
    """
    # Import here to avoid circular imports
    from app.crud import transaction as transaction_crud

    account = get_account(db, account_id, user_id)
    if not account:
        return (False, 0)

    # Cascade delete all transactions for this account
    deleted_count = transaction_crud.delete_transactions_by_account(
        db, account_id, user_id
    )

    db.delete(account)
    db.commit()
    return (True, deleted_count)


def update_balance(
    db: Session, account_id: UUID, amount_delta: Decimal, user_id: str
) -> Account | None:
    """
    Update account balance by a delta amount.
    Positive delta increases balance, negative decreases.
    """
    account = get_account(db, account_id, user_id)
    if not account:
        return None

    account.balance = account.balance + amount_delta
    db.commit()
    db.refresh(account)
    return account
