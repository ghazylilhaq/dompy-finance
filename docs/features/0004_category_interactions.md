# Feature: Category Card Interaction Refinement

## Context
The user wants to update the category list UI in `frontend/app/categories/page.tsx` to include a "drawer" interaction similar to the Accounts page, but tailored for the smaller sub-category items.
Key constraints:
1.  **Subtle Drawer:** Should not aggressively overlap or obscure content (user mentioned "don't overlap").
2.  **Icon Only:** Since the items are small, use only `Eye` and `Edit` icons (no text labels).
3.  **Actions:**
    *   **View:** Redirects to transactions filtered by that category.
    *   **Edit:** Opens the `CategoryFormDialog` (requires updating `CategoryFormDialog` to support editing).

## Proposed Changes

### 1. Component Refactoring (`frontend/app/categories/page.tsx`)

**A. Update `CategoryGroup` and Children Rendering**
-   The sub-category items (`div`) need to become `relative group overflow-hidden` containers.
-   Add an absolute positioned "drawer" div inside each item.
-   **Drawer Positioning:** To satisfy "don't overlap" while being a drawer:
    -   We can position it absolute to the **right side**, sliding in from the right, or simply appearing.
    -   Alternatively, since the user liked the "slide up" (reverse style) in accounts, we can do a slide up from bottom, but give it a semi-transparent background or a solid background that only covers the *right half* or just overlays the whole thing if we accept it covers text on hover (which is standard for small item actions).
    -   *Interpretation of "don't overlap"*: It likely means "don't push the layout around" or "don't make it look messy". An overlay *does* overlap the text, but if it's the only way to interact, it's acceptable on hover. However, a side-slide might be better for "subtle".
    -   **Decision:** Use a **right-aligned slide-in** drawer or a **full overlay**? Given "icon only", we can fit 2 icons in a small space. A generic "slide up" covering the content is consistent with Accounts.
    -   **Revised Decision per user request:** "make it subtle and dont overlap". Overlapping text *is* overlapping. Maybe the user means the drawer sits *next* to the content? But the card is fixed width.
    -   **Best Approach:** Slide up from bottom (consistent with Accounts), but maybe use a backdrop blur that lets text be seen? Or, perhaps, simple **icons appearing on the right** without a full "drawer" background, or a small pill-shaped container.
    -   Let's stick to the "drawer" terminology: An absolute container `bottom-0 right-0 h-full` (slide left) or `bottom-0 w-full` (slide up).
    -   Let's try a **slide-up** that is `h-full` (covers entire item) but uses a backdrop and aligns icons to the center or right.

**B. Actions Implementation**
-   **View:** `router.push('/transactions?category=' + id)`
-   **Edit:** `openEditDialog(category)`

**C. State Management**
-   Need `editingCategory` state in `CategoriesPage`.
-   Need `handleEditCategory` function.
-   Need to pass `initialData` to `CategoryFormDialog`.

### 2. Component Updates (`frontend/components/categories/CategoryFormDialog.tsx`)
-   Update props to accept `initialData?: Category`.
-   Populate form fields from `initialData` in `useEffect`.
-   Handle "Save Changes" vs "Create Category" text.
-   (Optional) Add Delete button if we want parity with Accounts, though user didn't explicitly ask for Delete on Categories yet (Edit and View were requested). *Correction:* User asked "drawer shows edit and view". I will focus on those.

### 3. Styling Details
-   Use `Button` with `variant="ghost"` or `size="icon"` to keep it small/icon-only.
-   Ensure `lucide-react` icons are used.
-   Animation: `transition-transform duration-200 ease-in-out`.

## Execution Plan
1.  Modify `frontend/components/categories/CategoryFormDialog.tsx` to support editing.
2.  Refactor `frontend/app/categories/page.tsx`:
    -   Add state for editing.
    -   Implement `handleEdit`.
    -   Update the sub-category rendering to include the hover drawer with `Eye` and `Edit` icons.
    -   Add `useRouter` for navigation.

