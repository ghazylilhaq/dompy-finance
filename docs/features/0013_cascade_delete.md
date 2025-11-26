# Feature 0013: Cascade Delete for Accounts and Categories

## Context

Currently, deleting an account or category fails if there are associated transactions (`ondelete="RESTRICT"` constraint). The user requests that deleting an account or category should also delete all transactions attached to it before the account/category itself is removed. This improves UX by eliminating blocked deletions and provides a cleaner data cleanup flow.

**Current behavior:**

- `DELETE /api/accounts/{id}` returns 409 Conflict if transactions exist
- `DELETE /api/categories/{id}` returns 409 Conflict if transactions exist

**Desired behavior:**

- Deleting an account cascade-deletes all its transactions first
- Deleting a category cascade-deletes all its transactions first
- For parent categories, also handle child category transactions

---

## Data Layer

### Option A: Application-Level Cascade (Recommended)

No database migration required. Delete transactions in CRUD layer before deleting account/category.

### Option B: Database-Level Cascade (Alternative)

Requires Alembic migration to change foreign key constraints:

**File:** `backend/alembic/versions/xxxx_cascade_delete_transactions.py`

```
# Change ondelete from RESTRICT to CASCADE for:
# - transactions.account_id → accounts.id
# - transactions.category_id → categories.id
```

**Recommendation:** Use Option A (application-level) for better control over:

- Budget spent_amount recalculation
- Returning deletion counts to frontend
- Logging/auditing deleted transactions

---

## Backend Changes

### File: `backend/app/crud/transaction.py`

**Add new functions:**

#### `delete_transactions_by_account`

- **Purpose:** Bulk delete all transactions for a given account
- **Logic:**
  1. Query all transactions where `account_id == target_account_id` AND `user_id == user_id`
  2. For each expense transaction, collect unique `(category_id, month)` pairs for budget recalculation
  3. Delete all matching transactions in bulk
  4. Recalculate `spent_amount` for all affected budgets
  5. Return count of deleted transactions
- **Note:** Skip account balance update since account is being deleted

#### `delete_transactions_by_category`

- **Purpose:** Bulk delete all transactions for a given category (and optionally its children)
- **Input:** `category_id`, `user_id`, `include_children: bool = False`
- **Logic:**
  1. Build list of category IDs (include children if `include_children=True`)
  2. Query all transactions where `category_id IN (category_ids)` AND `user_id == user_id`
  3. For each transaction:
     - Reverse account balance: income → subtract amount, expense → add amount
  4. For each expense transaction, collect unique `(category_id, month)` pairs
  5. Delete all matching transactions in bulk
  6. Recalculate `spent_amount` for all affected budgets
  7. Return count of deleted transactions

---

### File: `backend/app/crud/account.py`

**Modify:** `delete_account`

- **Before deletion:**
  1. Call `transaction.delete_transactions_by_account(db, account_id, user_id)`
  2. Store the deletion count
- **After successful deletion:**
  - Return `(True, deleted_transaction_count)` instead of just `True`
- **Update return type:** `tuple[bool, int]` or create a dataclass/TypedDict

---

### File: `backend/app/crud/category.py`

**Modify:** `delete_category`

- **Before deletion:**
  1. If category has children, decide behavior:
     - Option A: Delete child categories' transactions too (cascade fully)
     - Option B: Only delete transactions for this category, children become orphaned
  2. Call `transaction.delete_transactions_by_category(db, category_id, user_id, include_children=True/False)`
  3. Store the deletion count
- **After successful deletion:**
  - Return `(True, deleted_transaction_count)` instead of just `True`

**Note:** Current behavior sets children's `parent_id` to NULL on parent deletion (`ON DELETE SET NULL`). With cascade delete of transactions, children become top-level categories without transactions.

---

### File: `backend/app/routers/accounts.py`

**Modify:** `delete_account` endpoint

- Remove `IntegrityError` exception handling (no longer needed)
- Optionally return deletion metadata in response headers or body:
  - `X-Deleted-Transactions: 15`
  - Or change to return JSON: `{"deleted": true, "transactions_deleted": 15}`

**Note:** If changing response format, update status code from 204 to 200.

---

### File: `backend/app/routers/categories.py`

**Modify:** `delete_category` endpoint

