"""
CRUD operations for Transaction entity.
"""

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select, or_, extract
from sqlalchemy.orm import Session, joinedload

from app.models.transaction import Transaction
from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionFilter,
)
from app.crud import tag as tag_crud
from app.crud import account as account_crud
from app.crud import budget as budget_crud


def get_transactions(
    db: Session, filters: TransactionFilter, user_id: str
) -> list[Transaction]:
    """
    Get transactions for a user with filters and pagination.
    Includes related category, account, and tags.
    """
    stmt = (
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .options(
            joinedload(Transaction.category),
            joinedload(Transaction.account),
            joinedload(Transaction.tags),
        )
        .order_by(Transaction.date.desc())
    )

    # Apply filters
    if filters.search:
        stmt = stmt.where(Transaction.description.ilike(f"%{filters.search}%"))

    if filters.type:
        stmt = stmt.where(Transaction.type == filters.type)

    if filters.category_id:
        stmt = stmt.where(Transaction.category_id == filters.category_id)

    if filters.account_id:
        stmt = stmt.where(Transaction.account_id == filters.account_id)

    if filters.month:
        year, month = filters.month.split("-")
        stmt = stmt.where(
            extract("year", Transaction.date) == int(year),
            extract("month", Transaction.date) == int(month),
        )

    # Pagination
    stmt = stmt.offset(filters.skip).limit(filters.limit)

    return list(db.scalars(stmt).unique().all())


def get_transaction(
    db: Session, transaction_id: UUID, user_id: str
) -> Transaction | None:
    """Get a single transaction by ID with related data, verifying ownership."""
    stmt = (
        select(Transaction)
        .where(Transaction.id == transaction_id, Transaction.user_id == user_id)
        .options(
            joinedload(Transaction.category),
            joinedload(Transaction.account),
            joinedload(Transaction.tags),
        )
    )
    return db.scalars(stmt).first()


def get_recent_transactions(
    db: Session, user_id: str, limit: int = 5
) -> list[Transaction]:
    """Get the most recent transactions for a user."""
    stmt = (
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .options(
            joinedload(Transaction.category),
            joinedload(Transaction.account),
            joinedload(Transaction.tags),
        )
        .order_by(Transaction.date.desc())
        .limit(limit)
    )
    return list(db.scalars(stmt).unique().all())


def create_transaction(
    db: Session, data: TransactionCreate, user_id: str
) -> Transaction:
    """
    Create a new transaction for a user.
    Updates account balance and budget spent amount.
    """
    # Get or create tags
    tags = tag_crud.get_or_create_tags(db, data.tags, user_id)

    # Create transaction
    transaction = Transaction(
        user_id=user_id,
        date=data.date,
        type=data.type,
        amount=data.amount,
        category_id=data.category_id,
        account_id=data.account_id,
        description=data.description,
        tags=tags,
    )
    db.add(transaction)
    db.flush()

    # Update account balance
    delta = data.amount if data.type == "income" else -data.amount
    account_crud.update_balance(db, data.account_id, delta, user_id)

    # Update budget spent if expense
    if data.type == "expense":
        month_date = date(data.date.year, data.date.month, 1)
        budget_crud.recalculate_spent(db, data.category_id, month_date, user_id)

    db.commit()
    db.refresh(transaction)
    return transaction


def update_transaction(
    db: Session,
    transaction_id: UUID,
    data: TransactionUpdate,
    user_id: str,
) -> Transaction | None:
    """
    Update an existing transaction, verifying ownership.
    Handles balance and budget recalculations.
    """
    transaction = get_transaction(db, transaction_id, user_id)
    if not transaction:
        return None

    # Store old values for recalculation
    old_type = transaction.type
    old_amount = transaction.amount
    old_account_id = transaction.account_id
    old_category_id = transaction.category_id
    old_date = transaction.date

    # Update fields
    update_data = data.model_dump(exclude_unset=True)

    if "tags" in update_data:
        transaction.tags = tag_crud.get_or_create_tags(
            db, update_data.pop("tags"), user_id
        )

    for field, value in update_data.items():
        setattr(transaction, field, value)

    db.flush()

    # Recalculate account balances
    # Reverse old transaction effect
    old_delta = old_amount if old_type == "income" else -old_amount
    account_crud.update_balance(db, old_account_id, -old_delta, user_id)

    # Apply new transaction effect
    new_delta = (
        transaction.amount
        if transaction.type == "income"
        else -transaction.amount
    )
    account_crud.update_balance(db, transaction.account_id, new_delta, user_id)

    # Recalculate budgets
    if old_type == "expense":
        old_month = date(old_date.year, old_date.month, 1)
        budget_crud.recalculate_spent(db, old_category_id, old_month, user_id)

    if transaction.type == "expense":
        new_month = date(transaction.date.year, transaction.date.month, 1)
        budget_crud.recalculate_spent(db, transaction.category_id, new_month, user_id)

    db.commit()
    db.refresh(transaction)
    return transaction


def delete_transaction(db: Session, transaction_id: UUID, user_id: str) -> bool:
    """
    Delete a transaction by ID, verifying ownership.
    Recalculates account balance and budget spent.
    """
    transaction = get_transaction(db, transaction_id, user_id)
    if not transaction:
        return False

    # Store values for recalculation
    tx_type = transaction.type
    tx_amount = transaction.amount
    tx_account_id = transaction.account_id
    tx_category_id = transaction.category_id
    tx_date = transaction.date

    db.delete(transaction)
    db.flush()

    # Reverse account balance change
    delta = tx_amount if tx_type == "income" else -tx_amount
    account_crud.update_balance(db, tx_account_id, -delta, user_id)

    # Recalculate budget if expense
    if tx_type == "expense":
        month_date = date(tx_date.year, tx_date.month, 1)
        budget_crud.recalculate_spent(db, tx_category_id, month_date, user_id)

    db.commit()
    return True
