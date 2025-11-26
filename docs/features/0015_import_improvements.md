# Feature 0015: Import Improvements

## Context

This feature improves the transaction import functionality with two enhancements:

1. **Transfer Detection**: Automatically detect and link transfer transactions when importing. When CSV rows have categories mapped to "Incoming transfer" or "Outgoing transfer", the system should pair them into linked transfer transactions (using `transfer_group_id`) rather than creating independent income/expense records.

2. **Import Preview**: Add a preview step before confirming import. Users can review the transactions that will be created, see how categories/accounts resolved, and optionally exclude specific rows before final import.

---

## Phase 1: Transfer Detection

### 1.1 Detection Strategy

**Matching Criteria** for transfer pairs:

- Both rows have categories that map to transfer categories ("Incoming transfer" or "Outgoing transfer")
- Same date
- Same absolute amount (one negative, one positive)
- Different accounts

**Matching Algorithm**:

1. During import execution, collect all rows that resolve to transfer categories
2. Group potential pairs by (date, absolute_amount)
3. Within each group, match outgoing (negative amount) with incoming (positive amount)
4. Unmatched transfer rows are imported as regular transactions (with warning)

### 1.2 Backend Changes

#### File: `backend/app/services/import_service.py`

**New Function: `detect_transfer_pairs()`**

```
def detect_transfer_pairs(
    rows: list[ParsedRow],
    category_mappings: dict[str, UUID],
    transfer_category_ids: dict[str, UUID],  # {"incoming": UUID, "outgoing": UUID}
) -> tuple[list[tuple[ParsedRow, ParsedRow]], list[ParsedRow]]
```

Input:

- `rows`: All parsed rows
- `category_mappings`: CSV value → category_id mappings
- `transfer_category_ids`: IDs of "Incoming transfer" and "Outgoing transfer" categories

Output:

- `transfer_pairs`: List of (outgoing_row, incoming_row) tuples
- `regular_rows`: Rows that are not part of a transfer pair

Algorithm:

1. Separate rows into transfer candidates vs regular based on resolved category_id
2. Group transfer candidates by (date_str, abs(amount))
3. For each group:
   - Find rows with negative amount (outgoing candidates)
   - Find rows with positive amount (incoming candidates)
   - Match pairs where accounts differ
   - Unmatched candidates go to regular_rows with warning flag
4. Return paired transfers and remaining regular rows

**Modify: `execute_import()`**

Add transfer detection step:

1. Get user's transfer category IDs via `ensure_transfer_categories()`
2. Call `detect_transfer_pairs()` to separate transfer pairs from regular rows
3. For transfer pairs: call `transaction_crud.create_transfer()`
4. For regular rows: call existing `create_transaction()` logic
5. Track imported transfers separately in result

#### File: `backend/app/schemas/import_profile.py`

**Extend `ImportResult`**:

```python
class ImportResult(BaseModel):
    imported_count: int
    skipped_count: int
    transfer_count: int  # NEW: Number of transfer pairs created
    errors: list[str]
```

### 1.3 Frontend Changes

#### File: `frontend/components/imports/ImportWizard.tsx`

Update result display to show transfer count:

```
"Successfully imported {importedCount} transactions and {transferCount} transfers"
```

---

## Phase 2: Import Preview

### 2.1 New Import Step

Add a "preview" step between "mapping" and "result":

```
upload → mapping → preview → result
```

### 2.2 Backend Changes

#### File: `backend/app/schemas/import_profile.py`

**New Schema: `PreviewRow`**

```python
class PreviewRow(BaseModel):
    row_index: int
    external_id: str
    date: str  # Original date string
    parsed_date: str | None  # ISO format if parseable, None if invalid
    amount: Decimal
    type: str  # "income", "expense", or "transfer"
    description: str

    # Resolved values
    category_value: str  # Original CSV value
    category_id: UUID | None
    category_name: str | None

    account_value: str  # Original CSV value
    account_id: UUID | None
    account_name: str | None

    # Validation
    is_valid: bool
    validation_errors: list[str]

    # Transfer pairing (if applicable)
    is_transfer: bool
    transfer_pair_index: int | None  # Index of paired row

    # User can exclude rows
    excluded: bool = False
```

**New Schema: `PreviewResult`**

```python
class PreviewResult(BaseModel):
    profile_id: UUID
    rows: list[PreviewRow]
    total_valid: int
    total_invalid: int
    total_transfers: int  # Count of transfer pairs detected
    warnings: list[str]
```

**Modify `ConfirmImportRequest`**:

```python
class ConfirmImportRequest(BaseModel):
    profile_id: UUID
    category_mappings: list[MappingItem]
    account_mappings: list[MappingItem]
    parsed_rows: list[ParsedRow]
    excluded_indices: list[int] = []  # NEW: Row indices to skip
```

#### File: `backend/app/services/import_service.py`

