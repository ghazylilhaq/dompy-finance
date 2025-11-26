# Feature 0012: Transaction Import With Category & Account Mapping

## Context

Implement a transaction import feature that reads data from a fixed Excel/CSV template with columns: `Id`, `Date`, `Categories`, `Amount`, `Accounts`, `Description`. The system must map the string values in `Categories` and `Accounts` columns to the user's existing Category and Account records. Users can create new categories/accounts inline during the mapping process. Mappings are persisted in an "Import Profile" so future imports of the same template auto-map known values.

The fixed column mapping is:
- `Date` → transaction date (parsed as `dd/MM/yyyy`)
- `Categories` → category name (string → `category_id`)
- `Amount` → amount (decimal, negative = expense, positive = income)
- `Accounts` → account name (string → `account_id`)
- `Description` → transaction description
- `Id` → external row identifier (not used as primary key)

---

## Data Layer

### New Database Models

#### 1. ImportProfile

Stores import configuration per user. For MVP, only one profile exists per user (the fixed template).

**Table: `import_profiles`**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `user_id` | VARCHAR(255) | NOT NULL, INDEX | Clerk user ID |
| `name` | VARCHAR(100) | NOT NULL | Profile name (e.g., "Default Template") |
| `column_mapping` | JSON | NOT NULL | Stores fixed column mapping as JSON |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

**Unique Constraint:** `(user_id, name)`

#### 2. ImportValueMapping

Stores persistent mappings from CSV string values to internal IDs.

**Table: `import_value_mappings`**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `profile_id` | UUID | FK → import_profiles.id, ON DELETE CASCADE | Parent profile |
| `mapping_type` | VARCHAR(20) | NOT NULL, CHECK IN ('category', 'account') | Type of mapping |
| `csv_value` | VARCHAR(255) | NOT NULL | Original string from CSV (normalized/trimmed) |
| `internal_id` | UUID | NOT NULL | Target category_id or account_id |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

**Unique Constraint:** `(profile_id, mapping_type, csv_value)`

**Index:** `idx_import_value_mappings_lookup` on `(profile_id, mapping_type)`

---

### Migration File

**Path:** `backend/alembic/versions/20241126_000000_003_import_profiles.py`

Creates both tables with appropriate constraints and indexes.

---

### SQLAlchemy Models

**Path:** `backend/app/models/import_profile.py`

```
class ImportProfile(Base):
    __tablename__ = "import_profiles"
    
    id: UUID
    user_id: str
    name: str
    column_mapping: dict  # JSON field
    created_at: datetime
    updated_at: datetime
    
    # Relationships
    value_mappings: list["ImportValueMapping"]

class ImportValueMapping(Base):
    __tablename__ = "import_value_mappings"
    
    id: UUID
    profile_id: UUID  # FK
    mapping_type: str  # "category" or "account"
    csv_value: str
    internal_id: UUID
    created_at: datetime
    
    # Relationships
    profile: ImportProfile
```

---

### Pydantic Schemas

**Path:** `backend/app/schemas/import_profile.py`

```
# Request/Response schemas:

class ImportProfileResponse:
    id: UUID
    name: str
    column_mapping: dict
    created_at: datetime

class ParsedRow:
    row_index: int
    external_id: str
    date: str  # Original string from CSV
    category_value: str  # Original CSV value
    account_value: str  # Original CSV value
    amount: Decimal
    description: str

class ParseResult:
    total_rows: int
    parsed_rows: list[ParsedRow]
    unmapped_categories: list[str]  # Distinct CSV values not yet mapped
    unmapped_accounts: list[str]  # Distinct CSV values not yet mapped
    existing_category_mappings: dict[str, UUID]  # Already mapped: csv_value → category_id
    existing_account_mappings: dict[str, UUID]  # Already mapped: csv_value → account_id

class MappingItem:
    csv_value: str
    internal_id: UUID

class ConfirmImportRequest:
    profile_id: UUID
    category_mappings: list[MappingItem]  # New mappings to persist
    account_mappings: list[MappingItem]  # New mappings to persist

class ImportResult:
    imported_count: int
    skipped_count: int
    errors: list[str]  # Row-level errors if any
```

