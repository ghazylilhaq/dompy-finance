# NeoBudget Deployment Guide

This guide walks you through deploying NeoBudget to Dokploy using nixpacks.

## Architecture Overview

The application consists of three services:

1. **PostgreSQL Database** - Managed database service
2. **Backend API** - FastAPI application (Python)
3. **Frontend** - Next.js application (React/TypeScript)

## Prerequisites

- **Dokploy Account** - Access to a Dokploy instance
- **Git Repository** - Your code pushed to GitHub/GitLab/Bitbucket
- **Clerk Account** - For authentication ([https://clerk.com](https://clerk.com))
  - Create an application in Clerk dashboard
  - Note down your publishable and secret keys
  - Configure your production domain in Clerk

## Environment Variables Reference

### Backend Environment Variables

| Variable           | Description                                      | Example                                                     |
| ------------------ | ------------------------------------------------ | ----------------------------------------------------------- |
| `DATABASE_URL`     | PostgreSQL connection string                     | `postgresql://user:pass@db-host:5432/neobudget`             |
| `CORS_ORIGINS`     | Comma-separated allowed origins                  | `https://your-app.com,https://www.your-app.com`             |
| `CLERK_SECRET_KEY` | Clerk secret key for JWT verification            | `sk_live_xxxxx`                                             |
| `CLERK_JWKS_URL`   | Clerk JWKS endpoint URL                          | `https://your-app.clerk.accounts.dev/.well-known/jwks.json` |
| `DEBUG`            | Enable debug mode (optional)                     | `false`                                                     |
| `PORT`             | Server port (optional, default: 8000)            | `8000`                                                      |
| `WORKERS`          | Number of uvicorn workers (optional, default: 4) | `4`                                                         |

### Frontend Environment Variables

| Variable                            | Description           | Example                    |
| ----------------------------------- | --------------------- | -------------------------- |
| `NEXT_PUBLIC_API_URL`               | Backend API URL       | `https://api.your-app.com` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | `pk_live_xxxxx`            |
| `CLERK_SECRET_KEY`                  | Clerk secret key      | `sk_live_xxxxx`            |

## Step-by-Step Deployment

### Step 1: Prepare Your Repository

1. Ensure all code is committed and pushed to your Git repository
2. Verify the following files exist:
   - `backend/requirements.txt` (includes `psycopg2-binary`)
   - `backend/start.sh` (executable)
   - `frontend/package.json`
   - `frontend/next.config.ts` (with standalone output)

### Step 2: Create Project in Dokploy

1. Log in to your Dokploy dashboard
2. Click **"Create Project"**
3. Enter project details:
   - **Name**: `neobudget` (or your preferred name)
   - **Description**: Personal finance management application
4. Click **"Create"**

### Step 3: Deploy PostgreSQL Database

1. In your project, click **"Add Service"**
2. Select **"Database"** → **"PostgreSQL"**
3. Configure database:
   - **Name**: `neobudget-db`
   - **Database Name**: `neobudget`
   - **Username**: Choose a username (e.g., `neobudget`)
   - **Password**: Generate a strong password (save it!)
   - **Port**: `5432` (default)
4. Click **"Create"**
5. Wait for database to be provisioned
6. **Copy the connection URL** - you'll need this for the backend

**Connection URL Format:**

```
postgresql://username:password@neobudget-db:5432/neobudget
```

> **Note**: The database host is the service name (`neobudget-db`) within Dokploy's internal network.

### Step 4: Deploy Backend Service

1. In your project, click **"Add Service"**
2. Select **"Application"** → **"From Git Repository"**
3. Connect your repository:
   - Select your Git provider
   - Authorize Dokploy
   - Choose your repository: `dompy-finance`
   - Branch: `main` (or your deployment branch)
4. Configure application:
   - **Name**: `neobudget-backend`
   - **Build Path**: `backend/`
   - **Port**: `8000`
   - **Start Command**: Leave empty (nixpacks will auto-detect `start.sh`)
5. **Add Environment Variables** (click "Environment"):

   ```
   DATABASE_URL=postgresql://username:password@neobudget-db:5432/neobudget
   CORS_ORIGINS=https://your-frontend-domain.com
   CLERK_SECRET_KEY=sk_live_xxxxx
   CLERK_JWKS_URL=https://your-app.clerk.accounts.dev/.well-known/jwks.json
   DEBUG=false
   ```

   > **Important**: Replace placeholders with actual values!

6. **Configure Health Check** (optional but recommended):

   - Path: `/health`
   - Port: `8000`

7. Click **"Deploy"**
8. Wait for deployment to complete (nixpacks will auto-detect Python and install dependencies)

9. **Verify Deployment**:
   - Check logs for any errors
   - Visit the backend URL: `https://your-backend-url.com/health`
   - Should return: `{"status": "ok"}`
   - Check API docs: `https://your-backend-url.com/docs`

### Step 5: Deploy Frontend Service

1. In your project, click **"Add Service"**
2. Select **"Application"** → **"From Git Repository"**
3. Use the same repository connection
4. Configure application:
   - **Name**: `neobudget-frontend`
   - **Build Path**: `frontend/`
   - **Port**: `3000`
   - **Start Command**: Leave empty (nixpacks will auto-detect)
5. **Add Environment Variables**:

   ```
   NEXT_PUBLIC_API_URL=https://your-backend-domain.com
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
   CLERK_SECRET_KEY=sk_live_xxxxx
   ```

   > **Important**: Use the backend URL from Step 4!

6. Click **"Deploy"**
7. Wait for deployment (nixpacks will build Next.js in standalone mode)

8. **Verify Deployment**:
   - Visit your frontend URL
   - You should see the landing page
   - Try signing in/up

### Step 6: Configure Clerk for Production

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **"Domains"** → **"Frontend API"**
4. Add your production domain: `your-frontend-domain.com`
5. Go to **"API Keys"**
6. Ensure you're using **production keys** (`pk_live_*` and `sk_live_*`)

### Step 7: Update CORS (if needed)

If you have multiple domains (e.g., with and without `www`), update the backend CORS_ORIGINS:

```
CORS_ORIGINS=https://your-app.com,https://www.your-app.com
```

Redeploy the backend for changes to take effect.

## Post-Deployment Verification

### 1. Test Backend Health

```bash
curl https://your-backend-url.com/health
# Expected: {"status":"ok"}
```

### 2. Test API Documentation

Visit: `https://your-backend-url.com/docs`

- Should show interactive API documentation
- Authentication required for protected endpoints

### 3. Test Frontend

1. Visit: `https://your-frontend-url.com`
2. Click **"Sign Up"** and create an account
3. Complete onboarding
4. Try creating accounts, categories, budgets
5. Add transactions
6. Test import functionality

### 4. Check Database

The database migrations run automatically via `start.sh`. To verify:

```bash
# In Dokploy, open backend shell or logs
# You should see:
"Running database migrations..."
"INFO  [alembic.runtime.migration] Running upgrade ..."
```

## Troubleshooting

### Backend Won't Start

**Symptom**: Backend service fails to start

**Solutions**:

1. Check logs in Dokploy dashboard
2. Verify `DATABASE_URL` is correct
3. Ensure database service is running
4. Check that `start.sh` is executable
5. Verify `psycopg2-binary` is in `requirements.txt`

```bash
# Check logs for:
- "could not connect to server" → Database not accessible
- "relation does not exist" → Migrations didn't run
- "Authentication failed" → Wrong DB credentials
```

### Frontend Can't Connect to Backend

**Symptom**: Frontend shows API errors

**Solutions**:

1. Verify `NEXT_PUBLIC_API_URL` points to backend
2. Check CORS settings in backend
3. Ensure backend is deployed and healthy
4. Check browser console for CORS errors

```bash
# Test backend from frontend domain:
curl https://your-backend-url.com/health
```

### Authentication Errors

**Symptom**: Can't sign in or "Invalid token"

**Solutions**:

1. Verify Clerk keys are correct (publishable and secret)
2. Ensure using production keys for production
3. Check that domain is added in Clerk dashboard
4. Verify `CLERK_JWKS_URL` is correct
5. Check backend logs for JWT errors

### Database Connection Errors

**Symptom**: "could not connect to server"

**Solutions**:

1. Verify database service is running
2. Check `DATABASE_URL` format:
   ```
   postgresql://username:password@host:5432/database
   ```
3. Ensure using internal hostname (service name)
4. Check database logs in Dokploy

### Migration Errors

**Symptom**: Database tables don't exist

**Solutions**:

1. Check backend logs for migration errors
2. Manually run migrations:
   ```bash
   # In backend shell
   alembic upgrade head
   ```
3. Verify database connection before migrations
4. Check alembic/versions/ files are present

## Updating Your Deployment

### Automatic Deployments (Recommended)

Configure Dokploy to auto-deploy on Git push:

1. In service settings, enable **"Auto Deploy"**
2. Select branch: `main`
3. On every push, Dokploy will rebuild and redeploy

### Manual Deployments

1. Push changes to Git repository
2. In Dokploy dashboard, go to your service
3. Click **"Redeploy"** button
4. Wait for build to complete

### Database Migrations

Migrations run automatically on backend startup. New migrations will apply on deploy.

To create new migrations:

```bash
# Local development
cd backend
alembic revision --autogenerate -m "description"
# Commit and push
```

## Performance Tips

### Backend Optimization

1. **Workers**: Adjust `WORKERS` environment variable based on your server:

   - 2 CPU cores → 2-4 workers
   - 4 CPU cores → 4-8 workers

2. **Database Connection Pooling**: SQLAlchemy handles this automatically

3. **Monitoring**: Set up monitoring for `/health` endpoint

### Frontend Optimization

1. **Standalone Mode**: Already configured via `next.config.ts`
2. **Image Optimization**: Next.js handles automatically
3. **CDN**: Use Dokploy's CDN if available

## Security Checklist

- [ ] Using HTTPS for all services
- [ ] Environment variables are not committed to Git
- [ ] Strong database password generated
- [ ] Production Clerk keys in use
- [ ] CORS origins strictly limited to your domains
- [ ] `DEBUG=false` in production
- [ ] Regular dependency updates scheduled

## Monitoring & Maintenance

### Health Checks

- Backend: `GET /health` → `{"status": "ok"}`
- Frontend: Should load without errors
- Database: Check connection count in Dokploy

### Logs

Access logs in Dokploy dashboard:

- **Backend**: API requests, errors, migrations
- **Frontend**: Build errors, runtime warnings
- **Database**: Connection issues, query errors

### Backups

1. Enable automatic database backups in Dokploy
2. Test restore procedure periodically
3. Keep backups for at least 30 days

## Support

If you encounter issues:

1. Check logs in Dokploy dashboard
2. Review this troubleshooting guide
3. Verify all environment variables
4. Test each service independently

## Additional Resources

- [Dokploy Documentation](https://docs.dokploy.com)
- [Nixpacks Documentation](https://nixpacks.com)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Clerk Documentation](https://clerk.com/docs)
