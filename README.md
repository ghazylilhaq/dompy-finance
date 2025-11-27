# NeoBudget - Personal Finance Management

A modern, full-stack personal finance management application built with FastAPI and Next.js.

## Features

- 💰 **Multi-Account Management** - Track cash, bank accounts, e-wallets, and credit cards
- 📊 **Hierarchical Categories** - Organize expenses with 2-level category hierarchy
- 📅 **Monthly Budgets** - Set limits and track spending automatically
- 🔄 **Transaction Management** - Full CRUD with filtering, search, and tags
- 📈 **Dashboard Analytics** - Visual insights into your financial health
- 📥 **CSV Import** - Import transactions from bank exports
- 🔐 **Authentication** - Secure auth via Clerk
- 🎨 **Modern UI** - Beautiful, responsive design with Tailwind CSS

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy 2.0** - ORM with type annotations
- **PostgreSQL** - Production database (SQLite for local dev)
- **Alembic** - Database migrations
- **Clerk** - Authentication

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Recharts** - Data visualization
- **SWR** - Data fetching and caching

## Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (optional - SQLite works for local dev)

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd dompy-finance
```

### 2. Start Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations (creates SQLite database)
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8000
```

Backend will be available at `http://localhost:8000`
- API docs: http://localhost:8000/docs

### 3. Start Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local with your Clerk keys
# Get keys from: https://dashboard.clerk.com
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
EOF

# Start dev server
npm run dev
```

Frontend will be available at `http://localhost:3000`

### 4. Create Your First Account

1. Sign up at http://localhost:3000
2. Complete the onboarding wizard
3. Start managing your finances!

## Project Structure

```
dompy-finance/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── crud/           # Database operations
│   │   ├── routers/        # API endpoints
│   │   └── main.py         # FastAPI app
│   ├── alembic/            # Database migrations
│   ├── requirements.txt
│   └── start.sh            # Production startup script
├── frontend/               # Next.js frontend
│   ├── app/                # App router pages
│   ├── components/         # React components
│   ├── lib/                # Utilities & API client
│   ├── types/              # TypeScript types
│   └── package.json
├── docs/                   # Documentation
│   ├── features/           # Feature implementation docs
│   └── DATABASE_DESIGN.md
├── DEPLOYMENT.md           # Production deployment guide
└── README.md              # This file
```

## Deployment

### Production Deployment to Dokploy

This project is optimized for deployment to Dokploy using nixpacks.

**📖 Full deployment guide:** See [DEPLOYMENT.md](./DEPLOYMENT.md)

### Quick Deployment Overview

1. **Database**: Create PostgreSQL service in Dokploy
2. **Backend**: Deploy from `backend/` path
   - Port: 8000
   - Auto-runs migrations via `start.sh`
3. **Frontend**: Deploy from `frontend/` path
   - Port: 3000
   - Standalone output mode enabled

### Required Environment Variables

**Backend:**
- `DATABASE_URL` - PostgreSQL connection string
- `CORS_ORIGINS` - Frontend URL(s)
- `CLERK_SECRET_KEY` - Clerk secret key
- `CLERK_JWKS_URL` - Clerk JWKS endpoint

**Frontend:**
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key

## Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Complete production deployment instructions
- [Database Design](./docs/DATABASE_DESIGN.md) - Schema and relationships
- [Product Brief](./docs/PRODUCT_BRIEF.md) - Project vision and goals
- [Features](./docs/features/) - Individual feature implementation docs
- [Backend README](./backend/README.md) - Backend-specific documentation
- [Frontend README](./frontend/README.md) - Frontend-specific documentation

## Development Workflow

### Backend Development

```bash
cd backend

# Create migration after model changes
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Run tests
pytest

# Start with hot reload
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend

# Start dev server
npm run dev

# Type checking
npm run build

# Linting
npm run lint
```

## API Documentation

Once the backend is running, interactive API documentation is available at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Key Features in Detail

### Account Management
- Multiple account types (cash, bank, e-wallet, credit card)
- Real-time balance tracking
- Account-specific transaction history
- Color-coded organization

### Category System
- Income and expense categories
- 2-level hierarchy (parent → children)
- Color and icon customization
- System categories for transfers

### Budget Tracking
- Monthly budget limits per category
- Automatic spending calculation
- Visual progress indicators
- Budget vs. actual reporting

### Transaction Import
- CSV/Excel file import
- Configurable import profiles
- Category and account mapping
- Duplicate detection

### Dashboard
- Total balance across accounts
- Monthly income/expense summary
- 6-month activity chart
- Recent transactions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues or questions:
1. Check the [DEPLOYMENT.md](./DEPLOYMENT.md) guide
2. Review API documentation at `/docs`
3. Check backend/frontend logs
4. Open an issue in the repository

## Acknowledgments

- **FastAPI** - For the excellent Python web framework
- **Next.js** - For the powerful React framework
- **Clerk** - For authentication services
- **Radix UI** - For accessible components
- **Dokploy** - For simplified deployment

