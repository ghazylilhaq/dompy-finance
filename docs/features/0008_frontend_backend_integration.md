# 0008 - Frontend Backend Integration

## Overview

Integrate the Next.js frontend with the FastAPI backend by replacing all static JSON data imports with API calls. The frontend currently uses local JSON files (`/data/*.json`) for accounts, categories, budgets, and transactions. This integration will connect to the backend endpoints documented in `backend/README.md`.

## API Base URL

Backend runs at `http://localhost:8000` with endpoints under `/api/`.

## Data Mapping Differences

The backend uses `snake_case`, the frontend uses `camelCase`. Key mappings:

| Frontend | Backend |
|----------|---------|
| `categoryId` | `category_id` |
| `accountId` | `account_id` |
| `parentId` | `parent_id` |
| `limit` (Budget) | `limit_amount` |
| `spent` (Budget) | `spent_amount` |
| `"credit card"` (Account type) | `"credit_card"` |

---

## Phase 1: API Client Layer

### 1.1 Create API Client (`frontend/lib/api.ts`)

Create a centralized API client with functions for all CRUD operations:

```
API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

Utility functions:
- snakeToCamel(obj): Convert snake_case keys to camelCase
- camelToSnake(obj): Convert camelCase keys to snake_case
- handleResponse(res): Parse JSON and throw on error
```

**Account functions:**
- `getAccounts()` → GET `/api/accounts`
- `getAccount(id)` → GET `/api/accounts/{id}`
- `createAccount(data)` → POST `/api/accounts`
- `updateAccount(id, data)` → PATCH `/api/accounts/{id}`
- `deleteAccount(id)` → DELETE `/api/accounts/{id}`

**Category functions:**
- `getCategories(type?)` → GET `/api/categories?type=`
- `getCategoriesHierarchical()` → GET `/api/categories/hierarchical`
- `getCategory(id)` → GET `/api/categories/{id}`
- `createCategory(data)` → POST `/api/categories`
- `updateCategory(id, data)` → PATCH `/api/categories/{id}`
- `deleteCategory(id)` → DELETE `/api/categories/{id}`

**Budget functions:**
- `getBudgets(month?)` → GET `/api/budgets?month=`
- `getBudget(id)` → GET `/api/budgets/{id}`
- `createBudget(data)` → POST `/api/budgets`
- `updateBudget(id, data)` → PATCH `/api/budgets/{id}`
- `deleteBudget(id)` → DELETE `/api/budgets/{id}`

**Transaction functions:**
- `getTransactions(filters)` → GET `/api/transactions` with query params: `search`, `type`, `category_id`, `account_id`, `month`
- `getTransaction(id)` → GET `/api/transactions/{id}`
- `createTransaction(data)` → POST `/api/transactions`
- `updateTransaction(id, data)` → PATCH `/api/transactions/{id}`
- `deleteTransaction(id)` → DELETE `/api/transactions/{id}`

**Dashboard functions:**
- `getDashboardStats()` → GET `/api/dashboard/stats`
- `getRecentTransactions()` → GET `/api/dashboard/recent`

**Tags functions:**
- `getTags()` → GET `/api/tags`

### 1.2 Update Types (`frontend/types/index.ts`)

Extend existing types to handle API responses. The backend includes additional fields:

```typescript
// Add to existing types:
- created_at?: string
- updated_at?: string

// Budget type update:
- limit → limit_amount (or map in API client)
- spent → spent_amount (or map in API client)

// Add API response enriched fields:
- category_name, category_color, category_icon on Transaction/Budget
- account_name on Transaction
```

---

## Phase 2: Page Integrations

### 2.1 Dashboard Page (`frontend/app/page.tsx`)

**Current:** Imports from `@/data/*.json`, calculates stats locally.

**Changes:**
- Remove static JSON imports
- Add `"use client"` directive
- Add state: `stats`, `recentTransactions`, `loading`, `error`
- Use `useEffect` to call `getDashboardStats()` and `getRecentTransactions()`
- Add loading skeleton UI
- Handle error states

### 2.2 Accounts Page (`frontend/app/accounts/page.tsx`)

**Current:** Uses `useState` initialized from `accountsData` JSON.

**Changes:**
- Remove `accountsData` import
- Fetch accounts with `getAccounts()` on mount
- Add `loading` state, show skeleton during load
- Update `handleAddAccount`:
  - Call `createAccount(data)` → await response → update local state
- Update `handleEditAccount`:
  - Call `updateAccount(id, data)` → await response → update local state
