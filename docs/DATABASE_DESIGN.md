# Database Design: NeoBudget Backend

## Overview

This document outlines the database schema for the NeoBudget personal finance application. The design is based on the frontend data models and supports all current features including hierarchical categories, monthly budgets, multi-account management, and tagged transactions.

---

## Entity Relationship Diagram (ERD)

```
┌──────────────────┐       ┌──────────────────┐
│     accounts     │       │    categories    │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │
│ name             │       │ name             │
│ type             │       │ type             │
│ balance          │       │ color            │
│ color            │       │ icon             │
│ icon             │       │ parent_id (FK) ──┼──┐
│ created_at       │       │ created_at       │  │
│ updated_at       │       │ updated_at       │  │
└──────────────────┘       └────────┬─────────┘  │
         │                          │            │
         │                          │ (self-ref) │
         │                          └────────────┘
         │                          │
         │    ┌─────────────────────┤
         │    │                     │
         ▼    ▼                     ▼
┌──────────────────┐       ┌──────────────────┐
│   transactions   │       │     budgets      │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │
│ date             │       │ category_id (FK) │
│ type             │       │ month            │
│ amount           │       │ limit_amount     │
│ category_id (FK) │       │ spent_amount     │◄── (computed/cached)
│ account_id (FK)  │       │ created_at       │
│ description      │       │ updated_at       │
│ created_at       │       └──────────────────┘
│ updated_at       │       
└────────┬─────────┘       
         │                 
         │                 ┌──────────────────┐
         │                 │       tags       │
         │                 ├──────────────────┤
         │                 │ id (PK)          │
         ▼                 │ name (UNIQUE)    │
┌──────────────────┐       │ created_at       │
│ transaction_tags │       └────────┬─────────┘
├──────────────────┤                │
│ transaction_id   │◄───────────────┘
│ tag_id           │
│ (composite PK)   │
└──────────────────┘
```

---

## Tables Specification

### 1. `accounts`

Stores financial accounts (cash, bank, e-wallet, credit card).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID / BIGINT | PRIMARY KEY | Unique identifier |
| `name` | VARCHAR(100) | NOT NULL | Display name |
| `type` | ENUM | NOT NULL | One of: `cash`, `bank`, `e-wallet`, `credit_card` |
| `balance` | DECIMAL(15,2) | NOT NULL, DEFAULT 0 | Current balance (can be negative for credit) |
| `color` | VARCHAR(7) | NOT NULL | Hex color code (e.g., `#4ade80`) |
| `icon` | VARCHAR(50) | NOT NULL | Lucide icon name |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

```sql
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('cash', 'bank', 'e-wallet', 'credit_card')),
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    color VARCHAR(7) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for listing accounts
CREATE INDEX idx_accounts_type ON accounts(type);
```

---

### 2. `categories`

Stores transaction categories with 2-level hierarchy (parent-child).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID / BIGINT | PRIMARY KEY | Unique identifier |
| `name` | VARCHAR(100) | NOT NULL | Category name |
| `type` | ENUM | NOT NULL | `income` or `expense` |
| `color` | VARCHAR(7) | NOT NULL | Hex color code |
| `icon` | VARCHAR(50) | NOT NULL | Lucide icon name |
| `parent_id` | UUID / BIGINT | NULLABLE, FK | Reference to parent category |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Constraints:**
- A category with `parent_id` cannot have children (enforced via trigger/application)
- Child categories must have the same `type` as their parent

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    color VARCHAR(7) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

-- Constraint: Ensure 2-level max hierarchy (parent cannot have a parent)
CREATE OR REPLACE FUNCTION check_category_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a parent_id, ensure the parent doesn't have a parent
    IF NEW.parent_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM categories WHERE id = NEW.parent_id AND parent_id IS NOT NULL) THEN
            RAISE EXCEPTION 'Cannot create more than 2 levels of category hierarchy';
        END IF;
        
        -- Ensure child has same type as parent
        IF NOT EXISTS (SELECT 1 FROM categories WHERE id = NEW.parent_id AND type = NEW.type) THEN
            RAISE EXCEPTION 'Child category must have the same type as parent';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_category_hierarchy
    BEFORE INSERT OR UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION check_category_hierarchy();
