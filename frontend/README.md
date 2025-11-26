# NeoBudget - README

A modern, frontend-only budgeting application built with Next.js 15, TypeScript, and neobrutalism design.

![NeoBudget Dashboard](/.gemini/antigravity/brain/4f55c073-ec0f-4206-8bb1-f363a6437f0f/dashboard_screenshot_1764044846932.png)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## ✨ Features

- 📊 **Dashboard** - Overview of financial health with stat cards
- 💸 **Transactions** - Track income and expenses with filtering
- 🎯 **Budgets** - Set spending limits with visual progress tracking
- 🏷️ **Categories** - Organize transactions by custom categories
- 💳 **Accounts** - Manage multiple accounts (cash, bank, e-wallet, credit card)
- ⚙️ **Settings** - Configure app preferences

## 🎨 Design

Built with **neobrutalism** design principles:
- Bold 2px borders
- Hard shadows (no blur)
- Vibrant, high-contrast colors
- Flat, solid colors (no gradients)
- Hover animations with shadow effects

## 🛠️ Tech Stack

- **Framework:** Next.js 15.5.6 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 + neobrutalism.dev
- **UI Components:** shadcn/ui (Radix UI)
- **Icons:** Lucide React
- **Date Handling:** date-fns

## 📁 Project Structure

```
frontend/
├── app/                    # Next.js pages
│   ├── page.tsx           # Dashboard
│   ├── transactions/      # Transactions page
│   ├── budgets/           # Budgets page
│   ├── categories/        # Categories page
│   ├── accounts/          # Accounts page
│   └── settings/          # Settings page
├── components/
│   ├── layout/            # Sidebar, PageHeader
│   ├── dashboard/         # StatCard
│   ├── transactions/      # TransactionTable, TransactionFormDialog
│   └── ui/                # shadcn/ui components
├── data/                  # Dummy JSON data
├── types/                 # TypeScript interfaces
└── lib/                   # Utilities
```

## 📚 Documentation

- **[walkthrough.md](./walkthrough.md)** - Complete feature walkthrough with screenshots
- **[COMPONENTS.md](./COMPONENTS.md)** - Detailed component documentation

## 🎯 Key Components

### Sidebar
Responsive navigation with icon-only rail on mobile (64px) and full sidebar on desktop (256px).

### StatCard
Reusable card component for displaying statistics with icons and descriptions.

### TransactionTable
Table component with filtering by search, type, and category.

### TransactionFormDialog
Form dialog for adding new transactions with validation.

## 📊 Data Models

All data is stored in JSON files (`data/`) with TypeScript interfaces (`types/index.ts`):

- **Transaction** - Income/expense records
- **Category** - Transaction categories with colors and icons
- **Account** - Financial accounts (cash, bank, e-wallet, credit card)
- **Budget** - Monthly spending limits by category

## 🎨 Customization

### Colors

Edit `app/globals.css` to customize the color scheme:

```css
:root {
  --main: oklch(67.47% 0.1726 259.49);        /* Primary color */
  --background: oklch(93.46% 0.0305 255.11);  /* Page background */
  --foreground: oklch(0% 0 0);                /* Text color */
  --border: oklch(0% 0 0);                    /* Border color */
}
```

### Components

All UI components are in `components/ui/` and can be customized using Tailwind classes.

## 🧪 Testing

### Manual Testing Checklist

- [ ] Navigate through all pages via sidebar
- [ ] Add a new transaction
- [ ] Filter transactions by type and category
- [ ] Check responsive design on mobile/tablet/desktop
- [ ] Verify budget progress bars show correct percentages
- [ ] Confirm category icons render correctly
- [ ] Validate account balances display properly

## 🚧 Future Enhancements

- [ ] Chart visualizations (Chart.js/Recharts)
- [ ] Dark mode toggle
- [ ] CRUD operations for categories and accounts
- [ ] Budget creation/editing dialogs
- [ ] Data persistence (localStorage/backend)
- [ ] Transaction editing/deletion
- [ ] Date range picker
- [ ] CSV/JSON export
- [ ] Recurring transactions
- [ ] Budget alerts/notifications

## 📝 Scripts

```bash
npm run dev      # Start development server (Turbopack)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🤝 Contributing

This is a demo/learning project. Feel free to fork and customize for your needs!

## 📄 License

MIT

---

**Built with ❤️ using Next.js and neobrutalism design**
