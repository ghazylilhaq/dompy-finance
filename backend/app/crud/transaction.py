"""
CRUD operations for Transaction entity.
"""

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select, or_, extract, func, delete
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


def count_transactions(
    db: Session,
    user_id: str,
    account_id: UUID | None = None,
    category_id: UUID | None = None,
) -> int:
    """
    Count transactions for a user, optionally filtered by account or category.
    Used to show warnings before cascade deletion.
    """
    stmt = select(func.count(Transaction.id)).where(Transaction.user_id == user_id)

    if account_id:
        stmt = stmt.where(Transaction.account_id == account_id)

    if category_id:
        stmt = stmt.where(Transaction.category_id == category_id)

    return db.scalar(stmt) or 0


def delete_transactions_by_account(
    db: Session,
    account_id: UUID,
    user_id: str,
) -> int:
    """
    Delete all transactions for a given account.
    Recalculates budget spent amounts for affected expense transactions.
    Does NOT update account balance since account is being deleted.

    Returns the count of deleted transactions.
    """
    # First, get all transactions to collect budget info for expense transactions
    stmt = select(Transaction).where(
        Transaction.account_id == account_id,
        Transaction.user_id == user_id,
    )
    transactions = list(db.scalars(stmt).all())

    if not transactions:
        return 0

    # Collect unique (category_id, month) pairs for budget recalculation
    affected_budgets: set[tuple[UUID, date]] = set()
    for tx in transactions:
        if tx.type == "expense":
            month_date = date(tx.date.year, tx.date.month, 1)
            affected_budgets.add((tx.category_id, month_date))

    # Delete all transactions in bulk
    delete_stmt = delete(Transaction).where(
        Transaction.account_id == account_id,
        Transaction.user_id == user_id,
    )
    db.execute(delete_stmt)

    # Recalculate all affected budgets
    for category_id, month_date in affected_budgets:
        budget_crud.recalculate_spent(db, category_id, month_date, user_id)

    return len(transactions)


def delete_transactions_by_category(
    db: Session,
    category_id: UUID,
    user_id: str,
    category_ids: list[UUID] | None = None,
) -> int:
    """
    Delete all transactions for a given category (or list of categories).
    Reverses account balances and recalculates budget spent amounts.

    Args:
        db: Database session
        category_id: Primary category ID to delete transactions for
        user_id: User ID for ownership verification
        category_ids: Optional list of category IDs (includes children).
                      If None, only deletes for the single category_id.

    Returns the count of deleted transactions.
    """
    # Build list of category IDs to delete
    ids_to_delete = category_ids if category_ids else [category_id]

    # Get all transactions for these categories
    stmt = select(Transaction).where(
        Transaction.category_id.in_(ids_to_delete),
        Transaction.user_id == user_id,
    )
    transactions = list(db.scalars(stmt).all())

    if not transactions:
        return 0

    # Collect data for account balance reversal and budget recalculation
    affected_budgets: set[tuple[UUID, date]] = set()
    account_deltas: dict[UUID, Decimal] = {}

    for tx in transactions:
        # Calculate balance reversal (undo the transaction effect)
        delta = tx.amount if tx.type == "income" else -tx.amount
        reversal = -delta  # Reverse the original effect

        if tx.account_id not in account_deltas:
            account_deltas[tx.account_id] = Decimal("0")
        account_deltas[tx.account_id] += reversal

        # Track affected budgets for expense transactions
        if tx.type == "expense":
            month_date = date(tx.date.year, tx.date.month, 1)
            affected_budgets.add((tx.category_id, month_date))

    # Delete all transactions in bulk
    delete_stmt = delete(Transaction).where(
        Transaction.category_id.in_(ids_to_delete),
        Transaction.user_id == user_id,
    )
    db.execute(delete_stmt)

    # Reverse account balances
    for acc_id, delta in account_deltas.items():
        account_crud.update_balance(db, acc_id, delta, user_id)

    # Recalculate all affected budgets
    for cat_id, month_date in affected_budgets:
        budget_crud.recalculate_spent(db, cat_id, month_date, user_id)

    return len(transactions)