```

---

### 3. `budgets`

Stores monthly budget limits per category.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID / BIGINT | PRIMARY KEY | Unique identifier |
| `category_id` | UUID / BIGINT | NOT NULL, FK | Reference to category |
| `month` | DATE / VARCHAR(7) | NOT NULL | Budget month (YYYY-MM format or first day of month) |
| `limit_amount` | DECIMAL(15,2) | NOT NULL | Budget limit |
| `spent_amount` | DECIMAL(15,2) | NOT NULL, DEFAULT 0 | Cached spent amount (updated via triggers) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Constraints:**
- One budget per category per month (UNIQUE constraint)

```sql
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- Store as first day of month (YYYY-MM-01)
    limit_amount DECIMAL(15, 2) NOT NULL CHECK (limit_amount > 0),
    spent_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- One budget per category per month
    UNIQUE (category_id, month)
);

-- Indexes
CREATE INDEX idx_budgets_category_id ON budgets(category_id);
CREATE INDEX idx_budgets_month ON budgets(month);
CREATE INDEX idx_budgets_category_month ON budgets(category_id, month);
```

---

### 4. `tags`

Stores unique tag names for transactions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID / BIGINT | PRIMARY KEY | Unique identifier |
| `name` | VARCHAR(50) | NOT NULL, UNIQUE | Tag name (lowercase) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |

```sql
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for lookup by name
CREATE INDEX idx_tags_name ON tags(name);
```

---

### 5. `transactions`

Stores financial transactions (income and expenses).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID / BIGINT | PRIMARY KEY | Unique identifier |
| `date` | TIMESTAMP | NOT NULL | Transaction date/time |
| `type` | ENUM | NOT NULL | `income` or `expense` |
| `amount` | DECIMAL(15,2) | NOT NULL | Transaction amount (always positive) |
| `category_id` | UUID / BIGINT | NOT NULL, FK | Reference to category |
| `account_id` | UUID / BIGINT | NOT NULL, FK | Reference to account |
| `description` | VARCHAR(500) | NOT NULL | Transaction description |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    description VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date_type ON transactions(date, type);

-- Composite index for monthly reports
CREATE INDEX idx_transactions_month_category ON transactions(
    DATE_TRUNC('month', date),
    category_id
);
```

---

### 6. `transaction_tags` (Junction Table)

Many-to-many relationship between transactions and tags.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `transaction_id` | UUID / BIGINT | PK, FK | Reference to transaction |
| `tag_id` | UUID / BIGINT | PK, FK | Reference to tag |

```sql
CREATE TABLE transaction_tags (
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

-- Index for finding transactions by tag
CREATE INDEX idx_transaction_tags_tag_id ON transaction_tags(tag_id);
```

---

## Business Logic & Triggers

### 1. Auto-update Account Balance

When transactions are created/updated/deleted, automatically update the account balance.

```sql
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.type = 'income' THEN
            UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
        ELSE
            UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
        END IF;
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.type = 'income' THEN
            UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
        ELSE
            UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
        END IF;
        RETURN OLD;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Reverse old transaction
        IF OLD.type = 'income' THEN
            UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
        ELSE
            UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
        END IF;
        -- Apply new transaction
        IF NEW.type = 'income' THEN
            UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
        ELSE
            UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
        END IF;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_account_balance
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_account_balance();
```

### 2. Auto-update Budget Spent Amount

When expense transactions are created/updated/deleted, update the budget's spent amount.