---

## Backend Changes

### New Router

**Path:** `backend/app/routers/imports.py`

#### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/imports/profiles` | List user's import profiles |
| `POST` | `/api/imports/profiles` | Create a new import profile |
| `GET` | `/api/imports/profiles/{id}` | Get profile details with mappings |
| `DELETE` | `/api/imports/profiles/{id}` | Delete profile and its mappings |
| `POST` | `/api/imports/parse` | Upload file, parse rows, return unmapped values |
| `POST` | `/api/imports/confirm` | Confirm mappings and create transactions |

---

### CRUD Operations

**Path:** `backend/app/crud/import_profile.py`

Functions:
- `get_or_create_default_profile(db, user_id)` → Returns/creates the default profile
- `get_profile(db, profile_id, user_id)` → Get single profile
- `get_profiles(db, user_id)` → List profiles
- `delete_profile(db, profile_id, user_id)` → Delete profile
- `get_value_mappings(db, profile_id, mapping_type)` → Get all mappings of a type
- `get_value_mapping(db, profile_id, mapping_type, csv_value)` → Get single mapping
- `create_value_mappings(db, profile_id, mappings: list[MappingItem], mapping_type)` → Batch create
- `delete_value_mapping(db, mapping_id)` → Delete single mapping

---

### Import Service

**Path:** `backend/app/services/import_service.py`

Core import logic:

#### `parse_file(file_content: bytes, filename: str) → list[ParsedRow]`

1. Detect file type by extension (.csv or .xlsx)
2. For CSV: parse with Python `csv` module (handle encoding)
3. For Excel: parse with `openpyxl`
4. Normalize headers (strip, lowercase for matching)
5. For each row:
   - Extract `Id` as `external_id`
   - Extract `Date` as raw string
   - Extract `Categories` as raw string (trimmed)
   - Extract `Amount` as Decimal
   - Extract `Accounts` as raw string (trimmed)
   - Extract `Description` as string
6. Return list of `ParsedRow` objects

#### `analyze_mappings(db, profile_id, parsed_rows) → ParseResult`

1. Collect distinct `category_value` and `account_value` from rows
2. Query existing mappings for this profile
3. Partition values into "already mapped" vs "needs mapping"
4. Return `ParseResult` with unmapped lists

#### `execute_import(db, user_id, profile_id, parsed_rows, new_mappings) → ImportResult`

1. Persist new category/account mappings to `import_value_mappings`
2. Build complete mapping lookup (existing + new)
3. For each `ParsedRow`:
   - Parse date from `dd/MM/yyyy` to `datetime`
   - Determine `type`: `expense` if amount < 0, else `income`
   - Convert amount to positive (absolute value)
   - Resolve `category_id` from mapping
   - Resolve `account_id` from mapping
   - Create `TransactionCreate` schema
   - Call `crud.transaction.create_transaction()`
4. Return `ImportResult` with counts

---

### Dependencies

Add to `backend/requirements.txt`:
```
openpyxl>=3.1.2  # Excel file parsing
```

---

### Router Registration

**Path:** `backend/app/main.py`

Add:
```python
from app.routers import imports

app.include_router(
    imports.router,
    prefix="/api/imports",
    tags=["Imports"],
)
```

---

## Frontend Changes

### New Types

**Path:** `frontend/types/index.ts`

Add:
```typescript
export interface ImportProfile {
  id: string;
  name: string;
  columnMapping: Record<string, string>;
  createdAt: string;
}

export interface ParsedRow {
  rowIndex: number;
  externalId: string;
  date: string;
  categoryValue: string;
  accountValue: string;
  amount: number;
  description: string;
}

export interface ParseResult {
  totalRows: number;
  parsedRows: ParsedRow[];
  unmappedCategories: string[];
  unmappedAccounts: string[];
  existingCategoryMappings: Record<string, string>;
  existingAccountMappings: Record<string, string>;
}

export interface MappingItem {
  csvValue: string;
  internalId: string;
}

export interface ImportResult {
  importedCount: number;
  skippedCount: number;
  errors: string[];
}
```

