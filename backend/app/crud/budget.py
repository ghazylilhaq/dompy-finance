"""
CRUD operations for Budget entity.
"""

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select, func, extract
from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.models.transaction import Transaction
from app.schemas.budget import BudgetCreate, BudgetUpdate


def parse_month(month_str: str) -> date:
    """Convert YYYY-MM string to first day of month date."""
    year, month = month_str.split("-")
    return date(int(year), int(month), 1)


def get_budgets(db: Session, user_id: str, month: str | None = None) -> list[Budget]:
    """
    Get all budgets for a user, optionally filtered by month.
    Includes spent calculation and category info.
    """
    stmt = select(Budget).where(Budget.user_id == user_id).order_by(Budget.month.desc())

    if month:
        month_date = parse_month(month)
        stmt = stmt.where(Budget.month == month_date)

    return list(db.scalars(stmt).all())


def get_budget(db: Session, budget_id: UUID, user_id: str) -> Budget | None:
    """Get a single budget by ID, verifying ownership."""
    stmt = select(Budget).where(Budget.id == budget_id, Budget.user_id == user_id)
    return db.scalars(stmt).first()


def get_budget_by_category_month(
    db: Session,
    category_id: UUID,
    month: date,
    user_id: str,
) -> Budget | None:
    """Get budget for a specific category and month for a user."""
    stmt = select(Budget).where(
        Budget.user_id == user_id,
        Budget.category_id == category_id,
        Budget.month == month,
    )
    return db.scalars(stmt).first()


def create_budget(db: Session, data: BudgetCreate, user_id: str) -> Budget:
    """
    Create a new budget for a user.
    Validates unique constraint (user_id, category_id, month).
    """
    month_date = parse_month(data.month)

    # Check for existing budget
    existing = get_budget_by_category_month(db, data.category_id, month_date, user_id)
    if existing:
        raise ValueError("Budget already exists for this category and month")

    budget = Budget(
        user_id=user_id,
        category_id=data.category_id,
        month=month_date,
        limit_amount=data.limit_amount,
        spent_amount=Decimal("0"),
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)

    # Calculate initial spent amount
    recalculate_spent(db, data.category_id, month_date, user_id)
    db.refresh(budget)

    return budget


def update_budget(
    db: Session, budget_id: UUID, data: BudgetUpdate, user_id: str
) -> Budget | None:
    """Update an existing budget (only limit_amount can be updated), verifying ownership."""
    budget = get_budget(db, budget_id, user_id)
    if not budget:
        return None

    if data.limit_amount is not None:
        budget.limit_amount = data.limit_amount

    db.commit()
    db.refresh(budget)
    return budget


def delete_budget(db: Session, budget_id: UUID, user_id: str) -> bool:
    """Delete a budget by ID, verifying ownership."""
    budget = get_budget(db, budget_id, user_id)
    if not budget:
        return False

    db.delete(budget)
    db.commit()
    return True


def recalculate_spent(
    db: Session, category_id: UUID, month: date, user_id: str
) -> None:
    """
    Recalculate spent_amount for a budget based on transactions.
    Called when transactions are created/updated/deleted.
    Excludes transactions with hide_from_summary=True (transfers).
    """
    budget = get_budget_by_category_month(db, category_id, month, user_id)
    if not budget:
        return

    # Calculate sum of expense transactions for this user's category/month
    # Excludes hidden transactions (like transfers)
    stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        Transaction.user_id == user_id,
        Transaction.category_id == category_id,
        Transaction.type == "expense",
        Transaction.hide_from_summary == False,
        extract("year", Transaction.date) == month.year,
        extract("month", Transaction.date) == month.month,
    )

    spent = db.scalar(stmt)
    budget.spent_amount = Decimal(str(spent))
    db.commit()
