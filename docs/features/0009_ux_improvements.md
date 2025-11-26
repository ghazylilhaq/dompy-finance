# Feature 0009: UX Improvements (Empty States, Caching, Budget Form)

## Context

The user wants to improve the overall user experience by addressing three specific areas:

1.  **Empty States:** Clear messaging when no data is available (transactions, budgets, etc.).
2.  **Caching / Optimistic UI:** Prevent full-page loading skeletons when navigating between pages by caching data.
3.  **Budget Form:** Simplify the budget creation form by removing the specific month date picker and replacing it with a frequency selection (defaulting to Monthly, with Weekly disabled for now).

## Technical Plan

### Phase 1: Client-Side Caching with SWR

To address the issue of skeletons showing on every navigation, we will move from `useEffect` fetch calls to `swr` (Stale-While-Revalidate). This will allow instant rendering of cached data while fetching updates in the background.

1.  **Dependencies**

    - Install `swr`: `npm install swr`

2.  **Create Hooks (`frontend/lib/hooks.ts`)**

    - Create a new file to centralize data fetching hooks.
    - Implement `useAccounts`, `useCategories`, `useBudgets`, `useTransactions`.
    - Each hook will use `useSWR` with the corresponding fetcher function from `api.ts`.
    - Example:
      ```typescript
      export function useAccounts() {
        const { data, error, isLoading, mutate } = useSWR(
          "/accounts",
          getAccounts
        );
        return { accounts: data || [], isLoading, error, mutate };
      }
      ```

3.  **Refactor Pages**
    - **`frontend/app/accounts/page.tsx`**: Replace `useEffect` with `useAccounts`.
    - **`frontend/app/categories/page.tsx`**: Replace `useEffect` with `useCategories`.
    - **`frontend/app/budgets/page.tsx`**: Replace `useEffect` with `useBudgets` and `useCategories`.
    - **`frontend/app/transactions/page.tsx`**: Replace `useEffect` with `useTransactions` (note: `useTransactions` might need to accept filter arguments as the SWR key).

### Phase 2: Empty States

Implement explicit "No Data" states to guide the user when lists are empty.

1.  **Accounts (`frontend/app/accounts/page.tsx`)**

    - Check if `accounts.length === 0` (and not loading).
    - Render a "No accounts found" card with a call-to-action to "Add Account".

2.  **Categories (`frontend/app/categories/page.tsx`)**

    - Check if both `incomeHierarchy` and `expenseHierarchy` are empty.
    - Render a "No categories found" block with a call-to-action.

3.  **Transactions (`frontend/components/transactions/TransactionTable.tsx` or `page.tsx`)**

    - Inside `TransactionTable`, if `transactions` array is empty:
      - Render a table row spanning all columns with a message: "No transactions found." or "No transactions match your filters."

4.  **Budgets (`frontend/app/budgets/page.tsx`)**
    - Review existing empty state (lines 310-318).
    - Ensure it is consistent with the new designs for other pages.

### Phase 3: Budget Form Updates

Simplify the `BudgetFormDialog` to match user expectations.

1.  **File: `frontend/components/budgets/BudgetFormDialog.tsx`**
    - **Remove Date Picker:** Delete the `Input type="month"`.
    - **Add Frequency Selector:**
      - Add a Label "Frequency".
      - Add a visual selector (e.g., Radio Group or two Buttons acting as tabs).
      - Options: "Monthly" (Active/Default), "Weekly" (Disabled).
      - Show a tooltip or disabled state style for "Weekly" indicating it is "Coming Soon".
    - **Form Submission Logic:**
      - Since the backend expects a `month` (YYYY-MM) string, we must still provide one.
      - On submit, automatically set `month` to the current month (e.g., `new Date().toISOString().slice(0, 7)`).
      - _Note:_ This means creating a budget always targets the current month.

### Summary of Files

- `frontend/package.json` (add swr)
- `frontend/lib/hooks.ts` (new)
- `frontend/app/accounts/page.tsx`
- `frontend/app/categories/page.tsx`
- `frontend/app/budgets/page.tsx`
- `frontend/app/transactions/page.tsx`
- `frontend/components/transactions/TransactionTable.tsx`
- `frontend/components/budgets/BudgetFormDialog.tsx`
