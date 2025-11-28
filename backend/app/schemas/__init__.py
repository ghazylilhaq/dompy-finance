"""
Pydantic schemas for request/response validation.
"""

from app.schemas.account import (
    AccountCreate,
    AccountUpdate,
    AccountResponse,
)
from app.schemas.category import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CategoryWithChildren,
)
from app.schemas.budget import (
    BudgetCreate,
    BudgetUpdate,
    BudgetResponse,
)
from app.schemas.tag import TagResponse
from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionFilter,
)
from app.schemas.dashboard import DashboardStats
from app.schemas.assistant import (
    MessageRequest,
    MessageResponse,
    ProposalResponse,
    ProposalUpdate,
    ApplyProposalRequest,
    ApplyProposalsResponse,
    ConversationSummary,
    ConversationDetail,
    ConversationListResponse,
    ToolCallInfo,
    ToolResult,
)

__all__ = [
    # Account
    "AccountCreate",
    "AccountUpdate",
    "AccountResponse",
    # Category
    "CategoryCreate",
    "CategoryUpdate",
    "CategoryResponse",
    "CategoryWithChildren",
    # Budget
    "BudgetCreate",
    "BudgetUpdate",
    "BudgetResponse",
    # Tag
    "TagResponse",
    # Transaction
    "TransactionCreate",
    "TransactionUpdate",
    "TransactionResponse",
    "TransactionFilter",
    # Dashboard
    "DashboardStats",
    # Assistant
    "MessageRequest",
    "MessageResponse",
    "ProposalResponse",
    "ProposalUpdate",
    "ApplyProposalRequest",
    "ApplyProposalsResponse",
    "ConversationSummary",
    "ConversationDetail",
    "ConversationListResponse",
    "ToolCallInfo",
    "ToolResult",
]







