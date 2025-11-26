# NeoBudget - Component Documentation

This document provides detailed information about each component in the NeoBudget application.

---

## Layout Components

### Sidebar

**Location:** `components/layout/Sidebar.tsx`

**Purpose:** Provides persistent navigation across all pages of the application.

**Features:**
- Responsive design: 64px icon-only rail on mobile, 256px full sidebar on desktop
- Active route highlighting with neobrutalism styling
- Hover effects with shadow animations
- User profile section at the bottom

**Navigation Items:**
1. Dashboard (`/`)
2. Transactions (`/transactions`)
3. Budgets (`/budgets`)
4. Categories (`/categories`)
5. Accounts (`/accounts`)
6. Settings (`/settings`)

**Styling:**
- Uses `usePathname()` hook to detect active route
- Active state: `bg-main`, `border-border`, `shadow-shadow`
- Hover state: Same as active with transition animations

---

### PageHeader

**Location:** `components/layout/PageHeader.tsx`

**Purpose:** Provides a consistent header component for all pages.

**Props:**
```typescript
interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}
```

**Usage:**
```tsx
<PageHeader 
  title="Dashboard" 
  description="Overview of your financial health"
>
  <Button>Add Transaction</Button>
</PageHeader>
```

---

## Dashboard Components

### StatCard

**Location:** `components/dashboard/StatCard.tsx`

**Purpose:** Display key statistics with icons.

**Props:**
```typescript
interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  className?: string;
  iconColor?: string;
}
```

**Usage:**
```tsx
<StatCard 
  title="Total Balance" 
  value="$4,700.50" 
  icon={Wallet} 
  description="Across all accounts"
  iconColor="bg-blue-300"
/>
```

**Features:**
- Customizable icon with color background
- Supports large value display
- Optional description text
- Full neobrutalism styling

---

## Transaction Components

### TransactionTable

**Location:** `components/transactions/TransactionTable.tsx`

**Purpose:** Display transactions in a table format.

**Props:**
```typescript
interface TransactionTableProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
}
```

**Features:**
- Displays: Date, Description, Category, Account, Amount
- Color-coded amounts (green for income, red for expense)
- Category badges with custom colors
- Formatted dates using `date-fns`
- Hover effects on rows

**Columns:**
1. **Date**: Formatted as "MMM d, yyyy"
2. **Description**: Transaction description
3. **Category**: Badge with category color
4. **Account**: Account name
5. **Amount**: Formatted with +/- prefix and color

---

### TransactionFormDialog

**Location:** `components/transactions/TransactionFormDialog.tsx`

**Purpose:** Dialog form for adding new transactions.

**Features:**
- Form validation
- Dynamic category filtering based on transaction type
- Date picker
- All fields required except tags
- Resets form after submission

**Form Fields:**
1. **Description** (text input)
2. **Amount** (number input, step 0.01)
3. **Type** (select: income/expense)
4. **Category** (select, filtered by type)
5. **Account** (select)
6. **Date** (date input)

**State Management:**
- Local state for form data
- Callback prop `onAddTransaction` to handle submission
- Dialog open/close state

---

## UI Components

### Button

**Location:** `components/ui/button.tsx`

**Variants:**
- `default`: Main color with shadow animation
- `noShadow`: Main color without shadow
- `neutral`: Secondary background
- `reverse`: Reverse shadow animation

**Sizes:**
- `default`: h-10, px-4, py-2
- `sm`: h-9, px-3
- `lg`: h-11, px-8
- `icon`: size-10 (square)

**Usage:**
```tsx
<Button variant="default" size="lg">
  <Plus className="mr-2 h-4 w-4" /> Add Transaction
</Button>
```

---

### Badge

**Location:** `components/ui/badge.tsx`

**Variants:**
- `default`: Main color
- `secondary`: Secondary background
- `destructive`: Red background
- `outline`: Transparent with border
- `income`: Green background
- `expense`: Red background

**Usage:**
```tsx
<Badge variant="income">Income</Badge>
<Badge variant="expense">Expense</Badge>
```

---

### Progress

**Location:** `components/ui/progress.tsx`

**Purpose:** Display progress bars with neobrutalism styling.

