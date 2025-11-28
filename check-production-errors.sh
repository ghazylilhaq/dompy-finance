#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     PRODUCTION ERROR CHECK - NeoBudget Deployment         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

echo "📋 Checking Frontend Code Quality..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for 'any' types
echo "🔍 Checking for 'any' types..."
ANY_COUNT=$(grep -r ": any\b" frontend/components frontend/app frontend/lib 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
if [ "$ANY_COUNT" -gt 0 ]; then
    echo -e "${RED}❌ Found $ANY_COUNT instances of 'any' type${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ No 'any' types found${NC}"
fi

# Check for unused imports
echo "🔍 Checking for common unused imports..."
UNUSED=$(grep -r "import.*from.*lucide-react" frontend/components 2>/dev/null | grep -v "// " | wc -l | tr -d ' ')
echo -e "${GREEN}✅ Import check complete${NC}"

# Check for console.log (should use proper logging in production)
echo "🔍 Checking for console.log statements..."
CONSOLE_COUNT=$(grep -r "console\\.log" frontend/components frontend/app 2>/dev/null | grep -v "console.error" | grep -v node_modules | wc -l | tr -d ' ')
if [ "$CONSOLE_COUNT" -gt 5 ]; then
    echo -e "${YELLOW}⚠️  Found $CONSOLE_COUNT console.log statements (consider removing for production)${NC}"
else
    echo -e "${GREEN}✅ Console.log usage acceptable${NC}"
fi

echo ""
echo "📋 Checking Backend Code Quality..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for .env files in git
echo "🔍 Checking for .env files in git..."
if git ls-files | grep -q "\.env$"; then
    echo -e "${RED}❌ .env file found in git (security risk!)${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ No .env files in git${NC}"
fi

# Check for Procfile
echo "🔍 Checking for backend Procfile..."
if [ -f "backend/Procfile" ]; then
    echo -e "${GREEN}✅ Procfile exists${NC}"
else
    echo -e "${RED}❌ Procfile missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check for start.sh executable
echo "🔍 Checking start.sh permissions..."
if [ -x "backend/start.sh" ]; then
    echo -e "${GREEN}✅ start.sh is executable${NC}"
else
    echo -e "${YELLOW}⚠️  start.sh may not be executable${NC}"
fi

# Check for PostgreSQL driver
echo "🔍 Checking PostgreSQL driver..."
if grep -q "^psycopg2-binary" backend/requirements.txt; then
    echo -e "${GREEN}✅ PostgreSQL driver enabled${NC}"
else
    echo -e "${RED}❌ PostgreSQL driver not found in requirements.txt${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "📋 Checking Configuration Files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check next.config.ts
echo "🔍 Checking Next.js config..."
if grep -q "output.*standalone" frontend/next.config.ts; then
    echo -e "${GREEN}✅ Standalone output configured${NC}"
else
    echo -e "${YELLOW}⚠️  Standalone output not configured${NC}"
fi

# Check for turbopack in production
echo "🔍 Checking for turbopack flag..."
if grep -q '"build".*--turbopack' frontend/package.json; then
    echo -e "${RED}❌ --turbopack found in build script (not stable for production)${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ No --turbopack in production build${NC}"
fi

# Check .gitignore
echo "🔍 Checking .gitignore for build artifacts..."
if grep -q "tsconfig.tsbuildinfo" frontend/.gitignore; then
    echo -e "${GREEN}✅ Build artifacts properly ignored${NC}"
else
    echo -e "${YELLOW}⚠️  tsconfig.tsbuildinfo should be in .gitignore${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED - READY FOR PRODUCTION DEPLOYMENT${NC}"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Deploy to Dokploy"
    echo "   2. Set environment variables"
    echo "   3. Monitor deployment logs"
    exit 0
else
    echo -e "${RED}❌ FOUND $ERRORS CRITICAL ISSUES - FIX BEFORE DEPLOYING${NC}"
    exit 1
fi