- Update `handleDeleteAccount`:
  - Call `deleteAccount(id)` → on success → filter from local state
- Refetch accounts after mutations or optimistically update

### 2.3 Categories Page (`frontend/app/categories/page.tsx`)

**Current:** Uses `useState` initialized from `categoriesData` JSON.

**Changes:**
- Remove `categoriesData` import
- Fetch categories with `getCategories()` on mount
- Add `loading` state
- Update `handleAddCategory`:
  - Call `createCategory(data)` → refetch or append to state
- Update `handleEditCategory`:
  - Call `updateCategory(id, data)` → update state
- Add delete handler (currently missing - may need to add UI):
  - Call `deleteCategory(id)`

### 2.4 Budgets Page (`frontend/app/budgets/page.tsx`)

**Current:** Uses `useState` for budgets/categories from JSON.

**Changes:**
- Remove `budgetsData` and `categoriesData` imports
- Fetch with `getBudgets()` and `getCategories()` on mount
- Map backend response: `limit_amount` → `limit`, `spent_amount` → `spent`
- Add loading state
- Update `handleAddOrUpdateBudget`:
  - If creating: `createBudget(data)`
  - If updating: `updateBudget(id, data)`
- Update `handleDeleteBudget`:
  - Call `deleteBudget(id)`

### 2.5 Transactions Page (`frontend/app/transactions/page.tsx`)

**Current:** Uses `useState` initialized from multiple JSON files.

**Changes:**
- Remove all static JSON imports
- Fetch categories and accounts once on mount
- Fetch transactions using `getTransactions(filters)` with filter params:
  - `search`, `type`, `category_id`, `account_id`, `month` (format: "YYYY-MM")
- Update filter effect to re-fetch when filters change (debounce search)
- Update `handleAddOrUpdateTransaction`:
  - If creating: `createTransaction(data)`
  - If updating: `updateTransaction(id, data)`
- Update `handleDelete`:
  - Call `deleteTransaction(id)`

### 2.6 Transaction Detail Page (`frontend/app/transactions/[id]/page.tsx`)

**Current:** Finds transaction from static JSON by ID.

**Changes:**
- Remove all static JSON imports
- Fetch transaction by ID: `getTransaction(id)` on mount
- Fetch categories and accounts for form dialog
- Add loading state
- Update `handleUpdate`:
  - Call `updateTransaction(id, data)` → update local state
- Update `handleDelete`:
  - Call `deleteTransaction(id)` → redirect to `/transactions`

---

## Phase 3: Component Updates

### 3.1 Form Dialogs

The form dialogs already receive handlers as props, so no changes needed to their internal logic. The parent pages will pass API-backed handlers.

**Files (no changes needed):**
- `components/accounts/AccountFormDialog.tsx`
- `components/categories/CategoryFormDialog.tsx`
- `components/budgets/BudgetFormDialog.tsx`
- `components/transactions/TransactionFormDialog.tsx`

### 3.2 TransactionTable (`components/transactions/TransactionTable.tsx`)

No changes needed - receives data as props.

---

## Phase 4: Environment Configuration

### 4.1 Create Environment Variable

Add to `frontend/.env.local` (gitignored):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4.2 Update Next.js Config (Optional)

If CORS issues occur during development, consider adding rewrites in `next.config.ts` to proxy API requests:

```typescript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:8000/api/:path*',
    },
  ];
}
```

---

## Files to Modify

| File | Action |
|------|--------|
| `frontend/lib/api.ts` | **CREATE** - API client with all CRUD functions |
| `frontend/types/index.ts` | **MODIFY** - Add optional fields, create API types |
| `frontend/app/page.tsx` | **MODIFY** - Add client directive, fetch dashboard data |
| `frontend/app/accounts/page.tsx` | **MODIFY** - Replace JSON with API calls |
| `frontend/app/categories/page.tsx` | **MODIFY** - Replace JSON with API calls |
| `frontend/app/budgets/page.tsx` | **MODIFY** - Replace JSON with API calls |
| `frontend/app/transactions/page.tsx` | **MODIFY** - Replace JSON with API calls |
| `frontend/app/transactions/[id]/page.tsx` | **MODIFY** - Replace JSON with API calls |
| `frontend/.env.local` | **CREATE** - API URL config |

---

## Data Files to Remove (After Integration Complete)

These become obsolete once API integration is working:
- `frontend/data/accounts.json`
- `frontend/data/budgets.json`
- `frontend/data/categories.json`
- `frontend/data/transactions.json`








