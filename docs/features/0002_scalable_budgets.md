# Feature 0002: Scalable Budgets & Creation Flow

## Context
The user wants to overhaul the Budgets page to handle a large number of budgets gracefully. Each category can have at most one budget. The view should be list-based or sectioned, showing key info and being scrollable. A new creation form is needed, strictly for monthly budgets for now, using IDR currency.

## Technical Requirements

### 1. Data Layer (`frontend/types/index.ts`)
- Existing `Budget` interface is mostly sufficient, but we need to ensure it aligns with "1 category = 1 budget" logic.
- No schema changes strictly required, but logic must enforce the constraint.

### 2. Component: Add Budget Dialog (`frontend/components/budgets/BudgetFormDialog.tsx`)
- Create a new component `BudgetFormDialog`.
- **Inputs**:
  - **Category**: Select input.
    - Filter out categories that *already* have a budget for the selected month.
    - Group options by Income/Expense or just Expense (usually budgets are for expenses, but income targets exist too. We will allow all, but focus on Expense).
  - **Amount**: Number input (Currency format: IDR).
  - **Month**: Month picker (or default to current month "YYYY-MM"). 
    - User requirement: "monthly/weekly/yearly" -> "for now only monthly".
    - Hidden field or fixed select for "Period: Monthly".

### 3. Page: Budget List (`frontend/app/budgets/page.tsx`)
- **Layout**:
  - Switch from Grid Cards to a **List/Section Layout** for scalability.
  - **Sections**:
    - "Active Budgets" (Current Month)
    - "History" (Optional, or just filter by month at top. For now, let's default to showing "Current Month" budgets, maybe grouped by Parent Category if possible, or just a flat list sorted by % spent).
- **List Item Design**:
  - **Left**: Category Icon + Name.
  - **Middle**: Progress Bar + textual stats (Spent / Limit).
  - **Right**: Status Badge (Safe/Warning/Over) + Action (Edit/Delete - placeholder).
  - **Currency**: Force IDR formatting (`Rp`).

### 4. Data Updates (`frontend/data/budgets.json`)
- Update dummy data to use higher values (IDR scale) and reference valid category IDs from the previous feature (`cat_1` to `cat_20`).

## Implementation Steps
1.  **Utils**: Ensure `formatCurrency.ts` handles IDR correctly (already exists, just verify).
2.  **Component**: Create `BudgetFormDialog`.
3.  **Page**: Refactor `BudgetsPage`.
    - Load categories to show names/icons.
    - Implement the scalable list view.
    - Add "Create Budget" logic connecting to the Dialog.
4.  **Data**: Update `budgets.json` with IDR values and correct Category IDs.

