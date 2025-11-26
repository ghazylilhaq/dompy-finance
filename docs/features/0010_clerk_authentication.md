# Feature 0010: Clerk Authentication Integration

## Overview

Integrate Clerk as the authentication provider for NeoBudget, enabling user sign-up/sign-in on the frontend and securing all API endpoints with user-scoped data access. Each user will only see and manage their own accounts, categories, budgets, and transactions.

---

## Phase 1: Database Schema Changes

### Add `user_id` Column to All Tables

Add a `user_id` column (Clerk user ID string, e.g., `user_2abc123...`) to:
- `accounts`
- `categories`
- `budgets`
- `tags`
- `transactions`

#### Files to Modify

**New Migration File**: `backend/alembic/versions/20241126_000000_002_add_user_id.py`
- Add `user_id` column (`String(255)`, nullable initially for migration, then `NOT NULL`)
- Add index on `user_id` for each table
- No foreign key constraint (Clerk manages users externally)

**Models to Update**:
- `backend/app/models/account.py` - Add `user_id: Mapped[str]` field
- `backend/app/models/category.py` - Add `user_id: Mapped[str]` field
- `backend/app/models/budget.py` - Add `user_id: Mapped[str]` field
- `backend/app/models/tag.py` - Add `user_id: Mapped[str]` field
- `backend/app/models/transaction.py` - Add `user_id: Mapped[str]` field

---

## Phase 2A: Backend Authentication

### Install Dependencies

Add to `backend/requirements.txt`:
```
pyjwt[crypto]>=2.8.0
httpx>=0.25.0
```

### Add Clerk Configuration

**File**: `backend/app/config.py`
- Add `CLERK_SECRET_KEY` environment variable
- Add `CLERK_ISSUER` (e.g., `https://clerk.your-domain.com`) or use Clerk's default

### Create Auth Dependency

**New File**: `backend/app/auth.py`

Create a FastAPI dependency that:
1. Extracts the `Authorization: Bearer <token>` header
2. Verifies the Clerk JWT using Clerk's JWKS (JSON Web Key Set)
3. Extracts and returns the `user_id` (the `sub` claim from the JWT)
4. Raises `401 Unauthorized` if token is missing/invalid

```python
# Pseudocode structure:
async def get_current_user(authorization: str = Header(...)) -> str:
    # 1. Parse "Bearer <token>"
    # 2. Fetch/cache Clerk JWKS from https://<clerk-domain>/.well-known/jwks.json
    # 3. Verify JWT signature and claims (exp, iss, aud)
    # 4. Return the user_id (sub claim)
```

### Update All CRUD Operations

Filter all queries by `user_id` and include `user_id` when creating records.

**Files to Update**:

- `backend/app/crud/account.py`
  - `get_accounts(db, user_id)` → filter by `user_id`
  - `get_account(db, account_id, user_id)` → filter by both
  - `create_account(db, data, user_id)` → set `user_id`
  - `update_account(db, account_id, data, user_id)` → verify ownership
  - `delete_account(db, account_id, user_id)` → verify ownership

- `backend/app/crud/category.py` - Same pattern
- `backend/app/crud/budget.py` - Same pattern
- `backend/app/crud/tag.py` - Same pattern
- `backend/app/crud/transaction.py` - Same pattern

### Update All Routers

Inject `user_id` from auth dependency into all endpoints.

**Files to Update**:

- `backend/app/routers/accounts.py`
  - Add `user_id: str = Depends(get_current_user)` to all route handlers
  - Pass `user_id` to all CRUD calls

- `backend/app/routers/categories.py` - Same pattern
- `backend/app/routers/budgets.py` - Same pattern
- `backend/app/routers/tags.py` - Same pattern
- `backend/app/routers/transactions.py` - Same pattern
- `backend/app/routers/dashboard.py` - Same pattern (stats scoped to user)

### Update Schemas (Optional)

**Files**: `backend/app/schemas/*.py`
- Consider adding `user_id` to response schemas if needed for debugging
- Keep `user_id` OUT of create/update schemas (derived from auth)

---

## Phase 2B: Frontend Authentication

### Install Clerk SDK

```bash
npm install @clerk/nextjs
```

### Add Environment Variables

**File**: `frontend/.env.local` (create if not exists)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### Create Middleware

**New File**: `frontend/middleware.ts`

Configure Clerk middleware to:
- Protect all routes except `/sign-in` and `/sign-up`
- Skip Next.js internals and static files

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

### Update Root Layout

**File**: `frontend/app/layout.tsx`

- Wrap the entire app with `<ClerkProvider>`
- Remove hardcoded user placeholder from Sidebar (will use Clerk's `<UserButton>`)

```tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <Sidebar />
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

### Create Auth Pages

**New File**: `frontend/app/sign-in/[[...sign-in]]/page.tsx`
```tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return <SignIn />;
}
```

**New File**: `frontend/app/sign-up/[[...sign-up]]/page.tsx`
```tsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return <SignUp />;
}
```

### Update Sidebar with User Profile

**File**: `frontend/components/layout/Sidebar.tsx`

Replace the hardcoded user placeholder with Clerk's `<UserButton>`:

```tsx
import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

// In the footer section:
<SignedIn>
  <UserButton afterSignOutUrl="/sign-in" />
</SignedIn>
<SignedOut>
  <SignInButton />
</SignedOut>
```

### Update API Client to Include Auth Token

**File**: `frontend/lib/api.ts`

Modify `apiRequest` to include the Clerk session token:

```typescript
import { auth } from '@clerk/nextjs/server';
// OR for client components:
import { useAuth } from '@clerk/nextjs';

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken(); // Get Clerk session token
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  return handleResponse<T>(response);
}
```

**Alternative Approach**: Create a custom hook or wrapper that injects the token:

**New File**: `frontend/lib/auth-api.ts`
- Export authenticated versions of all API functions
- Use `useAuth()` hook from Clerk to get the token

---

## Phase 3: Testing & Verification

### Backend Testing
1. Start FastAPI server
2. Attempt unauthenticated request → expect 401
3. Get valid Clerk token (from frontend or Clerk dashboard)
4. Make authenticated request → expect success
5. Verify data isolation between users

### Frontend Testing
1. Visit app without auth → redirected to `/sign-in`
2. Sign up new user → redirected to dashboard
3. Create data (accounts, transactions, etc.)
4. Sign out and sign in as different user → see empty state
5. Verify original user's data is isolated

---

## File Summary

### New Files
- `backend/alembic/versions/20241126_000000_002_add_user_id.py`
- `backend/app/auth.py`
- `frontend/middleware.ts`
- `frontend/.env.local`
- `frontend/app/sign-in/[[...sign-in]]/page.tsx`
- `frontend/app/sign-up/[[...sign-up]]/page.tsx`
- `frontend/lib/auth-api.ts` (optional, alternative approach)

### Modified Files
- `backend/requirements.txt`
- `backend/app/config.py`
- `backend/app/models/account.py`
- `backend/app/models/category.py`
- `backend/app/models/budget.py`
- `backend/app/models/tag.py`
- `backend/app/models/transaction.py`
- `backend/app/crud/account.py`
- `backend/app/crud/category.py`
- `backend/app/crud/budget.py`
- `backend/app/crud/tag.py`
- `backend/app/crud/transaction.py`
- `backend/app/routers/accounts.py`
- `backend/app/routers/categories.py`
- `backend/app/routers/budgets.py`
- `backend/app/routers/tags.py`
- `backend/app/routers/transactions.py`
- `backend/app/routers/dashboard.py`
- `frontend/app/layout.tsx`
- `frontend/components/layout/Sidebar.tsx`
- `frontend/lib/api.ts`