**New Function: `generate_preview()`**

```python
def generate_preview(
    db: Session,
    user_id: str,
    profile_id: UUID,
    parsed_rows: list[ParsedRow],
    category_mappings: dict[str, UUID],
    account_mappings: dict[str, UUID],
) -> PreviewResult:
```

Logic:

1. Get category and account details for name resolution
2. Get transfer category IDs
3. For each row:
   - Parse date (mark invalid if unparseable)
   - Resolve category_id and category_name
   - Resolve account_id and account_name
   - Determine type (income/expense/transfer based on amount sign and category)
   - Validate row completeness
   - Collect validation errors
4. Detect transfer pairs
5. Return PreviewResult with all enriched rows

#### File: `backend/app/routers/imports.py`

**New Endpoint: `POST /api/imports/preview`**

```python
@router.post("/preview", response_model=PreviewResult)
def preview_import(
    request: PreviewRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Generate a preview of the import with resolved values.
    Shows how each row will be imported and validates data.
    """
```

Request body:

```python
class PreviewRequest(BaseModel):
    profile_id: UUID
    parsed_rows: list[ParsedRow]
    category_mappings: list[MappingItem]  # Includes new mappings from UI
    account_mappings: list[MappingItem]
```

**Modify: `POST /api/imports/confirm`**

- Accept `excluded_indices` to skip specific rows
- Pass exclusions to `execute_import()`

### 2.3 Frontend Changes

#### File: `frontend/types/index.ts`

Add preview types:

```typescript
interface PreviewRow {
  rowIndex: number;
  externalId: string;
  date: string;
  parsedDate: string | null;
  amount: number;
  type: "income" | "expense" | "transfer";
  description: string;

  categoryValue: string;
  categoryId: string | null;
  categoryName: string | null;

  accountValue: string;
  accountId: string | null;
  accountName: string | null;

  isValid: boolean;
  validationErrors: string[];

  isTransfer: boolean;
  transferPairIndex: number | null;

  excluded: boolean;
}

interface PreviewResult {
  profileId: string;
  rows: PreviewRow[];
  totalValid: number;
  totalInvalid: number;
  totalTransfers: number;
  warnings: string[];
}
```

#### File: `frontend/lib/auth-api.ts`

Add preview API function:

```typescript
previewImport(
  profileId: string,
  parsedRows: ParsedRow[],
  categoryMappings: MappingItem[],
  accountMappings: MappingItem[]
): Promise<PreviewResult>
```

#### File: `frontend/components/imports/ImportPreviewTable.tsx` (NEW)

New component for preview display:

Props:

```typescript
interface ImportPreviewTableProps {
  rows: PreviewRow[];
  onToggleExclude: (rowIndex: number) => void;
  onExcludeAll: (indices: number[]) => void;
}
```

Features:

- Table displaying all preview rows
- Columns: Date, Type, Amount, Category, Account, Description, Status
- Visual indicators:
  - ✓ Green for valid rows
  - ⚠ Yellow for rows with warnings
  - ✗ Red for invalid rows (will be skipped)
  - 🔗 Link icon for transfer pairs
- Checkbox to exclude individual rows
- "Exclude invalid" button to bulk-exclude all invalid rows
- Transfer pairs highlighted with matching colors/icons
- Tooltips showing validation errors

#### File: `frontend/components/imports/ImportWizard.tsx`

**Add preview step**:

State additions:

```typescript
const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set());
```

Step flow changes:

```typescript
type ImportStep = "upload" | "mapping" | "preview" | "result";
```

New handlers:

```typescript
const handleGeneratePreview = async () => {
  // After mapping, generate preview instead of direct import
  const preview = await previewImport(...);
  setPreviewResult(preview);
  setStep("preview");
};

const handleToggleExclude = (rowIndex: number) => {
  setExcludedIndices(prev => {
    const next = new Set(prev);
    if (next.has(rowIndex)) {
      next.delete(rowIndex);
    } else {
      next.add(rowIndex);
    }
    return next;
  });
};

const handleConfirmWithExclusions = async () => {
  await confirmImport(
    profileId,
    categoryMappings,
    accountMappings,
    parsedRows,
    Array.from(excludedIndices)
  );
};
```

Preview step UI:

- Summary stats card: "X valid, Y invalid, Z transfers"
- ImportPreviewTable component
- "Back to Mapping" button
- "Import X Transactions" button (count excludes excluded rows)

---

## Logic Flow

### Transfer Detection Flow

```
CSV Rows
    │
    ▼
┌─────────────────────────────────────┐
│ Separate by resolved category_id   │
│ Is it a transfer category?         │
├─────────────────────────────────────┤
│ YES → Transfer candidates          │
│ NO  → Regular rows                 │
└─────────────────────────────────────┘
    │
    ▼ (Transfer candidates)
┌─────────────────────────────────────┐
│ Group by (date, abs_amount)        │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ For each group:                     │
│ - Find negative amount row (out)   │
│ - Find positive amount row (in)    │
│ - Verify different accounts        │
│ - Create transfer pair             │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Unmatched transfer rows:           │
│ → Import as regular transaction    │
│ → Add warning to result            │
└─────────────────────────────────────┘
```

