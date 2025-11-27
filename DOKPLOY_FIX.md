# Dokploy Deployment Fix

## Issues Fixed

### 1. Backend Error: `pip: command not found`
**Cause**: Custom `nixpacks.toml` was interfering with Python environment setup

**Solution**: Removed `backend/nixpacks.toml` to let nixpacks auto-detect Python project

### 2. Frontend Error: `tsconfig.tsbuildinfo` mount conflict
**Cause**: Custom `nixpacks.toml` was creating cache mount conflicts

**Solution**: 
- Removed `frontend/nixpacks.toml` to let nixpacks auto-detect Next.js project
- Removed `--turbopack` flag from production build (not stable for production)

## Updated Deployment Instructions

### Backend Deployment

1. **Service Configuration**:
   - Build Path: `backend/` or `backend`
   - Port: `8000`
   - **Remove** Start Command field (let nixpacks auto-detect)

2. **Environment Variables**:
   ```env
   DATABASE_URL=postgresql://username:password@neobudget-db:5432/neobudget
   CORS_ORIGINS=https://your-frontend-domain.com
   CLERK_SECRET_KEY=sk_live_xxxxx
   CLERK_JWKS_URL=https://your-app.clerk.accounts.dev/.well-known/jwks.json
   DEBUG=false
   ```

3. **What Nixpacks Will Do**:
   - Detect `requirements.txt` → Install Python 3.11
   - Create virtual environment automatically
   - Install dependencies: `pip install -r requirements.txt`
   - Detect `start.sh` → Use as start command
   - Run: `./start.sh` (which runs migrations + starts uvicorn)

### Frontend Deployment

1. **Service Configuration**:
   - Build Path: `frontend/` or `frontend`
   - Port: `3000`
   - **Remove** Start Command field (let nixpacks auto-detect)

2. **Environment Variables**:
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend-domain.com
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
   CLERK_SECRET_KEY=sk_live_xxxxx
   ```

3. **What Nixpacks Will Do**:
   - Detect `package.json` → Install Node.js 20
   - Run: `npm install` (or `npm ci`)
   - Run: `npm run build` (without turbopack for production)
   - Start: `npm start` (runs optimized standalone server)

## Key Changes Made

### Files Deleted
- ❌ `backend/nixpacks.toml` - Was causing pip issues
- ❌ `frontend/nixpacks.toml` - Was causing mount conflicts

### Files Modified
- ✅ `frontend/package.json` - Removed `--turbopack` from build script

### Why This Works Better

**Auto-detection is more reliable:**
- Nixpacks knows how to properly set up Python virtual environments
- Nixpacks handles Next.js build optimizations automatically
- Reduces configuration errors
- Uses battle-tested build configurations

## Troubleshooting

### If Backend Still Fails

Check the generated Dockerfile in logs. It should look like:
```dockerfile
# Install Python
FROM python:3.11

# Create venv
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy app
COPY . /app

# Start
CMD ["./start.sh"]
```

### If Frontend Still Fails

Make sure `tsconfig.tsbuildinfo` is in `.gitignore`:
```bash
# Check if it's ignored
git check-ignore frontend/tsconfig.tsbuildinfo

# If not ignored, add to .gitignore
echo "tsconfig.tsbuildinfo" >> frontend/.gitignore
```

### Common Dokploy Configuration Mistakes

❌ **Wrong**: Setting custom Start Command when you have `start.sh`
✅ **Right**: Leave Start Command empty, nixpacks will detect `start.sh`

❌ **Wrong**: Build Path without subdirectory: Just `backend`
✅ **Right**: Can use either `backend` or `backend/` - both work

❌ **Wrong**: Using root directory as build path
✅ **Right**: Specify the subdirectory (`backend/` or `frontend/`)

## Re-deployment Steps

1. **Commit these fixes**:
   ```bash
   git add .
   git commit -m "Fix nixpacks configuration for Dokploy deployment"
   git push origin main
   ```

2. **In Dokploy Dashboard**:
   - Go to your backend service
   - Click "Settings"
   - **Clear any custom Start Command** (leave it empty)
   - Click "Redeploy"

3. **Repeat for frontend**:
   - Go to your frontend service
   - Settings → Clear any custom Start Command
   - Click "Redeploy"

4. **Monitor logs** - You should see:
   - Backend: Python installation → venv creation → pip install → migrations → uvicorn start
   - Frontend: Node installation → npm install → npm build → npm start

## Expected Build Output

### Backend Success:
```
✓ Detected Python project
✓ Installing Python 3.11
✓ Creating virtual environment
✓ Installing dependencies from requirements.txt
✓ Starting application with ./start.sh
✓ Running migrations...
✓ Starting uvicorn server...
✓ Health check passed
```

### Frontend Success:
```
✓ Detected Next.js project
✓ Installing Node.js 20
✓ Installing dependencies
✓ Building Next.js application
✓ Creating optimized production build
✓ Starting Next.js server
✓ Server ready on port 3000
```

## Additional Notes

- **No nixpacks.toml needed** - Auto-detection works perfectly for Python/FastAPI and Next.js
- **start.sh is detected automatically** - Nixpacks looks for startup scripts
- **Environment variables** are injected properly without custom config
- **Build caching** works better with auto-detection

## If You Need Custom Configuration Later

Only add `nixpacks.toml` if you need:
- Specific Python/Node version not auto-detected
- Additional system packages (apt packages)
- Custom build phases

Example minimal backend nixpacks.toml (only if needed):
```toml
[phases.setup]
nixPkgs = ["python311"]

[start]
cmd = "./start.sh"
```

But for now, **no custom config is better**!

