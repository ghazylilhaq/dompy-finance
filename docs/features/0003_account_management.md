# Feature: Account Management Improvements

## Context
The user wants to improve the Accounts page to allow creating, editing, and deleting accounts with a rich UI that includes icon and color selection, similar to the Categories page.

## Changes

### 1. Data Model
**File:** `frontend/types/index.ts`
- Update `Account` interface to include:
  - `color: string`
  - `icon: string`

**File:** `frontend/data/accounts.json`
- Add default `color` and `icon` fields to existing entries to match the new type definition.

### 2. Components

**Create `frontend/components/accounts/AccountFormDialog.tsx`**
- A reusable dialog component for creating and editing accounts.
- **Props:**
  - `isOpen: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `onSubmit: (account: Omit<Account, "id">) => void`
  - `initialData?: Account` (Optional, for edit mode)
- **Fields:**
  - Name (Input)
  - Type (Select: 'cash', 'bank', 'e-wallet', 'credit card')
  - Initial Balance (Input type="number")
  - Icon (Selection grid, similar to `CategoryFormDialog`)
  - Color (Selection circles, similar to `CategoryFormDialog`)

### 3. Page Implementation

**File:** `frontend/app/accounts/page.tsx`
- **State Management:**
  - `accounts`: Manage local state initialized from `accountsData`.
  - `isDialogOpen`: Boolean for form visibility.
  - `editingAccount`: Store the `Account` object currently being edited (or null).
  - `isDeleteDialogOpen`: Boolean for delete confirmation visibility.
  - `accountToDelete`: Store the ID of the account pending deletion.

- **Functions:**
  - `handleCreate(data)`: Generate ID, add `color`/`icon`/`balance`/`type`/`name` to list.
  - `handleUpdate(id, data)`: Update existing account in the list.
  - `handleDelete(id)`: Remove account from list.

- **UI Updates:**
  - **Header:** "Add Account" button opens `AccountFormDialog` in create mode.
  - **Account Card:**
    - Display the account's specific `color` and `icon` instead of dynamic defaults.
    - Add action buttons (Edit, Delete).
      - Edit: Opens `AccountFormDialog` with `initialData`.
      - Delete: Opens a confirmation dialog (`AlertDialog`).

### 4. Dependencies
- Reuse `CATEGORY_ICONS` and `CATEGORY_COLORS` from `frontend/lib/constants.ts` (or create specific ACCOUNT constants if needed, but reusing is fine for now).
- Use `AlertDialog` components from `frontend/components/ui/alert-dialog.tsx` (ensure it exists or use `Dialog` as fallback).