---

### API Client Functions

**Path:** `frontend/lib/api.ts`

Add new section:
```typescript
// =============================================================================
// Imports API
// =============================================================================

export async function getImportProfiles(): Promise<ImportProfile[]>
export async function parseImportFile(profileId: string, file: File): Promise<ParseResult>
export async function confirmImport(
  profileId: string,
  categoryMappings: MappingItem[],
  accountMappings: MappingItem[]
): Promise<ImportResult>
```

Note: `parseImportFile` uses `FormData` with `multipart/form-data` content type.

---

### Hook Updates

**Path:** `frontend/lib/auth-api.ts`

Add to `useApi()` return:
```typescript
// Imports
parseImportFile: (profileId: string, file: File) => Promise<ParseResult>
confirmImport: (profileId: string, categoryMappings: MappingItem[], accountMappings: MappingItem[]) => Promise<ImportResult>
```

---

### New Page

**Path:** `frontend/app/(authenticated)/transactions/import/page.tsx`

Import page with multi-step flow.

---

### New Components

#### 1. ImportWizard

**Path:** `frontend/components/imports/ImportWizard.tsx`

Main wizard component managing import state.

**State:**
- `step`: 'upload' | 'mapping' | 'result'
- `file`: File | null
- `parseResult`: ParseResult | null
- `categoryMappings`: Map<string, string> (csv_value → category_id)
- `accountMappings`: Map<string, string> (csv_value → account_id)
- `importResult`: ImportResult | null
- `isLoading`: boolean
- `error`: string | null

**Step 1: Upload**
- File input accepting `.csv`, `.xlsx`
- "Parse File" button
- On submit: call `parseImportFile()`, move to step 2 or 3

**Step 2: Mapping (conditional)**
- Only shown if `unmappedCategories.length > 0 || unmappedAccounts.length > 0`
- Two mapping tables (categories, accounts)
- "Confirm & Import" button

**Step 3: Result**
- Show success message with count
- "Import Another" button to reset

---

#### 2. ValueMappingTable

**Path:** `frontend/components/imports/ValueMappingTable.tsx`

Props:
```typescript
interface ValueMappingTableProps {
  title: string;
  unmappedValues: string[];
  existingItems: Array<{ id: string; name: string }>;  // Categories or Accounts
  mappings: Map<string, string>;
  onMappingChange: (csvValue: string, internalId: string) => void;
  onCreateNew: (csvValue: string) => void;
}
```

Renders:
- Table with columns: CSV Value (read-only), Map To (Select dropdown), Actions
- Each row shows the CSV string and a dropdown of existing categories/accounts
- "+ New" button per row opens creation modal
- Pre-populates select if mapping exists

---

#### 3. QuickCategoryDialog

**Path:** `frontend/components/imports/QuickCategoryDialog.tsx`

Simplified category creation modal for inline mapping.

Props:
```typescript
interface QuickCategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedName: string;  // Pre-fill from CSV value
  existingCategories: Category[];
  onCreated: (category: Category) => void;
}
```

Fields (MVP):
- Name (pre-filled with CSV value)
- Type: income / expense (toggle, default based on Amount sign context)
- Parent: optional dropdown
- Uses default color/icon

---

#### 4. QuickAccountDialog

**Path:** `frontend/components/imports/QuickAccountDialog.tsx`

Simplified account creation modal for inline mapping.

Props:
```typescript
interface QuickAccountDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedName: string;  // Pre-fill from CSV value
  onCreated: (account: Account) => void;
}
```

Fields (MVP):
- Name (pre-filled with CSV value)
- Type: bank / e-wallet / cash / credit_card (select, default: bank)
- Uses default color/icon, balance = 0

---

### Navigation Update

**Path:** `frontend/components/layout/Sidebar.tsx`

Add import link under Transactions section or as separate menu item:
```
📥 Import Transactions → /transactions/import
```

---

### Button on Transactions Page

**Path:** `frontend/app/(authenticated)/transactions/page.tsx`

