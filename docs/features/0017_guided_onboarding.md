# Feature 0017: Guided Onboarding

## Context

Implement a guided onboarding flow for new users to set up their initial financial data. The flow activates after the first login and guides the user through an introduction, account creation (with recommendations), and category creation (with recommendations). It also ensures system transfer categories are created upfront, removing the need for lazy initialization later.

## Data Layer

### Schema Changes

1.  **New Table: `user_settings`**
    - Stores per-user configuration and onboarding status.
    - `user_id` (String, PK) - Matches Clerk user ID.
    - `has_completed_onboarding` (Boolean) - Default `FALSE`.
    - `created_at` (DateTime).
    - `updated_at` (DateTime).

### Migrations

- Create `user_settings` table.

## Backend Changes

### New Files

- `backend/app/models/user_settings.py`: SQLAlchemy model.
- `backend/app/schemas/onboarding.py`: Pydantic schemas for the onboarding payload (list of accounts, list of categories).
- `backend/app/routers/onboarding.py`: API endpoints.
- `backend/app/crud/onboarding.py`: Service logic to process the bulk creation.

### API Routes

- `GET /api/onboarding/status`: Returns `{ has_completed_onboarding: bool }`.
- `POST /api/onboarding/complete`:
  - Input: `{ accounts: [AccountCreate], categories: [CategoryCreate] }`.
  - Logic:
    1.  Create all provided accounts.
    2.  Create all provided categories.
    3.  **Call `ensure_transfer_categories`** (from `crud.category`) to create system transfer categories.
    4.  Upsert `UserSettings` setting `has_completed_onboarding = True`.

### Modified Files

- `backend/app/crud/category.py`: Export `ensure_transfer_categories` if not already accessible/reusable (it is).
- `backend/app/main.py`: Register the new router.

## Frontend Changes

### Directory Structure

- `frontend/app/(onboarding)/layout.tsx`: Clean layout without the main sidebar.
- `frontend/app/(onboarding)/onboarding/page.tsx`: Main onboarding container/wizard.

### Components

- `frontend/components/onboarding/OnboardingWizard.tsx`: State machine for steps.
- `frontend/components/onboarding/IntroStep.tsx`: Welcome message.
- `frontend/components/onboarding/AccountsStep.tsx`: Form to add accounts. Includes "Recommended" buttons (e.g., "Checking", "Savings", "Cash") that pre-fill or add rows.
- `frontend/components/onboarding/CategoriesStep.tsx`: Form to add categories. Includes "Recommended" toggles/checks (e.g., "Food", "Housing", "Transport").
- `frontend/components/onboarding/CompletionStep.tsx`: Loading/Success state.

### Routing & Auth

- **Middleware / Layout Check**:
  - In `frontend/app/(authenticated)/layout.tsx` (or a new wrapper), fetch onboarding status.
  - If `!has_completed_onboarding`, redirect to `/onboarding`.
  - In `frontend/app/(onboarding)/onboarding/page.tsx`, if `has_completed_onboarding`, redirect to `/dashboard`.

## Logic Flow

1.  **User Log In**:

    - App loads `(authenticated)/layout.tsx`.
    - Layout calls `GET /api/onboarding/status`.
    - If `false`, router.push('/onboarding').

2.  **Onboarding Wizard**:

    - **Step 1: Intro**: "Welcome to NeoBudget". Click "Get Started".
    - **Step 2: Accounts**:
      - User sees empty list.
      - Clicking "Add Bank Account" (recommendation) adds a row with type='bank', name='Bank'. User can edit.
      - User adds at least one account (validation).
    - **Step 3: Categories**:
      - User sees list of recommended categories (checked by default or clickable).
      - User selects/adds desired categories.
    - **Step 4: Finish**:
      - Click "Finish Setup".
      - Frontend sends POST to `/api/onboarding/complete`.

3.  **Processing (Backend)**:

    - Transaction start.
    - Bulk insert Accounts.
    - Bulk insert Categories.
    - Create "Incoming transfer" and "Outgoing transfer" categories (System).
    - Set `user_settings.has_completed_onboarding = true`.
    - Commit.

4.  **Completion**:
    - Frontend receives success.
    - Redirects to `/dashboard`.
