"""
NeoBudget API - FastAPI Application Entry Point

A personal finance management API with support for:
- Multi-account management (cash, bank, e-wallet, credit card)
- Hierarchical categories (2-level parent-child)
- Monthly budgets with spending tracking
- Tagged transactions
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    accounts,
    categories,
    budgets,
    transactions,
    tags,
    dashboard,
    imports,
    onboarding,
)


# Create FastAPI application
app = FastAPI(
    title="NeoBudget API",
    description="Personal finance management API for the NeoBudget application",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(
    accounts.router,
    prefix="/api/accounts",
    tags=["Accounts"],
)
app.include_router(
    categories.router,
    prefix="/api/categories",
    tags=["Categories"],
)
app.include_router(
    budgets.router,
    prefix="/api/budgets",
    tags=["Budgets"],
)
app.include_router(
    transactions.router,
    prefix="/api/transactions",
    tags=["Transactions"],
)
app.include_router(
    tags.router,
    prefix="/api/tags",
    tags=["Tags"],
)
app.include_router(
    dashboard.router,
    prefix="/api/dashboard",
    tags=["Dashboard"],
)
app.include_router(
    imports.router,
    prefix="/api/imports",
    tags=["Imports"],
)
app.include_router(
    onboarding.router,
    prefix="/api/onboarding",
    tags=["Onboarding"],
)


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/", tags=["Root"])
def root():
    """Root endpoint with API information."""
    return {
        "name": "NeoBudget API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }
