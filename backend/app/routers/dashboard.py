"""
Dashboard API routes.
"""

from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, extract
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.schemas.dashboard import DashboardStats
from app.schemas.transaction import TransactionResponse
from app.models.account import Account
from app.models.transaction import Transaction
from app.crud import transaction as tx_crud

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Get dashboard statistics for the current user:
    - Total balance across all accounts
    - Monthly income (current month)
    - Monthly expenses (current month)
    """
    # Total balance for user's accounts
    balance_stmt = select(func.coalesce(func.sum(Account.balance), 0)).where(
        Account.user_id == user_id
    )
    total_balance = db.scalar(balance_stmt)

    # Current month/year
    now = datetime.now(timezone.utc)
    current_month = now.month
    current_year = now.year

    # Monthly income for user (excluding hidden transfers)
    income_stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        Transaction.user_id == user_id,
        Transaction.type == "income",
        Transaction.hide_from_summary == False,
        extract("month", Transaction.date) == current_month,
        extract("year", Transaction.date) == current_year,
    )
    monthly_income = db.scalar(income_stmt)

    # Monthly expenses for user (excluding hidden transfers)
    expense_stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        Transaction.user_id == user_id,
        Transaction.type == "expense",
        Transaction.hide_from_summary == False,
        extract("month", Transaction.date) == current_month,
        extract("year", Transaction.date) == current_year,
    )
    monthly_expense = db.scalar(expense_stmt)

    return DashboardStats(
        total_balance=Decimal(str(total_balance)),
        monthly_income=Decimal(str(monthly_income)),
        monthly_expense=Decimal(str(monthly_expense)),
    )


@router.get("/recent", response_model=list[TransactionResponse])
def get_recent(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Get the 5 most recent transactions for the current user."""
    transactions = tx_crud.get_recent_transactions(db, user_id, limit=5)

    return [
        {
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
        for tx in transactions
    ]