**Features:**
- Border and shadow styling
- Smooth transition animations
- Percentage-based value (0-100)

**Usage:**
```tsx
<Progress value={75} className="h-4" />
```

---

### Card

**Location:** `components/ui/card.tsx`

**Components:**
- `Card`: Container
- `CardHeader`: Header section
- `CardTitle`: Title text
- `CardDescription`: Description text
- `CardContent`: Main content area
- `CardFooter`: Footer section
- `CardAction`: Action buttons area

**Usage:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

---

## Data Flow

### Dashboard Page

1. Import dummy data from JSON files
2. Calculate statistics (total balance, income, expense)
3. Filter transactions for current month
4. Sort and slice for recent transactions
5. Pass data to components

### Transactions Page

1. Load transactions from JSON
2. Maintain local state for transactions list
3. Apply filters (search, type, category)
4. Handle new transaction additions
5. Update filtered list reactively

### Budgets Page

1. Load budgets and categories from JSON
2. Calculate percentage for each budget
3. Determine color based on percentage
4. Display with progress bars

---

## Styling Guidelines

### Neobrutalism Principles

1. **Always use `border-2 border-border`** for all containers
2. **Apply `shadow-shadow`** to cards and elevated elements
3. **Use `rounded-base`** for border radius (5px)
4. **Hover animations:** Translate element to remove shadow
5. **Colors:** Use CSS variables from `globals.css`

### Responsive Design

- **Mobile:** Icon-only sidebar (w-16), stacked layouts
- **Tablet:** md: breakpoint for 2-column grids
- **Desktop:** lg: breakpoint for 3+ column grids

### Color Usage

- **Main:** Primary action color (purple)
- **Background:** Page background (light blue)
- **Secondary Background:** Card background (white)
- **Foreground:** Text color (black)
- **Border:** Border color (black)

---

## Best Practices

1. **Always import types** from `@/types`
2. **Use `cn()` utility** for conditional classes
3. **Follow shadcn/ui patterns** for component structure
4. **Keep components small** and focused
5. **Use TypeScript** for all props and state
6. **Format dates** with `date-fns`
7. **Validate forms** before submission
8. **Handle edge cases** (empty states, loading states)

---

## Testing Checklist

### Component Testing

- [ ] StatCard displays correct values
- [ ] TransactionTable renders all transactions
- [ ] TransactionFormDialog validates inputs
- [ ] Sidebar highlights active route
- [ ] PageHeader displays title and actions
- [ ] Badge variants render correctly
- [ ] Progress bar shows correct percentage
- [ ] Card components structure correctly

### Integration Testing

- [ ] Navigation between pages works
- [ ] Filters update transaction list
- [ ] Add transaction updates the list
- [ ] Budget calculations are correct
- [ ] Category icons render dynamically
- [ ] Account balances display correctly

### Responsive Testing

- [ ] Sidebar collapses on mobile
- [ ] Grids stack on mobile
- [ ] Tables scroll horizontally on mobile
- [ ] Dialogs are mobile-friendly
- [ ] Touch targets are large enough

---

## Common Issues & Solutions

### Issue: Icons not rendering
**Solution:** Ensure icon name in JSON matches Lucide React export

### Issue: Dates showing as "Invalid Date"
**Solution:** Verify ISO date format in JSON (YYYY-MM-DDTHH:mm:ssZ)

### Issue: Filters not working
**Solution:** Check that filter state is properly connected to filtered array

### Issue: Styles not applying
**Solution:** Verify Tailwind classes are not being purged, check `globals.css` imports

### Issue: Dialog not closing after submit
**Solution:** Ensure `setOpen(false)` is called after form submission

---

## Future Component Additions

1. **DateRangePicker**: For filtering transactions by date range
2. **CategoryFormDialog**: For adding/editing categories
3. **AccountFormDialog**: For adding/editing accounts
4. **BudgetFormDialog**: For creating/editing budgets
5. **ConfirmDialog**: For delete confirmations
6. **Toast**: For success/error notifications
7. **EmptyState**: For empty lists
8. **LoadingSpinner**: For loading states
9. **ErrorBoundary**: For error handling
10. **ChartComponents**: For data visualization
