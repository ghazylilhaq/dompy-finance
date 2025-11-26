# Feature 0007: FastAPI Backend with PostgreSQL

## Context

Build a clean, well-documented FastAPI backend with CRUD operations for all entities. Uses PostgreSQL via Docker for development and Alembic for migrations. Follows the database schema defined in `docs/DATABASE_DESIGN.md`.

---

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Settings (pydantic-settings)
│   ├── database.py             # SQLAlchemy engine & session
│   ├── models/                 # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── account.py
│   │   ├── category.py
│   │   ├── budget.py
│   │   ├── transaction.py
│   │   └── tag.py
│   ├── schemas/                # Pydantic request/response schemas
│   │   ├── __init__.py
│   │   ├── account.py
│   │   ├── category.py
│   │   ├── budget.py
│   │   ├── transaction.py
│   │   ├── tag.py
│   │   └── dashboard.py
│   ├── crud/                   # Database operations
│   │   ├── __init__.py
│   │   ├── account.py
│   │   ├── category.py
│   │   ├── budget.py
│   │   ├── transaction.py
│   │   └── tag.py
│   └── routers/                # API route handlers
│       ├── __init__.py
│       ├── accounts.py
│       ├── categories.py
│       ├── budgets.py
│       ├── transactions.py
│       ├── tags.py
│       └── dashboard.py
├── alembic/                    # Migrations
│   ├── versions/
│   ├── env.py
│   └── script.py.mako
├── alembic.ini
├── docker-compose.yml          # PostgreSQL for dev
├── requirements.txt
├── .env.example
└── README.md
```

---

## Phase 1: Infrastructure Setup

### 1.1 Docker Compose (`docker-compose.yml`)

PostgreSQL 16 container for local development:

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: neobudget_db
    environment:
      POSTGRES_USER: neobudget
      POSTGRES_PASSWORD: neobudget_dev
      POSTGRES_DB: neobudget
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### 1.2 Dependencies (`requirements.txt`)

```
fastapi==0.115.5
uvicorn[standard]==0.32.1
sqlalchemy==2.0.36
psycopg2-binary==2.9.10
alembic==1.14.0
pydantic==2.10.2
pydantic-settings==2.6.1
python-dotenv==1.0.1
```

### 1.3 Configuration (`app/config.py`)

Environment-based settings using `pydantic-settings`:

- `DATABASE_URL`: PostgreSQL connection string
- `DEBUG`: Enable/disable debug mode
- `CORS_ORIGINS`: Allowed origins for frontend

### 1.4 Database Connection (`app/database.py`)

- SQLAlchemy `create_engine` with connection pool
- `SessionLocal` factory for request-scoped sessions
- `get_db` dependency for FastAPI routes
- `Base` declarative base for models

---

## Phase 2: SQLAlchemy Models

Based on `docs/DATABASE_DESIGN.md`, create ORM models:

### 2.1 `models/account.py`

```python
class Account(Base):
    __tablename__ = "accounts"
    
    id: Mapped[uuid.UUID]           # PK, default uuid4
    name: Mapped[str]               # VARCHAR(100)
    type: Mapped[str]               # CHECK: cash, bank, e-wallet, credit_card
    balance: Mapped[Decimal]        # DECIMAL(15,2), default 0
    color: Mapped[str]              # VARCHAR(7) - hex color
    icon: Mapped[str]               # VARCHAR(50) - Lucide icon name
    created_at: Mapped[datetime]    # TIMESTAMP WITH TZ
    updated_at: Mapped[datetime]    # TIMESTAMP WITH TZ
```

### 2.2 `models/category.py`

```python
class Category(Base):
    __tablename__ = "categories"
    
    id: Mapped[uuid.UUID]
    name: Mapped[str]
    type: Mapped[str]               # income | expense
    color: Mapped[str]
    icon: Mapped[str]
    parent_id: Mapped[uuid.UUID | None]  # FK self-referential
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
    
    # Relationships
    parent: Mapped["Category"] = relationship(back_populates="children", remote_side=[id])
    children: Mapped[list["Category"]] = relationship(back_populates="parent")
```

### 2.3 `models/budget.py`

```python
class Budget(Base):
    __tablename__ = "budgets"
    
    id: Mapped[uuid.UUID]
    category_id: Mapped[uuid.UUID]  # FK -> categories
    month: Mapped[date]             # First day of month (YYYY-MM-01)
    limit_amount: Mapped[Decimal]   # DECIMAL(15,2)
    spent_amount: Mapped[Decimal]   # DECIMAL(15,2), default 0
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
    
    # Unique constraint: (category_id, month)
    # Relationship
    category: Mapped["Category"] = relationship()
