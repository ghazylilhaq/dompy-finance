# Feature 0001: Hierarchical Categories & Scalable UI

## Context

The user wants to upgrade the Categories page to support a 2-level hierarchy (Parent -> Child), improve the UI for scalability (handling many categories), and add a dedicated creation flow.

## Technical Requirements

### 1. Data Layer (`frontend/types/index.ts`)

- Update `Category` interface:
  - Add `parentId?: string` (optional).
  - `parentId` references another `Category.id`.

### 2. Component: Add Category Dialog (`frontend/components/categories/CategoryFormDialog.tsx`)

- Create a new component `CategoryFormDialog` using `Dialog` from `ui/dialog.tsx`.
- **Form Fields**:
  - **Name**: Text input.
  - **Type**: Radio/Select for 'income' | 'expense'.
  - **Parent Category**: Select input (Optional).
    - Lists existing categories of the same `type`.
    - Prevents selecting a category that already has a parent (enforcing 2 levels max).
  - **Icon**: Icon Picker.
    - Grid of predefined Lucide icons (e.g., ~20 common icons like Wallet, Home, Food, etc.).
    - User selects one.
  - **Color**: Simple color picker or preset palette (optional but good for UI).

### 3. Page: Category List (`frontend/app/categories/page.tsx`)

- **Data Transformation**:
  - Group categories into `parents` (where `parentId` is undefined) and `children` (where `parentId` exists).
  - Map children to their respective parents.
- **UI Layout**:
  - Switch to a "Scalable" layout.
  - **Group by Type**: Separate sections for "Income" and "Expense".
  - **Cards**:
    - Render Parent Categories as the main Cards.
    - **Child Representation**: Inside the Parent Card, display a list or grid of Child Categories.
      - This creates a cleaner visual hierarchy and saves space.
    - If a category is a "Child" but its parent is missing (orphan), handle gracefully (maybe show as top level).
- **Interactions**:
  - "Add Category" button opens the `CategoryFormDialog`.

### 4. Predefined Icons (`frontend/lib/constants.ts` or similar)

- Define a constant array of allowed icon names (strings) compatible with `lucide-react`.

## Implementation Steps

1.  **Data**: Update `Category` type.
2.  **Utils**: Create icon constants.
3.  **Component**: Build `CategoryFormDialog` with form state and validation.
4.  **Page**: Refactor `CategoriesPage` to:
    - Parse parent/child relationships.
    - Render the new grouped layout.
    - Integrate the `CategoryFormDialog`.
