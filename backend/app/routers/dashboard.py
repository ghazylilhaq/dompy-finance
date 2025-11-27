"""
Dashboard API routes.
"""

from datetime import datetime, timezone, timedelta
from decimal import Decimal
import calendar

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, extract
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.schemas.dashboard import DashboardStats, MonthlyActivity
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
    - Chart data (last 6 months)
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

    # --- Chart Data (Last 6 Months) ---
    
    # Calculate start date: 1st day of 5 months ago
    # (current month is included, so we go back 5 months to get total 6)
    start_date = now.replace(day=1)
    for _ in range(5):
        start_date = (start_date - timedelta(days=1)).replace(day=1)
    
    # Query grouped by year/month and type
    chart_stmt = (
        select(
            extract('year', Transaction.date).label('year'),
            extract('month', Transaction.date).label('month'),
            Transaction.type,
            func.sum(Transaction.amount).label('total')
        )
        .where(
            Transaction.user_id == user_id,
            Transaction.date >= start_date,
            Transaction.hide_from_summary == False
        )
        .group_by(
            extract('year', Transaction.date),
            extract('month', Transaction.date),
            Transaction.type
        )
    )
    results = db.execute(chart_stmt).all()

    # Map results: (year, month) -> {income, expense}
    data_map = {}
    for r in results:
        key = (int(r.year), int(r.month))
        if key not in data_map:
            data_map[key] = {"income": Decimal(0), "expense": Decimal(0)}
        
        if r.type == "income":
            data_map[key]["income"] = Decimal(str(r.total))
        elif r.type == "expense":
            data_map[key]["expense"] = Decimal(str(r.total))

    # Build list ensuring all 6 months are present
    chart_data = []
    curr = start_date
    # Loop until we pass current month
    # We compare (year, month) to ensure we stop after current month
    target = (now.year, now.month)
    
    while (curr.year, curr.month) <= target:
        key = (curr.year, curr.month)
        stats = data_map.get(key, {"income": Decimal(0), "expense": Decimal(0)})
        
        chart_data.append(
            MonthlyActivity(
                month=curr.strftime("%b"),
                income=stats["income"],
                expense=stats["expense"]
            )
        )
        
        # Move to next month
        # Adding 32 days guarantees we are in the next month, then set to day 1
        next_month = (curr + timedelta(days=32)).replace(day=1)
        curr = next_month

    return DashboardStats(
        total_balance=Decimal(str(total_balance)),
        monthly_income=Decimal(str(monthly_income)),
        monthly_expense=Decimal(str(monthly_expense)),
        chart_data=chart_data
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
