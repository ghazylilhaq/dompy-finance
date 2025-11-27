# Quick Start Guide - Dokploy Deployment

This is a condensed version of the deployment guide. For full details, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Prerequisites Checklist

- [ ] Dokploy account and access
- [ ] Repository pushed to Git
- [ ] Clerk account created at https://clerk.com
- [ ] Clerk publishable key (pk_live_*)
- [ ] Clerk secret key (sk_live_*)
- [ ] Clerk JWKS URL from dashboard

## Deployment Steps (15 minutes)

### 1. Create Database (2 min)

In Dokploy:
1. Create Project → "neobudget"
2. Add Service → Database → PostgreSQL
3. Name: `neobudget-db`
4. Database: `neobudget`
5. Set username & strong password
6. **Save the connection URL**

### 2. Deploy Backend (5 min)

1. Add Service → Application → From Git
2. Connect repository
3. **Build Path**: `backend/`
4. **Port**: `8000`
5. **Environment Variables** (paste these):

```env
DATABASE_URL=postgresql://username:password@neobudget-db:5432/neobudget
CORS_ORIGINS=https://your-frontend-domain.com
CLERK_SECRET_KEY=sk_live_xxxxx
CLERK_JWKS_URL=https://your-app.clerk.accounts.dev/.well-known/jwks.json
DEBUG=false
```

6. Deploy
7. **Copy backend URL** (e.g., https://backend-xyz.dokploy.app)

### 3. Deploy Frontend (5 min)

1. Add Service → Application → From Git
2. Same repository
3. **Build Path**: `frontend/`
4. **Port**: `3000`
5. **Environment Variables**:

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx
```

6. Deploy
7. **Copy frontend URL**

### 4. Configure Clerk (3 min)

1. Go to https://dashboard.clerk.com
2. Select your application
3. Domains → Add frontend URL
4. Verify keys are production keys (pk_live_*, sk_live_*)

### 5. Update CORS & Test

1. Go back to backend service in Dokploy
2. Update `CORS_ORIGINS` with actual frontend URL
3. Redeploy backend
4. **Test**: Visit frontend URL
5. Sign up and try the app!

## Verification Checklist

Test these endpoints:

- [ ] Backend health: `https://your-backend.com/health` → `{"status":"ok"}`
- [ ] Backend docs: `https://your-backend.com/docs` (should load)
- [ ] Frontend loads: `https://your-frontend.com`
- [ ] Can sign up/sign in
- [ ] Can create account, category, transaction

## Common Issues

### Backend won't start
- Check `DATABASE_URL` is correct
- Verify database service is running
- Check logs for migration errors

### Frontend can't connect
- Verify `NEXT_PUBLIC_API_URL` matches backend URL
- Check `CORS_ORIGINS` includes frontend URL
- Test backend health endpoint directly

### Authentication fails
- Verify Clerk keys are correct (pk_live_*, sk_live_*)
- Ensure frontend domain added in Clerk dashboard
- Check `CLERK_JWKS_URL` format

## Environment Variables Cheat Sheet

**Backend** (5 required):
```
DATABASE_URL=postgresql://user:pass@neobudget-db:5432/neobudget
CORS_ORIGINS=https://your-frontend.com
CLERK_SECRET_KEY=sk_live_xxxxx
CLERK_JWKS_URL=https://xyz.clerk.accounts.dev/.well-known/jwks.json
DEBUG=false
```

**Frontend** (3 required):
```
NEXT_PUBLIC_API_URL=https://your-backend.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx
```

## Next Steps

- Set up automatic deployments (push to deploy)
- Enable database backups
- Configure custom domains
- Set up monitoring

## Need Help?

1. Check logs in Dokploy dashboard
2. Read [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting
3. Test each service independently
4. Verify all environment variables

---

**Estimated total time**: 15-20 minutes for first deployment