Add "Import" button next to "Add Transaction" in PageHeader:
```tsx
<Button variant="neutral" onClick={() => router.push('/transactions/import')}>
  <Upload className="mr-2 h-4 w-4" /> Import
</Button>
```

---

## Logic Flow

### Upload & Parse Flow

1. User navigates to `/transactions/import`
2. User selects CSV/Excel file
3. Frontend calls `POST /api/imports/parse` with file (multipart)
4. Backend:
   - Gets or creates default profile for user
   - Parses file rows
   - Queries existing value mappings
   - Returns `ParseResult`
5. Frontend receives result:
   - If `unmappedCategories.length === 0 && unmappedAccounts.length === 0`:
     - Skip to confirm (auto-import)
   - Else:
     - Show mapping tables for unmapped values only

### Mapping Flow

1. For each unmapped category value:
   - User selects existing category from dropdown, OR
   - User clicks "+ New", creates category, auto-selects it
2. For each unmapped account value:
   - User selects existing account from dropdown, OR
   - User clicks "+ New", creates account, auto-selects it
3. User clicks "Confirm & Import"

### Confirm & Import Flow

1. Frontend collects all mappings (new ones only, not existing)
2. Frontend calls `POST /api/imports/confirm` with:
   - `profile_id`
   - `category_mappings`: list of new `{ csv_value, internal_id }`
   - `account_mappings`: list of new `{ csv_value, internal_id }`
3. Backend:
   - Persists new mappings to `import_value_mappings`
   - Re-parses file (or uses cached parsed rows from session/temp storage)
   - For each row:
     - Parse date (`dd/MM/yyyy` → datetime)
     - Determine type from amount sign
     - Lookup category_id and account_id from combined mappings
     - Create transaction via existing CRUD
   - Returns `ImportResult`
4. Frontend shows success screen with count

### Future Import Flow (same profile, same template)

1. User uploads new file
2. Backend parses and checks mappings
3. If all values already mapped → auto-import (skip mapping UI)
4. If new values appear → show mapping UI only for new values

---

## File Structure Summary

### Backend (New Files)

```
backend/
├── alembic/versions/
│   └── 20241126_000000_003_import_profiles.py
├── app/
│   ├── models/
│   │   └── import_profile.py
│   ├── schemas/
│   │   └── import_profile.py
│   ├── crud/
│   │   └── import_profile.py
│   ├── services/
│   │   └── import_service.py
│   └── routers/
│       └── imports.py
└── requirements.txt (add openpyxl)
```

### Backend (Modified Files)

```
backend/app/
├── main.py (register imports router)
└── models/__init__.py (export new models)
```

### Frontend (New Files)

```
frontend/
├── app/(authenticated)/transactions/import/
│   └── page.tsx
└── components/imports/
    ├── ImportWizard.tsx
    ├── ValueMappingTable.tsx
    ├── QuickCategoryDialog.tsx
    └── QuickAccountDialog.tsx
```

### Frontend (Modified Files)

```
frontend/
├── types/index.ts (add import types)
├── lib/api.ts (add import API functions)
├── lib/auth-api.ts (add useApi import functions)
├── components/layout/Sidebar.tsx (add import link)
└── app/(authenticated)/transactions/page.tsx (add import button)
```

---

## Edge Cases & Validation

### File Parsing
- Empty file → error: "File contains no data rows"
- Missing required columns → error: "Missing column: {name}"
- Invalid date format → row-level error, skip row
- Non-numeric amount → row-level error, skip row

### Mapping
- Duplicate CSV values in file → only show once in mapping table
- CSV value matches existing category/account name exactly → suggest auto-select
- Case-insensitive matching for existing lookups

### Import
- Transaction amount = 0 → skip row (budget constraint)
- Missing category/account mapping → should not happen (UI enforces all mapped)
- Duplicate transactions (same date, amount, description) → allow (no dedup)

---

## Non-Goals (Explicitly Out of Scope)

- Multi-template support with custom column mapping wizard
- Import history/undo functionality
- Automatic bank file fetching
- Transaction deduplication
- Preview table showing all rows before import
- Batch transaction creation optimization (use existing CRUD)

