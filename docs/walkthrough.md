# NeoBudget Frontend - Complete Documentation

A frontend-only budgeting application built with Next.js 15, TypeScript, shadcn/ui, and Tailwind CSS featuring neobrutalism design.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Features](#features)
5. [Components](#components)
6. [Data Models](#data-models)
7. [Getting Started](#getting-started)
8. [Screenshots](#screenshots)

---

## Overview

NeoBudget is a modern budgeting application that helps users track income, expenses, budgets, and accounts. The application features a bold neobrutalism design with thick borders, hard shadows, and vibrant colors.

## Tech Stack

- **Framework**: Next.js 15.5.6 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + neobrutalism.dev tokens
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Project Structure

```
frontend/
├── app/                      # Next.js App Router pages
│   ├── page.tsx             # Dashboard
│   ├── transactions/        # Transactions page
│   ├── budgets/             # Budgets page
│   ├── categories/          # Categories page
│   ├── accounts/            # Accounts page
│   ├── settings/            # Settings page
│   ├── layout.tsx           # Root layout with sidebar
│   └── globals.css          # Global styles + neobrutalism tokens
├── components/
│   ├── layout/              # Layout components
│   │   ├── Sidebar.tsx      # Navigation sidebar
│   │   └── PageHeader.tsx   # Page header component
│   ├── dashboard/           # Dashboard-specific components
│   │   └── StatCard.tsx     # Statistics card
│   ├── transactions/        # Transaction components
│   │   ├── TransactionTable.tsx
│   │   └── TransactionFormDialog.tsx
│   └── ui/                  # shadcn/ui components
├── data/                    # Dummy JSON data
│   ├── categories.json
│   ├── accounts.json
│   ├── budgets.json
│   └── transactions.json
├── types/
│   └── index.ts             # TypeScript interfaces
└── lib/
    └── utils.ts             # Utility functions
```

---

## Features

### 1. Layout & Navigation

**Sidebar** ([Sidebar.tsx](file:///Users/Lilha/Code/phase-6/dompy_2/frontend/components/layout/Sidebar.tsx))
- Persistent navigation on all pages
- Responsive: Icon-only rail on mobile (64px), full width on desktop (256px)
- Active state highlighting with neobrutalism styling
- Navigation items: Dashboard, Transactions, Budgets, Categories, Accounts, Settings

**PageHeader** ([PageHeader.tsx](file:///Users/Lilha/Code/phase-6/dompy_2/frontend/components/layout/PageHeader.tsx))
- Consistent header component used across all pages
- Supports title, description, and action buttons

### 2. Dashboard

![Dashboard](file:///Users/Lilha/.gemini/antigravity/brain/4f55c073-ec0f-4206-8bb1-f363a6437f0f/dashboard_screenshot_1764044846932.png)

**Features:**
- **Stat Cards**: Display Total Balance, Monthly Income, and Monthly Expense
- **Recent Transactions**: Shows the 5 most recent transactions
- **Chart Placeholder**: Styled area for future chart integration

**Implementation:** [app/page.tsx](file:///Users/Lilha/Code/phase-6/dompy_2/frontend/app/page.tsx)

### 3. Transactions

![Transactions Page](file:///Users/Lilha/.gemini/antigravity/brain/4f55c073-ec0f-4206-8bb1-f363a6437f0f/transactions_page_1764044878188.png)

**Features:**
- **Transaction Table**: Displays all transactions with date, description, category, account, and amount
- **Filtering**: 
  - Search by description
  - Filter by type (Income/Expense)
  - Filter by category
  - Clear filters button
- **Add Transaction**: Dialog form with validation for adding new transactions

**Components:**
- [TransactionTable.tsx](file:///Users/Lilha/Code/phase-6/dompy_2/frontend/components/transactions/TransactionTable.tsx)
- [TransactionFormDialog.tsx](file:///Users/Lilha/Code/phase-6/dompy_2/frontend/components/transactions/TransactionFormDialog.tsx)

### 4. Budgets

![Budgets Page](file:///Users/Lilha/.gemini/antigravity/brain/4f55c073-ec0f-4206-8bb1-f363a6437f0f/budgets_page_1764044911713.png)

**Features:**
- **Budget Cards**: Grid layout showing budgets by category
- **Progress Bars**: Visual representation of spending vs. limit
- **Color Indicators**:
  - Green: < 80% spent (safe)
  - Yellow: 80-99% spent (warning)
  - Red: ≥ 100% spent (over budget)
- **Over Budget Badge**: Animated badge for overspent budgets

**Implementation:** [app/budgets/page.tsx](file:///Users/Lilha/Code/phase-6/dompy_2/frontend/app/budgets/page.tsx)

### 5. Categories

![Categories Page](file:///Users/Lilha/.gemini/antigravity/brain/4f55c073-ec0f-4206-8bb1-f363a6437f0f/categories_page_1764044945450.png)

**Features:**
- **Category Cards**: Display categories with custom colors and icons
- **Type Badges**: Visual distinction between income and expense categories
- **Dynamic Icons**: Uses Lucide React icons specified in data

**Implementation:** [app/categories/page.tsx](file:///Users/Lilha/Code/phase-6/dompy_2/frontend/app/categories/page.tsx)

### 6. Accounts

![Accounts Page](file:///Users/Lilha/.gemini/antigravity/brain/4f55c073-ec0f-4206-8bb1-f363a6437f0f/accounts_page_1764044991861.png)

**Features:**
- **Account Cards**: Display account name, type, and balance
- **Type Icons**: Different icons for cash, bank, e-wallet, and credit card
- **Balance Display**: Formatted currency with proper decimal places

**Implementation:** [app/accounts/page.tsx](file:///Users/Lilha/Code/phase-6/dompy_2/frontend/app/accounts/page.tsx)

### 7. Settings

**Features:**
- Placeholder cards for future settings implementation
- Appearance settings (dark mode toggle)
- Data management (export/reset)

**Implementation:** [app/settings/page.tsx](file:///Users/Lilha/Code/phase-6/dompy_2/frontend/app/settings/page.tsx)

---

## Components

### UI Components (shadcn/ui)

All UI components are styled with neobrutalism design tokens:

- **Button** ([button.tsx](file:///Users/Lilha/Code/phase-6/dompy_2/frontend/components/ui/button.tsx)): Multiple variants with shadow animations
- **Card** ([card.tsx](file:///Users/Lilha/Code/phase-6/dompy_2/frontend/components/ui/card.tsx)): Container with border and shadow
- **Badge** ([badge.tsx](file:///Users/Lilha/Code/phase-6/dompy_2/frontend/components/ui/badge.tsx)): Labels with income/expense variants
- **Progress** ([progress.tsx](file:///Users/Lilha/Code/phase-6/dompy_2/frontend/components/ui/progress.tsx)): Progress bar with neobrutalism styling
- **Table** ([table.tsx](file:///Users/Lilha/Code/phase-6/dompy_2/frontend/components/ui/table.tsx)): Data table with borders
- **Dialog** ([dialog.tsx](file:///Users/Lilha/Code/phase-6/dompy_2/frontend/components/ui/dialog.tsx)): Modal dialogs
- **Input** ([input.tsx](file:///Users/Lilha/Code/phase-6/dompy_2/frontend/components/ui/input.tsx)): Form inputs
- **Select** ([select.tsx](file:///Users/Lilha/Code/phase-6/dompy_2/frontend/components/ui/select.tsx)): Dropdown selects

### Custom Components

- **StatCard**: Reusable card for displaying statistics with icons
- **TransactionTable**: Table component for displaying transactions
- **TransactionFormDialog**: Form dialog for adding transactions
- **Sidebar**: Navigation sidebar with responsive behavior
- **PageHeader**: Consistent page header with title and actions

---

## Data Models

All TypeScript interfaces are defined in [types/index.ts](file:///Users/Lilha/Code/phase-6/dompy_2/frontend/types/index.ts):

```typescript
type TransactionType = 'income' | 'expense';

interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
}

interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'e-wallet' | 'credit card';
  balance: number;
}

interface Budget {
  id: string;
  categoryId: string;
  month: string; // Format: "YYYY-MM"
  limit: number;
  spent: number;
}

interface Transaction {
  id: string;
  date: string; // ISO Date string
  type: TransactionType;
  amount: number;
  categoryId: string;
  accountId: string;
  description: string;
  tags: string[];
}
```

### Dummy Data

Located in `data/` directory:

- **categories.json**: 8 categories (2 income, 6 expense)
- **accounts.json**: 4 accounts (cash, bank, credit card, e-wallet)
- **budgets.json**: 4 budgets for November 2025
- **transactions.json**: 6 sample transactions

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

---

## Design System

### Neobrutalism Tokens

Defined in [app/globals.css](file:///Users/Lilha/Code/phase-6/dompy_2/frontend/app/globals.css):

- **Colors**: `--main`, `--background`, `--foreground`, `--border`
- **Shadows**: `--shadow` (4px 4px 0px 0px)
- **Borders**: 2px solid black
- **Border Radius**: 5px
- **Font Weights**: Base (500), Heading (700)

### Key Design Principles

1. **Bold Borders**: All components use `border-2` with black borders
2. **Hard Shadows**: Box shadows with no blur, offset by 4px
3. **Vibrant Colors**: High contrast, saturated colors
4. **No Gradients**: Flat, solid colors only
5. **Hover Effects**: Shadow animations on interactive elements

---

## Future Enhancements

- [ ] Add chart visualizations (Chart.js or Recharts)
- [ ] Implement dark mode toggle
- [ ] Add CRUD operations for categories and accounts
- [ ] Add budget creation/editing dialogs
- [ ] Implement data persistence (localStorage or backend)
- [ ] Add transaction editing/deletion
- [ ] Add date range picker for filtering
- [ ] Export data to CSV/JSON
- [ ] Add recurring transactions
- [ ] Implement budget alerts/notifications

---

## Verification Checklist

- [x] Dashboard displays correct statistics
- [x] Transactions page shows all transactions
- [x] Filtering works correctly
- [x] Add transaction dialog validates and adds transactions
- [x] Budget progress bars display correctly with color coding
- [x] Categories display with correct icons and colors
- [x] Accounts display with correct balances
- [x] Sidebar navigation works on all pages
- [x] Responsive design works on mobile and desktop
- [x] Neobrutalism styling is consistent across all components
