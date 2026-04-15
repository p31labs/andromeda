#!/bin/bash
# K₄ CAGE — Deploy Script
# P31 Labs, Inc.
# One command to create the calcium cage

echo "🔺 K₄ CAGE — Deploying the Calcium Cage"
echo "   4 vertices | 6 edges | 1 worker"
echo ""

# Step 1: Create KV namespace
echo "Step 1: Creating KV namespace..."
KV_OUTPUT=$(npx wrangler kv namespace create K4_MESH 2>&1)
echo "$KV_OUTPUT"

# Extract the ID (looks for the id = "xxx" line)
KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id = "\K[^"]+')
if [ -n "$KV_ID" ]; then
  echo "✅ KV namespace created: $KV_ID"
  # Update wrangler.toml with the actual ID
  sed -i "s/PASTE_KV_NAMESPACE_ID_HERE/$KV_ID/" wrangler.toml
  echo "✅ wrangler.toml updated"
else
  echo "⚠️  Could not auto-extract KV ID. Check output above and update wrangler.toml manually."
fi

echo ""

# Step 2: Deploy the worker
echo "Step 2: Deploying K₄ Cage worker..."
npx wrangler deploy

echo ""
echo "🔺 K₄ CAGE is live."
echo ""
echo "Endpoints:"
echo "  GET  /                        → Status page"
echo "  GET  /api/mesh                → Full mesh state"
echo "  GET  /api/vertex/:id          → Vertex state (will|sj|wj|christyn)"
echo "  POST /api/presence/:id        → Update presence"
echo "  POST /api/ping/:from/:to      → Send ping (LOVE flows both ways)"
echo "  GET  /api/edge/:v1/:v2        → Edge state"
echo "  GET  /api/telemetry           → WCD-46 chain (Daubert-grade)"
echo "  GET  /api/admin/dashboard     → Admin (add ?token=p31-dad-2026)"
echo ""
echo "First ping: curl -X POST https://k4-cage.trimtab-signal.workers.dev/api/ping/will/sj -d '{\"emoji\":\"💚\"}' -H 'Content-Type: application/json'"