```sql
CREATE OR REPLACE FUNCTION update_budget_spent()
RETURNS TRIGGER AS $$
DECLARE
    transaction_month DATE;
BEGIN
    IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.type = 'expense' THEN
        transaction_month := DATE_TRUNC('month', NEW.date)::DATE;
        
        UPDATE budgets 
        SET spent_amount = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM transactions 
            WHERE category_id = NEW.category_id 
              AND type = 'expense'
              AND DATE_TRUNC('month', date) = transaction_month
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE category_id = NEW.category_id AND month = transaction_month;
    END IF;
    
    IF TG_OP IN ('DELETE', 'UPDATE') AND OLD.type = 'expense' THEN
        transaction_month := DATE_TRUNC('month', OLD.date)::DATE;
        
        UPDATE budgets 
        SET spent_amount = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM transactions 
            WHERE category_id = OLD.category_id 
              AND type = 'expense'
              AND DATE_TRUNC('month', date) = transaction_month
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE category_id = OLD.category_id AND month = transaction_month;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_budget_spent
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_budget_spent();
```

### 3. Auto-update Timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trigger_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Sample Queries

### Dashboard Statistics

```sql
-- Total balance across all accounts
SELECT SUM(balance) AS total_balance FROM accounts;

-- Monthly income and expenses
SELECT 
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS monthly_income,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS monthly_expenses
FROM transactions
WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE);

-- Recent transactions with category and account info
SELECT 
    t.id, t.date, t.type, t.amount, t.description,
    c.name AS category_name, c.color AS category_color, c.icon AS category_icon,
    a.name AS account_name
FROM transactions t
JOIN categories c ON t.category_id = c.id
JOIN accounts a ON t.account_id = a.id
ORDER BY t.date DESC
LIMIT 10;
```

### Category Hierarchy

```sql
-- Get all categories with parent info
SELECT 
    c.id, c.name, c.type, c.color, c.icon,
    p.id AS parent_id, p.name AS parent_name
FROM categories c
LEFT JOIN categories p ON c.parent_id = p.id
ORDER BY COALESCE(p.name, c.name), c.parent_id NULLS FIRST, c.name;

-- Get parent categories with child count
SELECT 
    c.id, c.name, c.type, c.color, c.icon,
    COUNT(child.id) AS child_count
FROM categories c
LEFT JOIN categories child ON child.parent_id = c.id
WHERE c.parent_id IS NULL
GROUP BY c.id, c.name, c.type, c.color, c.icon
ORDER BY c.type, c.name;
```

### Budget Progress

```sql
-- Current month budgets with progress
SELECT 
    b.id, b.month, b.limit_amount, b.spent_amount,
    c.name AS category_name, c.color, c.icon,
    ROUND((b.spent_amount / b.limit_amount) * 100, 2) AS percentage_used,
    CASE 
        WHEN b.spent_amount > b.limit_amount THEN 'over'
        WHEN b.spent_amount > b.limit_amount * 0.8 THEN 'warning'
        ELSE 'safe'
    END AS status
FROM budgets b
JOIN categories c ON b.category_id = c.id
WHERE b.month = DATE_TRUNC('month', CURRENT_DATE)::DATE
ORDER BY percentage_used DESC;
```

### Transactions with Tags

```sql
-- Get transactions with their tags
SELECT 
    t.*,
    ARRAY_AGG(tag.name) FILTER (WHERE tag.name IS NOT NULL) AS tags
FROM transactions t
LEFT JOIN transaction_tags tt ON t.id = tt.transaction_id
LEFT JOIN tags tag ON tt.tag_id = tag.id
GROUP BY t.id
ORDER BY t.date DESC;

-- Find transactions by tag
SELECT t.*
FROM transactions t
JOIN transaction_tags tt ON t.id = tt.transaction_id
JOIN tags tag ON tt.tag_id = tag.id
WHERE tag.name = 'groceries';
```

---

## Views (Optional)

### `v_transactions_full`

Denormalized view for easy transaction queries.

