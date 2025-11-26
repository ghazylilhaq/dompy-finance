# Feature 0014: Internal Account Transfer

## Context

This feature enables users to transfer money between their own accounts (e.g., from a bank account to an e-wallet). A transfer is modeled as two linked transactions: an outgoing leg (expense from source account) and an incoming leg (income to destination account). Both transactions share a `transfer_group_id` and can optionally be excluded from income/expense summaries while still affecting account balances. This ensures that internal transfers don't artificially inflate income/expense totals while correctly moving money between accounts.

The feature includes:

- A Transfer button on each account card in the accounts page
- A Transfer modal with From (read-only), To (dropdown), Amount, Date, Note, and an "Exclude from summary" checkbox
- Automatic creation of two linked transactions with system-generated "Transfer" categories
- Linked editing/deletion: modifying one leg updates the other
- Summary exclusion via `hide_from_summary` flag

---

## Phase 1: Data Layer

### 1.1 Database Schema Changes

#### Transaction Model (`backend/app/models/transaction.py`)

Add three new columns:

| Column              | Type    | Nullable | Default | Description                                        |
| ------------------- | ------- | -------- | ------- | -------------------------------------------------- |
| `is_transfer`       | Boolean | No       | `False` | Marks transaction as part of a transfer pair       |
| `transfer_group_id` | UUID    | Yes      | `None`  | Links two transfer legs together                   |
| `hide_from_summary` | Boolean | No       | `False` | Excludes from income/expense summaries when `True` |

Index: Add index on `transfer_group_id` for efficient linked-leg lookups.

#### Category Model (`backend/app/models/category.py`)

Add one new column:

| Column      | Type    | Nullable | Default | Description                                                         |
| ----------- | ------- | -------- | ------- | ------------------------------------------------------------------- |
| `is_system` | Boolean | No       | `False` | Marks category as system-generated (non-editable/deletable by user) |

#### Constraint Updates

- Transaction `type` constraint remains `IN ('income', 'expense')` — outgoing transfer uses `expense`, incoming uses `income`
- Category `type` constraint remains unchanged

### 1.2 Alembic Migration

**File:** `backend/alembic/versions/20241126_000000_004_transfer_support.py`

Migration steps:

1. Add `is_transfer` column to `transactions` with default `False`
2. Add `transfer_group_id` column to `transactions` (nullable UUID)
3. Add `hide_from_summary` column to `transactions` with default `False`
4. Add `is_system` column to `categories` with default `False`
5. Create index on `transfer_group_id`

### 1.3 Seed Data (System Categories)

Create system transfer categories via migration data script or application startup:

```
Parent: "Transfer"
├── type: expense (placeholder, not used directly)
├── icon: "ArrowLeftRight"
├── color: "#6B7280" (gray)
├── is_system: true
├── Children:
│   ├── "Incoming transfer" (type: income, is_system: true)
│   └── "Outgoing transfer" (type: expense, is_system: true)
```

These categories are created per-user on first transfer creation or via explicit seeding. A utility function `ensure_transfer_categories(db, user_id)` should create them if missing.

---

## Phase 2A: Backend API Layer

### 2.1 Schema Changes

#### File: `backend/app/schemas/transaction.py`

Add new schemas:

**TransferCreate**

```
- from_account_id: UUID (required)
- to_account_id: UUID (required, must differ from from_account_id)
- amount: Decimal (required, > 0)
- date: datetime (required, defaults to now)
- description: str (optional, max 500 chars, default: "Transfer")
- hide_from_summary: bool (default: True)
```

**TransferResponse**

```
- transfer_group_id: UUID
- outgoing_transaction: TransactionResponse
- incoming_transaction: TransactionResponse
```

**TransactionResponse** (extend existing)

```
- is_transfer: bool
- transfer_group_id: UUID | None
- hide_from_summary: bool
```

### 2.2 CRUD Changes

#### File: `backend/app/crud/transaction.py`

New functions:

**`create_transfer(db, data: TransferCreate, user_id: str) -> tuple[Transaction, Transaction]`**

- Generate a new `transfer_group_id` (UUID)
- Call `ensure_transfer_categories(db, user_id)` to get/create transfer category IDs
- Create outgoing transaction:
  - account_id = from_account_id
  - type = "expense"
  - amount = data.amount
  - category_id = "Outgoing transfer" category ID
  - is_transfer = True
  - transfer_group_id = generated UUID
  - hide_from_summary = data.hide_from_summary