- Remove `IntegrityError` exception handling
- Same response options as accounts endpoint

---

### File: `backend/app/schemas/account.py` (Optional)

**Add response schema for delete:**

```
class DeleteResponse:
    deleted: bool
    transactions_deleted: int
```

---

## Frontend Changes

### File: `frontend/app/(authenticated)/accounts/page.tsx`

**Modify delete confirmation dialog:**

- Before showing confirmation, fetch transaction count for the account
- Update `DialogDescription` to include warning:
  - "Are you sure you want to delete this account? This will also delete **{count} transactions**. This action cannot be undone."
- If count is 0, show simpler message

---

### File: `frontend/app/(authenticated)/categories/page.tsx`

**Modify delete confirmation dialog:**

- Same pattern as accounts: fetch transaction count before confirmation
- Include warning about transaction deletion

---

### File: `frontend/lib/api.ts`

**Add new functions:**

#### `getTransactionCountByAccount(accountId: string): Promise<number>`

- `GET /api/transactions/count?account_id={id}`

#### `getTransactionCountByCategory(categoryId: string): Promise<number>`

- `GET /api/transactions/count?category_id={id}`

---

### File: `frontend/lib/auth-api.ts`

**Add authenticated versions of count functions to `useApi` hook.**

---

## Backend: Transaction Count Endpoint

### File: `backend/app/routers/transactions.py`

**Add new endpoint:**

#### `GET /api/transactions/count`

- Query params: `account_id`, `category_id` (both optional)
- Returns: `{"count": int}`
- Used by frontend to show deletion warning

---

### File: `backend/app/crud/transaction.py`

**Add function:**

#### `count_transactions`

- **Input:** `db`, `user_id`, optional `account_id`, optional `category_id`
- **Output:** `int`
- **Query:** Count transactions matching filters

---

## Logic Flow

### Account Deletion Flow

1. User clicks "Delete Account" button
2. Frontend fetches transaction count for account
3. Frontend shows confirmation dialog with transaction count warning
4. User confirms deletion
5. Frontend calls `DELETE /api/accounts/{id}`
6. Backend `delete_account` CRUD:
   - Calls `delete_transactions_by_account`
   - For each deleted expense transaction, recalculates affected budgets
   - Deletes account
7. Backend returns success (optionally with deletion count)
8. Frontend refreshes account list

### Category Deletion Flow

1. User clicks "Delete Category" button
2. Frontend fetches transaction count for category
3. Frontend shows confirmation dialog with:
   - Transaction count warning
   - Note about child categories (if applicable)
4. User confirms deletion
5. Frontend calls `DELETE /api/categories/{id}`
6. Backend `delete_category` CRUD:
   - Calls `delete_transactions_by_category` (with children if applicable)
   - For each deleted transaction:
     - Reverses account balance
     - Collects affected budgets
   - Recalculates all affected budgets
   - Deletes category (children's parent_id becomes NULL)
7. Backend returns success
8. Frontend refreshes category list

---

## Edge Cases

1. **Parent category with children:**

   - Current: Children get `parent_id = NULL` (become root categories)
   - Transactions: Delete only parent's transactions, OR cascade to children too
   - Recommendation: Only delete parent's transactions; children retain their transactions

2. **Multiple budgets affected:**

   - Transactions may span multiple months → multiple budget recalculations needed
   - Batch budget recalculation after all transactions deleted

3. **Large transaction sets:**

   - Consider batch deletion for performance (delete in chunks of 1000)
   - Add transaction/timeout handling for large datasets

4. **Concurrent modifications:**
   - Use database transaction to ensure atomicity
   - All operations in single commit

---

## Phases

### Phase 1: Backend CRUD Layer

- Add `delete_transactions_by_account` in `transaction.py`
- Add `delete_transactions_by_category` in `transaction.py`
- Add `count_transactions` in `transaction.py`
- Modify `delete_account` in `account.py`
- Modify `delete_category` in `category.py`

### Phase 2: Backend API Layer

- Add count endpoint to `transactions.py` router
- Update `accounts.py` router (remove IntegrityError handling)
- Update `categories.py` router (remove IntegrityError handling)

### Phase 3: Frontend Updates

- Add count API functions
- Update account delete dialog with transaction warning
- Update category delete dialog with transaction warning
