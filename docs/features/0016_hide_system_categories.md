# Feature 0016: Hide System Categories from UI

## Context

Transfer categories ("Incoming transfer", "Outgoing transfer") are system-managed categories created automatically for all users. Users cannot edit or delete them (enforced by `is_system=True`). However, they currently appear in the UI where users cannot interact with them meaningfully.

This feature will:
1. Hide system categories from the Categories management page
2. Hide system categories from transaction/budget/category form dropdowns
3. **Keep system categories visible in import mapping** (so users can map CSV values to transfer categories)
4. Remove the parent "Transfer" category since it serves no purpose (make transfer categories root-level)
5. Expose `is_system` field in API responses for frontend filtering

---

## Data Layer

### Backend Schema Changes

**File:** `backend/app/schemas/category.py`

Add `is_system` field to `CategoryResponse`:

```
CategoryResponse:
  + is_system: bool = False
```

### Backend CRUD Changes

**File:** `backend/app/crud/category.py`

Modify `ensure_transfer_categories()`:
- Remove creation of parent "Transfer" category
- Create "Incoming transfer" and "Outgoing transfer" as root-level categories (no `parent_id`)
- Both marked with `is_system=True`

### Frontend Type Changes

**File:** `frontend/types/index.ts`

Add to `Category` interface:
```
+ isSystem?: boolean
```

---

## Backend Changes

### Files to Modify

1. **`backend/app/schemas/category.py`**
   - Add `is_system: bool = False` to `CategoryResponse`
   - Add `is_system: bool = False` to `CategoryWithChildren`

2. **`backend/app/crud/category.py`**
   - Modify `ensure_transfer_categories()`:
     - Remove parent "Transfer" category creation
     - Create "Incoming transfer" (type: income) as root category with `is_system=True`
     - Create "Outgoing transfer" (type: expense) as root category with `is_system=True`

3. **`backend/app/services/import_service.py`**
   - Update `get_transfer_category_ids()` to find root-level transfer categories (no parent lookup needed)

---

## Frontend Changes

### Filtering Rules

| Location | Show System Categories? | Reason |
|----------|------------------------|--------|
| Categories page | ❌ No | Users can't edit/delete them |
| Transaction form category dropdown | ❌ No | Transfers use dedicated Transfer UI |
| Budget form category dropdown | ❌ No | Can't budget for transfers |
| Category form parent dropdown | ❌ No | Can't nest under system categories |
| **Import ValueMappingTable** | ✅ Yes | Users must map CSV → transfer categories |
| **Import PreviewTable fix dropdowns** | ✅ Yes | Users must fix mappings to transfer categories |
| QuickCategoryDialog parent dropdown | ❌ No | Can't nest under system categories |

### Files to Modify

1. **`frontend/types/index.ts`**
   - Add `isSystem?: boolean` to `Category` interface

2. **`frontend/app/(authenticated)/categories/page.tsx`**
   - Filter out system categories before display:
     ```typescript
     const userCategories = categories.filter(c => !c.isSystem)
     ```
   - Use `userCategories` for `incomeCategories` and `expenseCategories` filtering

3. **`frontend/components/transactions/TransactionFormDialog.tsx`**
   - Filter out system categories from category select:
     ```typescript
     categories.filter(c => c.type === formData.type && !c.isSystem)
     ```

4. **`frontend/components/budgets/BudgetFormDialog.tsx`**
   - Filter out system categories from `availableCategories`:
     ```typescript
     categories.filter(cat => !cat.isSystem && ...)
     ```

5. **`frontend/components/categories/CategoryFormDialog.tsx`**
   - Filter out system categories from `potentialParents`:
     ```typescript
     existingCategories.filter(c => !c.isSystem && c.type === type && !c.parentId && ...)
     ```

6. **`frontend/components/imports/QuickCategoryDialog.tsx`**
   - Filter out system categories from `potentialParents`:
     ```typescript
     existingCategories.filter(c => !c.isSystem && c.type === type && !c.parentId)
     ```

7. **`frontend/components/imports/ValueMappingTable.tsx`** *(NO CHANGE)*
   - Keep as-is: shows all categories including system categories
   - Users need to see "Incoming transfer" and "Outgoing transfer" to map their CSV values

8. **`frontend/components/imports/ImportPreviewTable.tsx`** *(NO CHANGE)*
   - Keep as-is: shows all categories including system categories
   - Users need to see transfer categories when fixing broken mappings

9. **`frontend/components/imports/ImportWizard.tsx`** *(NO CHANGE)*
   - Keep passing all `categories` to `ValueMappingTable` and `ImportPreviewTable`
   - Import flow must support transfer category mapping

---

## Logic Flow

### Backend: `ensure_transfer_categories()`

1. Check if "Incoming transfer" exists (root-level, `is_system=True`)
2. If not, create it as root category (type: income, no parent)
3. Check if "Outgoing transfer" exists (root-level, `is_system=True`)
4. If not, create it as root category (type: expense, no parent)
5. Return `{"incoming": UUID, "outgoing": UUID}`

### Backend: `get_transfer_category_ids()`

1. Query for categories named "Incoming transfer" and "Outgoing transfer" with `is_system=True`
2. No need to check for parent "Transfer" category
3. Return their IDs or `None` if not found

### Import Flow (Unchanged)

1. User uploads CSV with category values like "Transfer Out", "Transfer In"
2. Mapping step shows ALL categories including "Incoming transfer" and "Outgoing transfer"
3. User maps "Transfer Out" → "Outgoing transfer", "Transfer In" → "Incoming transfer"
4. Preview shows detected transfer pairs
5. Import creates linked transfer transactions

### Frontend: Category Filtering

**Regular UI components** apply this filter:
```typescript
categories.filter(c => !c.isSystem)
```

**Import components** do NOT filter - they show all categories:
```typescript
categories  // No filter, includes system categories
```

---

## Migration Notes

Existing users may have the old "Transfer" parent category. Options:
1. Leave orphaned (children become root-level) - simplest
2. Migration script to clean up orphaned "Transfer" parent

Recommended: Option 1 (no migration needed, parent simply won't be created for new users)

For existing transfer categories with parent_id pointing to "Transfer":
- They will continue to work
- New users won't have a parent "Transfer" category
- Could add optional migration to set `parent_id = NULL` and delete orphaned "Transfer" parent

---

## Testing Checklist

- [ ] Categories page hides "Incoming transfer" and "Outgoing transfer"
- [ ] Transaction form category dropdown hides transfer categories
- [ ] Budget form category dropdown hides transfer categories
- [ ] Category form parent dropdown hides transfer categories
- [ ] Import mapping shows transfer categories in dropdown
- [ ] Import preview fix dropdowns show transfer categories
- [ ] Import correctly detects and creates transfer pairs
- [ ] Manual transfer via Transfer button still works
- [ ] QuickCategoryDialog parent dropdown hides transfer categories
