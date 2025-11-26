"""
CRUD operations for Transaction entity.
"""

import uuid as uuid_module
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
    TransferCreate,
)
from app.crud import tag as tag_crud
from app.crud import account as account_crud
from app.crud import budget as budget_crud
from app.crud import category as category_crud


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
        transaction.amount if transaction.type == "income" else -transaction.amount
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


# =============================================================================
# Transfer Operations
# =============================================================================


def create_transfer(
    db: Session, data: TransferCreate, user_id: str
) -> tuple[Transaction, Transaction]:
    """
    Create a transfer between two accounts.
    Creates two linked transactions (outgoing and incoming) in a single DB transaction.

    Returns tuple of (outgoing_transaction, incoming_transaction).
    """
    # Validate accounts are different
    if data.from_account_id == data.to_account_id:
        raise ValueError("Cannot transfer to the same account")

    # Ensure transfer categories exist
    transfer_cats = category_crud.ensure_transfer_categories(db, user_id)

    # Generate transfer group ID
    transfer_group_id = str(uuid_module.uuid4())

    # Create outgoing transaction (expense from source account)
    outgoing = Transaction(
        user_id=user_id,
        date=data.date,
        type="expense",
        amount=data.amount,
        category_id=transfer_cats["outgoing"],
        account_id=data.from_account_id,
        description=data.description,
        is_transfer=True,
        transfer_group_id=transfer_group_id,
        hide_from_summary=data.hide_from_summary,
        tags=[],
    )
    db.add(outgoing)

    # Create incoming transaction (income to destination account)
    incoming = Transaction(
        user_id=user_id,
        date=data.date,
        type="income",
        amount=data.amount,
        category_id=transfer_cats["incoming"],
        account_id=data.to_account_id,
        description=data.description,
        is_transfer=True,
        transfer_group_id=transfer_group_id,
        hide_from_summary=data.hide_from_summary,
        tags=[],
    )
    db.add(incoming)
    db.flush()

    # Update account balances
    # Source account: subtract amount
    account_crud.update_balance(db, data.from_account_id, -data.amount, user_id)
    # Destination account: add amount
    account_crud.update_balance(db, data.to_account_id, data.amount, user_id)

    db.commit()
    db.refresh(outgoing)
    db.refresh(incoming)

    return (outgoing, incoming)


def get_transfer_pair(
    db: Session, transfer_group_id: str, user_id: str
) -> list[Transaction]:
    """
    Get both transactions in a transfer pair by transfer_group_id.
    """
    stmt = (
        select(Transaction)
        .where(
            Transaction.transfer_group_id == transfer_group_id,
            Transaction.user_id == user_id,
        )
        .options(
            joinedload(Transaction.category),
            joinedload(Transaction.account),
            joinedload(Transaction.tags),
        )
    )
    return list(db.scalars(stmt).unique().all())


def get_paired_transaction(
    db: Session, transaction: Transaction, user_id: str
) -> Transaction | None:
    """
    Get the paired transaction for a transfer leg.
    """
    if not transaction.is_transfer or not transaction.transfer_group_id:
        return None

    stmt = (
        select(Transaction)
        .where(
            Transaction.transfer_group_id == transaction.transfer_group_id,
            Transaction.user_id == user_id,
            Transaction.id != transaction.id,
        )
        .options(
            joinedload(Transaction.category),
            joinedload(Transaction.account),
            joinedload(Transaction.tags),
        )
    )
    return db.scalars(stmt).first()


def update_transfer(
    db: Session,
    transaction_id: UUID,
    data: TransactionUpdate,
    user_id: str,
) -> tuple[Transaction, Transaction] | None:
    """
    Update a transfer transaction. Updates both legs with shared fields.

    Shared fields that update both legs: amount, date, description, hide_from_summary
    Account and category changes are not allowed for transfers.

    Returns tuple of (updated_outgoing, updated_incoming) or None if not found.
    """
    transaction = get_transaction(db, transaction_id, user_id)
    if not transaction or not transaction.is_transfer:
        return None

    paired = get_paired_transaction(db, transaction, user_id)
    if not paired:
        return None

    # Determine which is outgoing and which is incoming
    if transaction.type == "expense":
        outgoing, incoming = transaction, paired
    else:
        outgoing, incoming = paired, transaction

    update_data = data.model_dump(exclude_unset=True)

    # Remove fields that shouldn't be changed for transfers
    update_data.pop("type", None)
    update_data.pop("category_id", None)
    update_data.pop("account_id", None)
    update_data.pop("tags", None)

    # Handle amount change - need to recalculate balances
    if "amount" in update_data:
        old_amount = outgoing.amount
        new_amount = update_data["amount"]

        # Reverse old effect and apply new
        # Outgoing account: was -old, now -new, delta = old - new
        account_crud.update_balance(
            db, outgoing.account_id, old_amount - new_amount, user_id
        )
        # Incoming account: was +old, now +new, delta = new - old
        account_crud.update_balance(
            db, incoming.account_id, new_amount - old_amount, user_id
        )

    # Apply updates to both transactions
    for field, value in update_data.items():
        setattr(outgoing, field, value)
        setattr(incoming, field, value)

    db.commit()
    db.refresh(outgoing)
    db.refresh(incoming)

    return (outgoing, incoming)


def delete_transfer(db: Session, transaction_id: UUID, user_id: str) -> bool:
    """
    Delete a transfer transaction. Deletes both legs.
    Reverses account balance changes for both accounts.

    Returns True if deleted, False if not found or not a transfer.
    """
    transaction = get_transaction(db, transaction_id, user_id)
    if not transaction or not transaction.is_transfer:
        return False

    paired = get_paired_transaction(db, transaction, user_id)
    if not paired:
        # Orphaned transfer leg - just delete it
        db.delete(transaction)
        db.commit()
        return True

    # Determine which is outgoing and which is incoming
    if transaction.type == "expense":
        outgoing, incoming = transaction, paired
    else:
        outgoing, incoming = paired, transaction

    # Reverse account balance changes
    # Outgoing was -amount, so add it back
    account_crud.update_balance(db, outgoing.account_id, outgoing.amount, user_id)
    # Incoming was +amount, so subtract it
    account_crud.update_balance(db, incoming.account_id, -incoming.amount, user_id)

    # Delete both transactions
    db.delete(outgoing)
    db.delete(incoming)
    db.commit()

    return True