```sql
CREATE VIEW v_transactions_full AS
SELECT 
    t.id,
    t.date,
    t.type,
    t.amount,
    t.description,
    t.created_at,
    t.updated_at,
    -- Category
    c.id AS category_id,
    c.name AS category_name,
    c.color AS category_color,
    c.icon AS category_icon,
    pc.id AS parent_category_id,
    pc.name AS parent_category_name,
    -- Account
    a.id AS account_id,
    a.name AS account_name,
    a.type AS account_type,
    a.color AS account_color,
    a.icon AS account_icon,
    -- Tags
    ARRAY_AGG(tag.name) FILTER (WHERE tag.name IS NOT NULL) AS tags
FROM transactions t
JOIN categories c ON t.category_id = c.id
LEFT JOIN categories pc ON c.parent_id = pc.id
JOIN accounts a ON t.account_id = a.id
LEFT JOIN transaction_tags tt ON t.id = tt.transaction_id
LEFT JOIN tags tag ON tt.tag_id = tag.id
GROUP BY t.id, c.id, pc.id, a.id;
```

### `v_budget_summary`

Budget summary with calculated fields.

```sql
CREATE VIEW v_budget_summary AS
SELECT 
    b.id,
    b.month,
    b.limit_amount,
    b.spent_amount,
    b.limit_amount - b.spent_amount AS remaining,
    ROUND((b.spent_amount / b.limit_amount) * 100, 2) AS percentage_used,
    CASE 
        WHEN b.spent_amount > b.limit_amount THEN 'over'
        WHEN b.spent_amount > b.limit_amount * 0.8 THEN 'warning'
        ELSE 'safe'
    END AS status,
    c.id AS category_id,
    c.name AS category_name,
    c.color AS category_color,
    c.icon AS category_icon,
    c.type AS category_type
FROM budgets b
JOIN categories c ON b.category_id = c.id;
```

---

## Future Considerations

### Multi-User Support

When adding authentication, consider:

```sql
-- Add user_id to relevant tables
ALTER TABLE accounts ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE categories ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE budgets ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE transactions ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE tags ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);

-- Row Level Security (RLS) for PostgreSQL
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY accounts_user_policy ON accounts
    USING (user_id = current_user_id());
```

### Recurring Transactions

```sql
CREATE TABLE recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(15, 2) NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    description VARCHAR(500) NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    next_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Transfer Between Accounts

```sql
CREATE TABLE transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    from_account_id UUID NOT NULL REFERENCES accounts(id),
    to_account_id UUID NOT NULL REFERENCES accounts(id),
    description VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (from_account_id != to_account_id)
);
```

---

## Migration Script

Full migration script to create all tables:

```sql
-- Full migration: Create NeoBudget database schema

BEGIN;

-- 1. Accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('cash', 'bank', 'e-wallet', 'credit_card')),
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    color VARCHAR(7) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_type ON accounts(type);

-- 2. Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    color VARCHAR(7) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

-- 3. Budgets
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    limit_amount DECIMAL(15, 2) NOT NULL CHECK (limit_amount > 0),
    spent_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (category_id, month)
);

CREATE INDEX idx_budgets_category_id ON budgets(category_id);
CREATE INDEX idx_budgets_month ON budgets(month);

-- 4. Tags
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tags_name ON tags(name);

-- 5. Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    description VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);

-- 6. Transaction Tags (Junction)
CREATE TABLE transaction_tags (
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

CREATE INDEX idx_transaction_tags_tag_id ON transaction_tags(tag_id);

COMMIT;
```

---

## Summary

| Table | Description | Key Relationships |
|-------|-------------|-------------------|
| `accounts` | Financial accounts | - |
| `categories` | Hierarchical categories (2-level) | Self-referential via `parent_id` |
| `budgets` | Monthly budget limits | `category_id` → `categories` |
| `tags` | Reusable transaction labels | - |
| `transactions` | Income/expense records | `category_id` → `categories`, `account_id` → `accounts` |
| `transaction_tags` | M:N junction | `transaction_id` → `transactions`, `tag_id` → `tags` |

This schema supports:
- ✅ Multi-account management (cash, bank, e-wallet, credit card)
- ✅ Hierarchical categories (2-level parent-child)
- ✅ Monthly budgets with spent tracking
- ✅ Tagged transactions (many-to-many)
- ✅ Automatic balance and budget calculations
- ✅ Proper indexing for performance
- ✅ Future-ready for multi-user support

