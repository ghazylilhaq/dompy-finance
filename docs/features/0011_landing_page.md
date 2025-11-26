# Feature 0011: Landing Page & Route Restructuring

## Context
The application currently uses the root path `/` as the dashboard, protected by authentication. The user wants a public landing page at `/` for logged-out users, featuring a "highly aesthetic neobrutalism" design using existing colors. Logged-in users should be routed to the dashboard (home).

## Technical Requirements

### 1. Route Restructuring
*   **Goal**: Separate public pages from authenticated app pages.
*   **Implementation**:
    *   Create a route group `(authenticated)` for protected application routes.
    *   Move existing pages into this group to preserve their URL paths while sharing a layout:
        *   `app/accounts/` -> `app/(authenticated)/accounts/`
        *   `app/budgets/` -> `app/(authenticated)/budgets/`
        *   `app/categories/` -> `app/(authenticated)/categories/`
        *   `app/settings/` -> `app/(authenticated)/settings/`
        *   `app/transactions/` -> `app/(authenticated)/transactions/`
    *   Move current dashboard from `app/page.tsx` to `app/(authenticated)/dashboard/page.tsx`.
    *   The URL for the dashboard will change from `/` to `/dashboard`.

### 2. Layout Separation
*   **Goal**: Apply the Sidebar and Main content wrapper only to authenticated pages.
*   **Implementation**:
    *   **`app/layout.tsx`**: Simplify to only contain `html`, `body`, `ClerkProvider`, `AuthProvider`, and `children`. Remove `Sidebar` and main content padding/margins.
    *   **`app/(authenticated)/layout.tsx`**: Create this new layout to house the `Sidebar` and the main content area (with padding/margins).

### 3. Landing Page Implementation
*   **Goal**: Create a public landing page at `/`.
*   **Implementation**:
    *   **`app/page.tsx`**: Create new file.
        *   **Logic**: Check authentication status.
            *   If authenticated: Redirect to `/dashboard`.
            *   If unauthenticated: Render Landing Page.
        *   **Design**: "Highly aesthetic neobrutalism".
            *   Use existing CSS variables (colors: `--main`, `--background`, `--foreground`, `--border`, `--shadow`).
            *   Minimal content.
            *   "Get Started" / "Sign In" buttons linking to Clerk auth flows.
    *   **`middleware.ts`**: Update `isPublicRoute` to include `/`.

### 4. Sidebar & Navigation Updates
*   **Goal**: Ensure navigation links point to the correct new paths.
*   **Implementation**:
    *   **`components/layout/Sidebar.tsx`**:
        *   Update "Dashboard" link from `/` to `/dashboard`.
        *   Update `UserButton` `afterSignOutUrl` to `/`.

## Implementation Steps

### Phase 1: Restructuring & Routing
1.  Create `frontend/app/(authenticated)` directory.
2.  Move `accounts`, `budgets`, `categories`, `settings`, `transactions` directories into `frontend/app/(authenticated)/`.
3.  Create `frontend/app/(authenticated)/dashboard` directory.
4.  Move `frontend/app/page.tsx` content to `frontend/app/(authenticated)/dashboard/page.tsx`.
5.  Create `frontend/app/(authenticated)/layout.tsx` with `Sidebar` and main wrapper.
6.  Update `frontend/app/layout.tsx` to remove `Sidebar` and main wrapper.
7.  Update `frontend/components/layout/Sidebar.tsx` links.

### Phase 2: Landing Page & Middleware
1.  Update `frontend/middleware.ts` to allow `/`.
2.  Create `frontend/app/page.tsx` with redirect logic and neobrutalist design.
    *   Design components: Hero section, clear value prop, CTA buttons.
    *   Styling: Bold borders, high contrast, shadows using `shadcn` components or raw Tailwind with project config.

## Affected Files
*   `frontend/app/page.tsx` (Move & Replace)
*   `frontend/app/layout.tsx` (Modify)
*   `frontend/app/dashboard/page.tsx` (New)
*   `frontend/app/(authenticated)/layout.tsx` (New)
*   `frontend/components/layout/Sidebar.tsx` (Modify)
*   `frontend/middleware.ts` (Modify)
*   `frontend/app/accounts/...` (Move)
*   `frontend/app/budgets/...` (Move)
*   `frontend/app/categories/...` (Move)
*   `frontend/app/settings/...` (Move)
*   `frontend/app/transactions/...` (Move)

