# NeoBudget Backend API

A FastAPI backend for the NeoBudget personal finance application.

## Features

- **Accounts**: Manage multiple financial accounts (cash, bank, e-wallet, credit card)
- **Categories**: Hierarchical categories (2-level parent-child) for income/expenses
- **Budgets**: Monthly budget limits with automatic spending tracking
- **Transactions**: Full CRUD with filtering, pagination, and tagging
- **Dashboard**: Quick stats and recent transactions

## Tech Stack

- **FastAPI** - Modern Python web framework
- **SQLAlchemy 2.0** - ORM with type annotations
- **PostgreSQL** - Database (via Docker for development)
- **Alembic** - Database migrations
- **Pydantic v2** - Request/response validation

## Quick Start

### 1. Start PostgreSQL

```bash
docker-compose up -d
```

This starts PostgreSQL 16 on port 5432 with:

- User: `neobudget`
- Password: `neobudget_dev`
- Database: `neobudget`

### 2. Set Up Python Environment

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Default `.env` values work with Docker Compose setup.

### 4. Run Database Migrations

```bash
alembic upgrade head
```

### 5. Start the Server

```bash
uvicorn app.main:app --reload --port 8000
```

## API Documentation

Once running, access the API docs at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Accounts `/api/accounts`

| Method | Endpoint | Description       |
| ------ | -------- | ----------------- |
| GET    | `/`      | List all accounts |
| GET    | `/{id}`  | Get account by ID |
| POST   | `/`      | Create account    |
| PATCH  | `/{id}`  | Update account    |
| DELETE | `/{id}`  | Delete account    |

### Categories `/api/categories`

| Method | Endpoint        | Description                                    |
| ------ | --------------- | ---------------------------------------------- |
| GET    | `/`             | List all categories (optional `?type=` filter) |
| GET    | `/hierarchical` | Get categories grouped by parent-child         |
| GET    | `/{id}`         | Get category by ID                             |
| POST   | `/`             | Create category                                |
| PATCH  | `/{id}`         | Update category                                |
| DELETE | `/{id}`         | Delete category                                |

### Budgets `/api/budgets`

| Method | Endpoint | Description                                     |
| ------ | -------- | ----------------------------------------------- |
| GET    | `/`      | List budgets (optional `?month=YYYY-MM` filter) |
| GET    | `/{id}`  | Get budget with progress info                   |
| POST   | `/`      | Create budget                                   |
| PATCH  | `/{id}`  | Update budget limit                             |
| DELETE | `/{id}`  | Delete budget                                   |

### Transactions `/api/transactions`

| Method | Endpoint | Description                                                               |
| ------ | -------- | ------------------------------------------------------------------------- |
| GET    | `/`      | List with filters: `search`, `type`, `category_id`, `account_id`, `month` |
| GET    | `/{id}`  | Get transaction with details                                              |
| POST   | `/`      | Create transaction                                                        |
| PATCH  | `/{id}`  | Update transaction                                                        |
| DELETE | `/{id}`  | Delete transaction                                                        |

### Tags `/api/tags`

| Method | Endpoint | Description   |
| ------ | -------- | ------------- |
| GET    | `/`      | List all tags |

### Dashboard `/api/dashboard`

| Method | Endpoint  | Description                           |
| ------ | --------- | ------------------------------------- |
| GET    | `/stats`  | Total balance, monthly income/expense |
| GET    | `/recent` | Last 5 transactions                   |

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Settings
│   ├── database.py          # SQLAlchemy setup
│   ├── models/              # ORM models
│   │   ├── account.py
│   │   ├── category.py
│   │   ├── budget.py
│   │   ├── tag.py
│   │   └── transaction.py
│   ├── schemas/             # Pydantic schemas
│   │   ├── account.py
│   │   ├── category.py
│   │   ├── budget.py
│   │   ├── tag.py
│   │   ├── transaction.py
│   │   └── dashboard.py
│   ├── crud/                # Database operations
│   │   ├── account.py
│   │   ├── category.py
│   │   ├── budget.py
│   │   ├── tag.py
│   │   └── transaction.py
│   └── routers/             # API routes
│       ├── accounts.py
│       ├── categories.py
│       ├── budgets.py
│       ├── transactions.py
│       ├── tags.py
│       └── dashboard.py
├── alembic/                 # Migrations
│   ├── versions/
│   └── env.py
├── alembic.ini
├── docker-compose.yml
├── requirements.txt
├── .env.example
└── README.md
```

## Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply all migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

## Development Notes

- **No authentication** - Single-user MVP for local development
- **UUID primary keys** - Matches frontend ID patterns
- **Automatic balance updates** - Account balances update when transactions change
- **Automatic budget tracking** - `spent_amount` recalculates on transaction changes
- **2-level category hierarchy** - Parents can have children, but children cannot have children

## Environment Variables

| Variable       | Description                     | Default                                                         |
| -------------- | ------------------------------- | --------------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string    | `postgresql://neobudget:neobudget_dev@localhost:5432/neobudget` |
| `DEBUG`        | Enable debug mode               | `false`                                                         |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:3000`                                         |

## Stopping the Database

```bash
docker-compose down

# To also remove the data volume:
docker-compose down -v
```
