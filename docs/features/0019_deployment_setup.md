# Feature 0019: Deployment Setup for Dokploy

## Context

Deploy the NeoBudget application to Dokploy using nixpacks with three services:

1. PostgreSQL database (managed by Dokploy)
2. Backend FastAPI service (build path: `backend/`)
3. Frontend Next.js service (build path: `frontend/`)

The deployment should follow best practices with proper environment variable configuration, health checks, and production-ready settings. The setup should be straightforward and use nixpacks auto-detection where possible.

## Files to Create/Modify

### Root Level Files

- `README.md` - Add deployment instructions
- `DEPLOYMENT.md` - Comprehensive deployment guide

### Backend Files

- `backend/requirements.txt` - Uncomment PostgreSQL driver
- `backend/nixpacks.toml` - Configure nixpacks for FastAPI (optional, for customization)
- `backend/.env.example` - Document required environment variables
- `backend/start.sh` - Production startup script

### Frontend Files

- `frontend/.env.example` - Document required environment variables
- `frontend/next.config.ts` - Update for production output
- `frontend/nixpacks.toml` - Configure nixpacks for Next.js (optional)

## Data Layer

No database schema changes required. The application already supports PostgreSQL via SQLAlchemy and Alembic migrations.

### Environment Variables Required

**Backend:**

- `DATABASE_URL` - PostgreSQL connection string (format: `postgresql://user:pass@host:port/db`)
- `CORS_ORIGINS` - Comma-separated frontend URLs
- `CLERK_SECRET_KEY` - Clerk authentication secret
- `CLERK_JWKS_URL` - Clerk JWKS endpoint

**Frontend:**

- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key

## Backend Changes

### 1. Update requirements.txt

- Uncomment `psycopg2-binary` for PostgreSQL support

### 2. Create start.sh script

- Run Alembic migrations on startup
- Start uvicorn with production settings
- Use host 0.0.0.0 and port from environment variable (default 8000)
- Multiple workers for production

### 3. Create .env.example

- Document all required environment variables
- Provide example values

### 4. Optional: Create nixpacks.toml

- Specify Python version (3.11+)
- Define install and start commands
- Configure build phases if auto-detection needs override

## Frontend Changes

### 1. Update next.config.ts

- Add `output: 'standalone'` for optimized Docker builds
- Configure environment variable validation

### 2. Create .env.example

- Document all required environment variables
- Include both public and server-side variables

### 3. Optional: Create nixpacks.toml

- Specify Node version if needed
- Define build and start commands
- Configure environment variables

## Logic Flow

### Initial Deployment Steps:

1. **Prepare Repository**

   - Update all configuration files
   - Ensure .env.example files are present
   - Test locally with PostgreSQL

2. **Setup Dokploy Project**

   - Create new project in Dokploy
   - Connect GitHub repository

3. **Create Database Service**

   - Create PostgreSQL service
   - Note connection details
   - Database auto-creates on first connection

4. **Create Backend Service**

   - Set build path to `backend/`
   - Configure environment variables (especially DATABASE_URL)
   - Set port to 8000
   - Deploy and verify health endpoint

5. **Create Frontend Service**

   - Set build path to `frontend/`
   - Configure environment variables (NEXT_PUBLIC_API_URL points to backend)
   - Set port to 3000
   - Deploy and verify

6. **Run Migrations**
   - Migrations run automatically via start.sh
   - Or run manually: `alembic upgrade head`

### Dokploy Service Configuration:

**Database:**

- Type: PostgreSQL
- No custom configuration needed

**Backend:**

- Build Path: `backend/`
- Port: 8000
- Health Check: `/health`
- Start Command: `./start.sh` (or auto-detected by nixpacks)

**Frontend:**

- Build Path: `frontend/`
- Port: 3000
- Health Check: `/` or `/api/health`

## Deployment Guide Structure

### DEPLOYMENT.md sections:

1. **Prerequisites** - Dokploy account, repository access, Clerk credentials
2. **Environment Variables** - Complete list with descriptions
3. **Step-by-Step Deployment** - Detailed Dokploy UI instructions
4. **Post-Deployment** - Verification steps, testing endpoints
5. **Troubleshooting** - Common issues and solutions
6. **Updating** - How to deploy updates

## Production Considerations

### Security:

- Never commit .env files
- Use strong database passwords
- Enable HTTPS via Dokploy
- Validate CORS origins strictly

### Performance:

- Use uvicorn with multiple workers (4-8)
- Next.js standalone mode for smaller images
- Database connection pooling (SQLAlchemy default)
- Enable compression middleware

### Monitoring:

- Check backend /health endpoint
- Monitor database connections
- Track response times
- Set up error logging

## Testing Pre-Deployment

1. **Local PostgreSQL Test:**

   ```bash
   # Backend
   DATABASE_URL="postgresql://user:pass@localhost:5432/testdb" uvicorn app.main:app

   # Run migrations
   DATABASE_URL="postgresql://user:pass@localhost:5432/testdb" alembic upgrade head
   ```

2. **Build Test:**

   ```bash
   # Frontend
   cd frontend && npm run build && npm start

   # Backend
   cd backend && ./start.sh
   ```

3. **Integration Test:**
   - Frontend connects to backend
   - Authentication works
   - CRUD operations successful
   - File imports function correctly

## Phases

### Phase 1: Configuration Files

- Update requirements.txt
- Create .env.example files
- Create backend start.sh script
- Update next.config.ts

### Phase 2: Documentation

- Create DEPLOYMENT.md guide
- Update main README.md with deployment section
- Document environment variables

### Phase 3: Optional Optimizations

- Create nixpacks.toml files if needed
- Add health check improvements
- Configure logging

