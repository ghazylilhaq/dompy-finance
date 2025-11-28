#!/bin/bash

# Backend Health Check Script
echo "🔍 Checking Backend Health..."
echo ""

API_URL="https://api.dompy.ghazy.id"

echo "1️⃣ Testing Root Endpoint:"
curl -s "$API_URL/" | jq '.' || echo "❌ Failed"
echo ""

echo "2️⃣ Testing Health Endpoint:"
curl -s "$API_URL/health" | jq '.' || echo "❌ Failed"
echo ""

echo "3️⃣ Testing Debug/CORS Endpoint:"
curl -s "$API_URL/debug/cors" | jq '.' || echo "❌ Failed"
echo ""

echo "4️⃣ Testing with verbose (shows headers):"
curl -v "$API_URL/health" 2>&1 | grep -E "(HTTP|Host|Origin)"
echo ""

echo "✅ Done!"