- Create incoming transaction:
  - account_id = to_account_id
  - type = "income"
  - amount = data.amount
  - category_id = "Incoming transfer" category ID
  - is_transfer = True
  - transfer_group_id = same UUID
  - hide_from_summary = data.hide_from_summary
- Update both account balances in single DB transaction
- Return both transactions

**`get_transfer_pair(db, transfer_group_id: UUID, user_id: str) -> list[Transaction]`**

- Retrieve both transactions sharing the transfer_group_id

**`update_transfer(db, transaction_id: UUID, data: TransactionUpdate, user_id: str) -> tuple[Transaction, Transaction]`**

- Fetch the transaction
- If `is_transfer` is True, fetch the paired transaction via `transfer_group_id`
- Apply updates to both legs:
  - amount: update both (outgoing negative, incoming positive effect)
  - date: update both
  - description: update both
  - hide_from_summary: update both
- Recalculate account balances for both affected accounts
- Return both updated transactions

**`delete_transfer(db, transaction_id: UUID, user_id: str) -> bool`**

- Fetch the transaction
- If `is_transfer` is True, delete both legs via `transfer_group_id`
- Reverse account balance changes for both accounts
- Return success

#### File: `backend/app/crud/category.py`

New function:

**`ensure_transfer_categories(db, user_id: str) -> dict[str, UUID]`**

- Check if "Transfer" parent category exists for user
- If not, create parent and both children with `is_system=True`
- Return `{"parent": parent_id, "incoming": incoming_id, "outgoing": outgoing_id}`

**`get_category_by_name(db, name: str, user_id: str) -> Category | None`**

- Helper to find category by name

### 2.3 Router Changes

#### File: `backend/app/routers/transactions.py`

New endpoint:

**`POST /api/transactions/transfer`**

- Request body: TransferCreate
- Creates transfer pair
- Returns: TransferResponse with both transactions

Modify existing endpoints:

**`PATCH /api/transactions/{id}`**

- Check if transaction is a transfer (`is_transfer=True`)
- If transfer, delegate to `update_transfer()` which updates both legs
- Return updated transaction (or both if needed)

**`DELETE /api/transactions/{id}`**

- Check if transaction is a transfer
- If transfer, delegate to `delete_transfer()` which deletes both legs

### 2.4 Dashboard & Summary Exclusion

#### File: `backend/app/routers/dashboard.py`

Modify `get_stats()`:

- Add filter `hide_from_summary == False` to income/expense sum queries
- Total balance calculation remains unchanged (includes all transactions)

#### File: `backend/app/crud/budget.py`

Modify `recalculate_spent()`:

- Add filter `hide_from_summary == False` when summing expense transactions
- Transfers excluded from budget tracking by default

---

## Phase 2B: Frontend UI Layer

### 2.1 Type Changes

#### File: `frontend/types/index.ts`

Extend Transaction interface:

```typescript
interface Transaction {
  // ... existing fields
  isTransfer?: boolean;
  transferGroupId?: string;
  hideFromSummary?: boolean;
}
```

Add new types:

```typescript
interface TransferCreate {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string;
  hideFromSummary?: boolean;
}

interface TransferResponse {
  transferGroupId: string;
  outgoingTransaction: Transaction;
  incomingTransaction: Transaction;
}
```

### 2.2 API Client Changes

#### File: `frontend/lib/auth-api.ts`

Add new function:

```typescript
createTransfer(data: TransferCreate): Promise<TransferResponse>
```

### 2.3 New Components

#### File: `frontend/components/transfers/TransferFormDialog.tsx`

Props:

```typescript
interface TransferFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  fromAccount: Account; // Pre-selected source account
  accounts: Account[]; // All user accounts for "To" dropdown
  onSuccess: () => void; // Callback after successful transfer
}
```

Form fields:

- From account: Read-only display (account name + icon)
- To account: Select dropdown (filtered to exclude fromAccount)
- Amount: Number input (positive only)
- Date: Date picker (default: today)
- Note/memo: Text input (optional)
- Checkbox: "Exclude this transfer from income/expense summary" (default: checked)

Submit handler:

- Validate to_account ≠ from_account
- Validate amount > 0
- Call `createTransfer()` API
- Close dialog on success
- Refresh accounts list (balances changed)

### 2.4 Account Page Changes

#### File: `frontend/app/(authenticated)/accounts/page.tsx`

Add to each account card's action overlay:

- New "Transfer" button (icon: `ArrowLeftRight`)
- On click: open TransferFormDialog with account as `fromAccount`

State additions:

```typescript
const [transferFromAccount, setTransferFromAccount] = useState<Account | null>(
  null
);
const [isTransferOpen, setIsTransferOpen] = useState(false);
```

Add TransferFormDialog to page JSX.

### 2.5 Transaction Display Changes

#### File: `frontend/components/transactions/TransactionTable.tsx`

- Add visual indicator for transfer transactions (e.g., link icon or "Transfer" badge)
- Consider showing paired transaction reference

#### File: `frontend/app/(authenticated)/transactions/[id]/page.tsx`

- If viewing a transfer transaction, show link to paired transaction
- Display `hideFromSummary` status
- Edit form should update both legs (handled by backend)

---

## Logic Flow

### Transfer Creation Flow

1. User clicks "Transfer" on account card
2. Modal opens with source account pre-filled
3. User selects destination account, enters amount, date, optional note
4. User confirms (or unchecks) "Exclude from summary" checkbox
5. On submit:
   - Frontend calls `POST /api/transactions/transfer`
   - Backend generates `transfer_group_id`
   - Backend ensures transfer categories exist for user
   - Backend creates outgoing transaction (expense from source)
   - Backend creates incoming transaction (income to destination)
   - Backend updates source account balance (-amount)
   - Backend updates destination account balance (+amount)
   - All in single DB transaction
6. Frontend refreshes account list to show updated balances

### Transfer Edit Flow

1. User opens transaction detail for a transfer leg
2. User edits amount, date, or note
3. On save:
   - Backend detects `is_transfer=True`
   - Backend fetches paired transaction via `transfer_group_id`
   - Backend applies identical changes to both legs
   - Backend recalculates both account balances
4. Frontend refreshes

### Transfer Delete Flow

1. User deletes a transfer transaction
2. Backend detects `is_transfer=True`
3. Backend deletes both legs
4. Backend reverses balance changes on both accounts
5. Frontend refreshes

### Summary Exclusion Logic

- Dashboard stats query: `WHERE hide_from_summary = False`
- Budget spent calculation: `WHERE hide_from_summary = False`
- Account balance: Includes ALL transactions (transfers affect balances)
- Transaction list: Shows all transactions, but may display "hidden from summary" indicator

---

## Files to Create

| File                                                               | Purpose                   |
| ------------------------------------------------------------------ | ------------------------- |
| `backend/alembic/versions/20241126_000000_004_transfer_support.py` | Migration for new columns |
| `frontend/components/transfers/TransferFormDialog.tsx`             | Transfer modal component  |
| `frontend/components/transfers/index.ts`                           | Barrel export             |

## Files to Modify

### Backend

| File                                  | Changes                                                             |
| ------------------------------------- | ------------------------------------------------------------------- |
| `backend/app/models/transaction.py`   | Add `is_transfer`, `transfer_group_id`, `hide_from_summary` columns |
| `backend/app/models/category.py`      | Add `is_system` column                                              |
| `backend/app/schemas/transaction.py`  | Add TransferCreate, TransferResponse, extend TransactionResponse    |
| `backend/app/crud/transaction.py`     | Add transfer CRUD functions, modify delete to handle pairs          |
| `backend/app/crud/category.py`        | Add `ensure_transfer_categories()`, `get_category_by_name()`        |
| `backend/app/routers/transactions.py` | Add transfer endpoint, modify PATCH/DELETE for linked updates       |
| `backend/app/routers/dashboard.py`    | Filter `hide_from_summary` in stats queries                         |
| `backend/app/crud/budget.py`          | Filter `hide_from_summary` in spent calculation                     |

### Frontend

| File                                                    | Changes                                |
| ------------------------------------------------------- | -------------------------------------- |
| `frontend/types/index.ts`                               | Add transfer types, extend Transaction |
| `frontend/lib/auth-api.ts`                              | Add `createTransfer()` function        |
| `frontend/app/(authenticated)/accounts/page.tsx`        | Add Transfer button and dialog         |
| `frontend/components/transactions/TransactionTable.tsx` | Add transfer indicator                 |

---

## Edge Cases

1. **Self-transfer prevention**: Validate `to_account_id ≠ from_account_id` in schema
2. **Orphaned legs**: Ensure both legs are always created/deleted together using DB transaction
3. **System category protection**: Prevent deletion/editing of `is_system=True` categories
4. **User isolation**: Transfer categories are per-user; `ensure_transfer_categories()` creates them for each user
5. **Negative balances**: Allow transfers even if source account would go negative (credit cards, overdrafts)
6. **Date validation**: Transfers can be backdated (historical transfers)
