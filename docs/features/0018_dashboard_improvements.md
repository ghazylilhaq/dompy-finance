# Feature 0018: Dashboard Improvements

## Context
The user wants to improve the dashboard by adding a visual chart to replace the current placeholder and fixing a layout issue in the "Recent Transactions" section where the view and edit actions overlap content. The goal is to implement a functional "Monthly Activity" chart and improve the usability of the transaction list on the dashboard.

## Data Layer

### Schema Changes
1.  **`backend/app/schemas/dashboard.py`**
    *   Add `MonthlyActivity` model:
        *   `month`: str (e.g., "Jan 2024")
        *   `income`: Decimal
        *   `expense`: Decimal
    *   Update `DashboardStats` (or create new response model) to include `chart_data`: List[MonthlyActivity].

## Backend Changes

### API Routes
1.  **`backend/app/routers/dashboard.py`**
    *   Update `get_stats` (or create `get_activity`) to fetch historical data.
    *   **Logic**:
        *   Calculate start date (e.g., 6 months ago).
        *   Query `Transaction` table grouping by year/month and type.
        *   Sum amounts for income and expense.
        *   Format the result into `MonthlyActivity` list.
        *   Ensure empty months are filled with zeros if necessary (optional but good for charts).

## Frontend Changes

### Components
1.  **`frontend/components/dashboard/ActivityChart.tsx`** (New)
    *   Implementation of the chart using `frontend/components/ui/chart.tsx` (Recharts wrapper).
    *   Type: Bar Chart (grouped bars for Income vs Expense).
    *   Props: `data: MonthlyActivity[]`.
    *   Use `ChartContainer` and `ChartTooltip`.

2.  **`frontend/components/transactions/TransactionTable.tsx`**
    *   Add `compact?: boolean` prop.
    *   **Layout Fix**:
        *   When `compact` is true (or globally if better):
        *   Remove the `absolute` positioning from the Actions cell.
        *   Give the Actions cell a fixed width.
        *   Ensure buttons do not overlap content.
        *   Optionally hide the "Account" column in `compact` mode to save horizontal space for the dashboard widget.

### Pages
1.  **`frontend/app/(authenticated)/dashboard/page.tsx`**
    *   Fetch the new `chart_data`.
    *   Replace the placeholder `div` with `<ActivityChart data={stats.chart_data} />`.
    *   Pass `compact={true}` to `<TransactionTable />` in the "Recent Transactions" section.

### API Client
1.  **`frontend/lib/auth-api.ts`**
    *   Update `DashboardStats` interface to match the backend response.

## Logic Flow

### Chart Data Fetching
1.  **Backend**: Calculate `start_date = now - 6 months`.
2.  **Backend**: Query DB: `SELECT year, month, type, SUM(amount) FROM transactions WHERE date >= start_date GROUP BY year, month, type`.
3.  **Backend**: Process results into a dictionary keyed by `(year, month)`.
4.  **Backend**: Iterate from `start_date` to `now` month by month to build the final list (filling 0s for missing data).
5.  **Frontend**: Receive data and render `ActivityChart`.

### Recent Transactions Layout
1.  **Frontend**: `Dashboard` renders `TransactionTable` with `compact` prop.
2.  **Frontend**: `TransactionTable` checks `compact`.
3.  **Frontend**: If `compact`, `Actions` column renders as a standard table cell (no hover overlay), possibly with just one "View" button or a smaller "More" menu to prevent layout issues. OR simply ensure the container is wide enough and not using `absolute`.

