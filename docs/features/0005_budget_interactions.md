# Feature: Budget Card Interaction Refinement

## Context
The user wants to apply the same "hover drawer" interaction used in Accounts and Categories to the Budget list items in `frontend/app/budgets/page.tsx`.
Current Budget list uses a `DropdownMenu` for actions. This needs to be replaced with the slide-up drawer.

## Requirements
1.  **Drawer Interaction:**
    *   Budget items should have a hidden action area that slides up/in on hover.
    *   "Subtle" and "don't overlap" style (using the gradient background or bottom overlay).
2.  **Actions:**
    *   **View:** Redirect to Transactions page filtered by the budget's category.
    *   **Edit:** Open the `BudgetFormDialog`.
    *   **Delete:** The delete function should be moved *inside* the Edit dialog (consistent with Accounts), removing the standalone delete alert from the main page view (or at least the trigger for it).

## Changes

### 1. Component Updates (`frontend/components/budgets/BudgetFormDialog.tsx`)
-   Add `onDelete` prop.
-   Add "Delete Budget" button in the footer if `initialData` exists.

### 2. Page Refactoring (`frontend/app/budgets/page.tsx`)
-   **Remove DropdownMenu:** Delete the `DropdownMenu`, `MoreHorizontal` trigger, and its imports.
-   **Update BudgetListItem:**
    -   Make the Card `relative group overflow-hidden`.
    -   Add the Action Drawer div (absolute positioned).
    -   **Drawer Content:**
        -   **View Button:** `Eye` icon -> `router.push('/transactions?category=' + budget.categoryId)`.
        -   **Edit Button:** `Edit` icon -> `openEditDialog(budget)`.
-   **Update Delete Logic:**
    -   Pass `handleDeleteBudget` (wrapped) to the `BudgetFormDialog`'s `onDelete` prop.
    -   The existing `AlertDialog` might still be useful if triggered *from* the dialog, or we can just let the `onDelete` prop handle the "confirmation" logic if we move the Alert Dialog logic to be triggered by the form's delete button, OR just do a direct delete if the user is already in the edit form (though a confirmation is safer).
    -   *Decision:* To match Accounts, the "Delete" button in the form usually triggers a confirmation. The `AlertDialog` currently exists on the page. I will keep the `AlertDialog` but trigger it from the `BudgetFormDialog`'s delete action?
    -   *Simpler approach:* The `BudgetFormDialog` has a "Delete" button. Clicking it closes the form and opens the `AlertDialog` (confirmation). This matches the Account flow implemented earlier.

### 3. Styling
-   Use `variant="ghost"` or `variant="reverse"` for drawer buttons to match previous pages.
-   Ensure icons (`Eye`, `Edit`) are consistent.

