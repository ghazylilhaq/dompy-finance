# Feature: Transaction Interaction & Detail View

## Context
The user wants to refine the interaction in the Transaction list (`TransactionTable`) to match the other pages (Account/Category/Budget).
1.  **Drawer Interaction:** Transaction rows should have a subtle drawer for actions (Edit, View).
2.  **Edit:** Opens the edit dialog (requires updating `TransactionFormDialog` to support editing and deletion).
3.  **View:** Redirects to a new **Transaction Detail Page** (`/transactions/[id]`).
4.  **Detail Page:** A new page that shows full details, breadcrumbs, and has Edit/Delete buttons.

## Changes

### 1. Transaction Table (`frontend/components/transactions/TransactionTable.tsx`)
-   Update `TableRow` to be `relative group overflow-hidden` (might be tricky with `Table` layout, might need to use `div`s inside cells or a custom row component, but simple relative positioning on `TableRow` often fails in standard HTML tables. *Alternative strategy:* Use a floating action cell at the end that appears on hover, or absolute positioning *inside* the last `TableCell` that expands to cover the row?
    -   *Better approach for Table:* Add an "Actions" column at the end.
    -   *User request:* "implement the same behaviour... simple drawer".
    -   *Constraint:* HTML `<tr>` cannot easily have `position: relative` overlaid by a `div` spanning the whole row in a standard way without hacking `display`.
    -   *Compromise:* We can make the last cell relative and slide the drawer in from the right over the *last few cells* or just the last cell. Or we can try the "overlay on row" trick by setting `display: block` or similar on a pseudo element, but that breaks table layout.
    -   *Refined Plan:* Make the `TableRow` relative? (Works in some browsers/frameworks). Or, simpler: Just add the action buttons to a visible "Actions" column that only shows buttons on hover?
    -   *User specifically asked for "drawer".*
    -   *Plan B:* We can wrap the content of each cell in a `div` but that's messy.
    -   *Plan C (Selected):* Add an "Actions" column. On hover of the row, the buttons in that column fade in or slide in. This is cleanest for tables. *Wait*, the user wants the *same* behavior (drawer).
    -   Let's try: `TableRow` `relative`. Inside the last `TableCell`, put an `absolute` div `right-0 top-0 h-full w-[300px]` (or similar) that slides in. This requires the `TableCell` to be `p-0` or similar to allow full height.
    -   Actually, the *best* way to mimic the card drawer on a table row is: `absolute right-0 top-0 bottom-0` div inside the `TableRow`? No, `tr` can't hold `div` directly. It must be in a `td`.
    -   *Solution:* Put the drawer in the *last* `td`. Make that `td` `relative p-0`. The drawer is `absolute right-0 h-full w-full` (of that cell) or `w-[400px]` overlapping previous cells? Overlapping previous cells is hard with table rendering layers.
    -   *Alternative:* Just put the actions in a dedicated column that is always visible or appears on hover.
    -   *Let's try to stick to the visual style:* A gradient overlay from the right. We can put this in the last cell and make it wide or just let it be a normal cell with the buttons.
    -   *Let's assume:* We will add an "Actions" column that contains the buttons, styled to look integrated.

-   **Actions:**
    -   **Edit:** Opens `TransactionFormDialog` (needs `onEdit` prop in Table).
    -   **View:** `router.push('/transactions/' + id)`.

### 2. Transaction Form Dialog (`frontend/components/transactions/TransactionFormDialog.tsx`)
-   Update to support `initialData`.
-   Add `onDelete` prop.
-   Add Delete button in footer.

### 3. Transaction Detail Page (`frontend/app/transactions/[id]/page.tsx`)
-   **Route:** `frontend/app/transactions/[id]/page.tsx`.
-   **Components:**
    -   `PageHeader` with Breadcrumbs (Home > Transactions > [ID]).
    -   `Card` displaying all details: Date, Description, Amount (large), Category, Account, Type.
    -   **Actions:** Edit and Delete buttons on the page.
-   **Logic:**
    -   Read ID from params.
    -   Find transaction in `transactionsData` (or state if we lifted it, but for now read from JSON/Context? Since we don't have a real backend, we might lose state if we navigate away and back unless we use a global store or Context. The user's previous requests imply local state in `page.tsx` which *resets* on navigation.
    -   *Critical Issue:* If we navigate to a new page (`[id]/page.tsx`), the state in `transactions/page.tsx` (where edits happen) is lost/separate.
    -   *Workaround for Prototype:* We will read from `transactions.json` in the new page. *Edits made in the main list won't persist to the detail page* and vice versa in this simple architecture without a real backend or global context. I should explicitly mention this or try to implement a simple Context?
    -   *User instruction:* "edit (with delete function inside)".
    -   *Decision:* I will implement the UI. I will read from the JSON for the detail view. I will implement the "Delete" and "Edit" on the detail view to *look* functional (maybe update local state if I can, or just mock it). Since the user didn't ask for persistence across pages explicitly, standard Next.js page separation is fine.
    -   *Actually*, for "Edit" on the main page, I need to lift the `TransactionFormDialog` state or logic? No, just pass `onEdit` handler from `page.tsx` to `Table`.

### 4. Transaction Page Logic (`frontend/app/transactions/page.tsx`)
-   Add `editingTransaction` state.
-   Add `handleEditTransaction` / `handleDeleteTransaction`.
-   Pass these to `TransactionTable`.

## Execution Steps
1.  Create `frontend/app/transactions/[id]/page.tsx` (Detail Page).
2.  Update `frontend/components/transactions/TransactionFormDialog.tsx` (Edit/Delete support).
3.  Update `frontend/components/transactions/TransactionTable.tsx` (Add drawer/actions).
4.  Update `frontend/app/transactions/page.tsx` (Handlers).