```

### 2.4 `models/tag.py`

```python
class Tag(Base):
    __tablename__ = "tags"
    
    id: Mapped[uuid.UUID]
    name: Mapped[str]               # UNIQUE
    created_at: Mapped[datetime]
```

### 2.5 `models/transaction.py`

```python
# Association table for M:N
transaction_tags = Table(
    "transaction_tags",
    Base.metadata,
    Column("transaction_id", ForeignKey("transactions.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

class Transaction(Base):
    __tablename__ = "transactions"
    
    id: Mapped[uuid.UUID]
    date: Mapped[datetime]          # TIMESTAMP WITH TZ
    type: Mapped[str]               # income | expense
    amount: Mapped[Decimal]         # DECIMAL(15,2), CHECK > 0
    category_id: Mapped[uuid.UUID]  # FK -> categories
    account_id: Mapped[uuid.UUID]   # FK -> accounts
    description: Mapped[str]        # VARCHAR(500)
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
    
    # Relationships
    category: Mapped["Category"] = relationship()
    account: Mapped["Account"] = relationship()
    tags: Mapped[list["Tag"]] = relationship(secondary=transaction_tags)
```

---

## Phase 3: Pydantic Schemas

Request/response validation with Pydantic v2:

### 3.1 Account Schemas (`schemas/account.py`)

| Schema | Purpose |
|--------|---------|
| `AccountCreate` | POST body: name, type, balance, color, icon |
| `AccountUpdate` | PATCH body: all fields optional |
| `AccountResponse` | Response: includes id, created_at, updated_at |
| `AccountList` | Paginated list response |

### 3.2 Category Schemas (`schemas/category.py`)

| Schema | Purpose |
|--------|---------|
| `CategoryCreate` | name, type, color, icon, parent_id (optional) |
| `CategoryUpdate` | All optional |
| `CategoryResponse` | Full response with parent info |
| `CategoryWithChildren` | Parent with nested children array |

### 3.3 Budget Schemas (`schemas/budget.py`)

| Schema | Purpose |
|--------|---------|
| `BudgetCreate` | category_id, month (YYYY-MM string), limit_amount |
| `BudgetUpdate` | limit_amount only |
| `BudgetResponse` | Includes spent_amount, percentage, status |

### 3.4 Transaction Schemas (`schemas/transaction.py`)

| Schema | Purpose |
|--------|---------|
| `TransactionCreate` | date, type, amount, category_id, account_id, description, tags[] |
| `TransactionUpdate` | All optional |
| `TransactionResponse` | Full response with category/account names, tags |
| `TransactionFilter` | Query params: search, type, category_id, account_id, month |

### 3.5 Dashboard Schemas (`schemas/dashboard.py`)

| Schema | Purpose |
|--------|---------|
| `DashboardStats` | total_balance, monthly_income, monthly_expense |
| `RecentTransactions` | List of last 5 transactions |

---

## Phase 4: CRUD Operations

### 4.1 Account CRUD (`crud/account.py`)

| Function | Description |
|----------|-------------|
| `get_accounts(db)` | List all accounts |
| `get_account(db, id)` | Get single account by ID |
| `create_account(db, data)` | Create new account |
| `update_account(db, id, data)` | Update account fields |
| `delete_account(db, id)` | Delete account (check for transactions first) |

### 4.2 Category CRUD (`crud/category.py`)

| Function | Description |
|----------|-------------|
| `get_categories(db, type?)` | List with optional type filter |
| `get_categories_hierarchical(db)` | Return grouped by parent/children |
| `get_category(db, id)` | Single category |
| `create_category(db, data)` | Validate 2-level hierarchy |
| `update_category(db, id, data)` | Update, validate parent_id |
| `delete_category(db, id)` | Cascade to children, check transactions |

### 4.3 Budget CRUD (`crud/budget.py`)

| Function | Description |
|----------|-------------|
| `get_budgets(db, month?)` | List budgets, filter by month |
| `get_budget(db, id)` | Single budget with spent calculation |
| `create_budget(db, data)` | Validate unique (category_id, month) |
| `update_budget(db, id, data)` | Update limit_amount |
| `delete_budget(db, id)` | Delete budget |
| `recalculate_spent(db, category_id, month)` | Recalculate from transactions |

### 4.4 Transaction CRUD (`crud/transaction.py`)

| Function | Description |
|----------|-------------|
| `get_transactions(db, filters)` | Paginated, filtered list |
| `get_transaction(db, id)` | Single with relations |
| `create_transaction(db, data)` | Create + update account balance + update budget spent |
| `update_transaction(db, id, data)` | Update + recalculate balances |
| `delete_transaction(db, id)` | Delete + recalculate balances |

### 4.5 Tag CRUD (`crud/tag.py`)

| Function | Description |
|----------|-------------|
| `get_or_create_tags(db, names[])` | Get existing or create new tags |
| `get_tags(db)` | List all tags |

---

## Phase 5: API Routes

### 5.1 Accounts Router (`/api/accounts`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/` | `list_accounts` | Get all accounts |
| GET | `/{id}` | `get_account` | Get account by ID |
| POST | `/` | `create_account` | Create new account |
| PATCH | `/{id}` | `update_account` | Update account |
| DELETE | `/{id}` | `delete_account` | Delete account |

### 5.2 Categories Router (`/api/categories`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/` | `list_categories` | Flat list, optional `?type=` filter |
| GET | `/hierarchical` | `list_hierarchical` | Grouped parent → children |
| GET | `/{id}` | `get_category` | Get category by ID |
| POST | `/` | `create_category` | Create category |
| PATCH | `/{id}` | `update_category` | Update category |
| DELETE | `/{id}` | `delete_category` | Delete category |

### 5.3 Budgets Router (`/api/budgets`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/` | `list_budgets` | List budgets, `?month=YYYY-MM` filter |
| GET | `/{id}` | `get_budget` | Get budget with progress |
| POST | `/` | `create_budget` | Create budget |
| PATCH | `/{id}` | `update_budget` | Update limit |
| DELETE | `/{id}` | `delete_budget` | Delete budget |

### 5.4 Transactions Router (`/api/transactions`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/` | `list_transactions` | Paginated, filtered (search, type, category, account, month) |
| GET | `/{id}` | `get_transaction` | Get single transaction |
| POST | `/` | `create_transaction` | Create transaction |
| PATCH | `/{id}` | `update_transaction` | Update transaction |
| DELETE | `/{id}` | `delete_transaction` | Delete transaction |

### 5.5 Tags Router (`/api/tags`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/` | `list_tags` | Get all tags |

### 5.6 Dashboard Router (`/api/dashboard`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/stats` | `get_stats` | Total balance, monthly income/expense |
| GET | `/recent` | `get_recent` | Last 5 transactions |

---

## Phase 6: Alembic Migrations

### 6.1 Initial Migration

Create migration for all tables from `docs/DATABASE_DESIGN.md`:

1. `accounts`
2. `categories`
3. `budgets`
4. `tags`
5. `transactions`
6. `transaction_tags`

Include all indexes from the database design document.

### 6.2 Commands

```bash
# Initialize alembic (one-time)
alembic init alembic

# Generate migration from models
alembic revision --autogenerate -m "initial_schema"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

## Phase 7: Main Application (`app/main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="NeoBudget API",
    description="Personal finance management API",
    version="1.0.0",
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(accounts.router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(budgets.router, prefix="/api/budgets", tags=["Budgets"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(tags.router, prefix="/api/tags", tags=["Tags"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])

@app.get("/health")
def health_check():
    return {"status": "ok"}
```

---

## Implementation Order

1. **Infrastructure**: Docker, requirements, config, database connection
2. **Models**: All SQLAlchemy models
3. **Migrations**: Alembic setup + initial migration
4. **Schemas**: All Pydantic schemas
5. **CRUD**: Database operations for each entity
6. **Routes**: API endpoints
7. **Testing**: Manual testing with Swagger UI

---

## Running the Backend

```bash
# Start PostgreSQL
docker-compose up -d

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8000
```

API documentation available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## Notes

- **No authentication** for MVP (single-user, local development)
- **No database triggers** in SQLAlchemy - balance/spent updates happen in CRUD layer
- **Soft validation** for category hierarchy (2-level max) in CRUD, not DB triggers
- **UUID primary keys** for all tables (matches frontend ID patterns)
- **ISO date strings** for API, converted to Python datetime internally

