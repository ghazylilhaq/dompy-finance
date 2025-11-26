"""
CRUD operations for Account entity.
"""

from uuid import UUID

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


def delete_account(db: Session, account_id: UUID, user_id: str) -> bool:
    """
    Delete an account by ID, verifying ownership.
    Returns True if deleted, False if not found.
    Note: Will fail if account has associated transactions.
    """
    account = get_account(db, account_id, user_id)
    if not account:
        return False

    db.delete(account)
    db.commit()
    return True


def update_balance(
    db: Session, account_id: UUID, amount_delta: float, user_id: str
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