### Import Flow with Preview

```
User uploads file
    │
    ▼
POST /api/imports/parse
    │
    ▼
┌─────────────────────────────────────┐
│ MAPPING STEP                        │
│ User maps unmapped values           │
│ (or skip if all mapped)             │
└─────────────────────────────────────┘
    │
    ▼
POST /api/imports/preview
    │
    ▼
┌─────────────────────────────────────┐
│ PREVIEW STEP                        │
│ - Review resolved transactions     │
│ - See transfer pairs               │
│ - Exclude invalid/unwanted rows    │
└─────────────────────────────────────┘
    │
    ▼
POST /api/imports/confirm (with exclusions)
    │
    ▼
┌─────────────────────────────────────┐
│ RESULT STEP                         │
│ - Show imported count              │
│ - Show transfer count              │
│ - Show any errors                  │
└─────────────────────────────────────┘
```

---

## Files to Create

| File                                                 | Purpose                 |
| ---------------------------------------------------- | ----------------------- |
| `frontend/components/imports/ImportPreviewTable.tsx` | Preview table component |

## Files to Modify

### Backend

| File                                     | Changes                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `backend/app/schemas/import_profile.py`  | Add PreviewRow, PreviewResult, PreviewRequest; extend ImportResult with transfer_count; add excluded_indices to ConfirmImportRequest |
| `backend/app/services/import_service.py` | Add detect_transfer_pairs(), generate_preview(); modify execute_import() for transfer detection and exclusions                       |
| `backend/app/routers/imports.py`         | Add POST /preview endpoint                                                                                                           |

### Frontend

| File                                           | Changes                                                      |
| ---------------------------------------------- | ------------------------------------------------------------ |
| `frontend/types/index.ts`                      | Add PreviewRow, PreviewResult types                          |
| `frontend/lib/auth-api.ts`                     | Add previewImport() function                                 |
| `frontend/components/imports/ImportWizard.tsx` | Add preview step, exclusion handling, transfer count display |
| `frontend/components/imports/index.ts`         | Export ImportPreviewTable                                    |

---

## Edge Cases

1. **Orphaned transfer legs**: If only one side of a transfer exists in CSV (e.g., only outgoing), import as regular expense with warning
2. **Multiple potential matches**: If multiple rows could pair (same date/amount), use first match and warn about ambiguity
3. **Self-transfer in CSV**: If both legs have same account, treat as regular transactions (not a valid transfer)
4. **Already-imported transfers**: No duplicate detection currently - user can re-import same file
5. **Transfer category mapping**: User must have transfer categories created (auto-created on first transfer creation via UI)
6. **Date parsing failures**: Invalid dates shown in preview with error, excluded from import count
7. **Excluded row count**: UI shows "Import X of Y rows" based on exclusions
8. **Transfer pair exclusion**: Excluding one leg should warn that both will be excluded (or auto-exclude both)

---

## UI Mockup (Preview Step)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Import Preview                                           [Back] [Import]│
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│ │ ✓ 45 Valid │ │ ⚠ 3 Warns  │ │ ✗ 2 Invalid │ │ 🔗 4 Trans. │        │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │
├─────────────────────────────────────────────────────────────────────────┤
│ [ ] Select All    [Exclude Invalid]                                     │
├────┬──────────┬────────┬──────────┬──────────┬──────────┬──────────────┤
│ [] │ Date     │ Type   │ Amount   │ Category │ Account  │ Status       │
├────┼──────────┼────────┼──────────┼──────────┼──────────┼──────────────┤
│ [] │ 26/11/24 │ 💸 Exp │ -50,000  │ Food     │ Cash     │ ✓ Valid      │
│ [] │ 26/11/24 │ 💰 Inc │ +500,000 │ Salary   │ Bank     │ ✓ Valid      │
│ [] │ 25/11/24 │ 🔗 Out │ -100,000 │ Out Trf  │ Bank     │ 🔗 Pair #1   │
│ [] │ 25/11/24 │ 🔗 In  │ +100,000 │ In Trf   │ E-Wallet │ 🔗 Pair #1   │
│ [] │ 24/11/24 │ 💸 Exp │ -25,000  │ ???      │ Cash     │ ⚠ No cat.   │
│ [x]│ invalid  │ ???    │ ???      │ ???      │ ???      │ ✗ Bad date  │
└────┴──────────┴────────┴──────────┴──────────┴──────────┴──────────────┘
│                                                                         │
│                        [Import 48 Transactions]                         │
└─────────────────────────────────────────────────────────────────────────┘
```
