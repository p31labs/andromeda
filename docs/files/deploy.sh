#!/bin/bash
# P31 Fleet Deploy — April 13, 2026
# Three parallel builds: Mesh Pages, Command Center KV, Carrie Agent Fleet
# Run from repo root (P31_Andromeda/)
set -e

echo "═══════════════════════════════════════════"
echo "P31 FLEET DEPLOY — $(date '+%Y-%m-%d %H:%M')"
echo "═══════════════════════════════════════════"

# ── BUILD 1: Deploy Mesh to Pages ──
echo ""
echo "▸ BUILD 1: P31 Mesh → Cloudflare Pages"
echo "─────────────────────────────────────────"
cd 04_SOFTWARE/cloudflare-pages/p31-mesh 2>/dev/null || {
  mkdir -p 04_SOFTWARE/cloudflare-pages/p31-mesh
  cp 02_RESEARCH/p31_mesh.html 04_SOFTWARE/cloudflare-pages/p31-mesh/index.html
  cp fleet-deploy/p31-mesh/wrangler.toml 04_SOFTWARE/cloudflare-pages/p31-mesh/
  cd 04_SOFTWARE/cloudflare-pages/p31-mesh
}
npx wrangler pages deploy . --project-name=p31-mesh --commit-dirty=true
echo "✓ BUILD 1 complete"
cd ../../..

# ── BUILD 2: Command Center → KV ──
echo ""
echo "▸ BUILD 2: Command Center → KV-backed"
echo "─────────────────────────────────────────"

# Step 2a: Provision KV namespace (skip if exists)
echo "Provisioning STATUS_KV namespace..."
KV_OUTPUT=$(npx wrangler kv namespace create STATUS_KV 2>&1 || true)
echo "$KV_OUTPUT"

# Extract KV ID if newly created
KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id = "\K[^"]+' || true)
if [ -n "$KV_ID" ]; then
  echo "New KV namespace: $KV_ID"
  # Update wrangler.toml with real ID
  sed -i "s/__PROVISION_ME__/$KV_ID/" 04_SOFTWARE/cloudflare-worker/command-center/wrangler.toml
else
  echo "KV namespace may already exist. Check wrangler.toml for correct ID."
fi

# Step 2b: Copy source files
cp fleet-deploy/command-center/src/index.js 04_SOFTWARE/cloudflare-worker/command-center/src/index.js
cp fleet-deploy/command-center/wrangler.toml 04_SOFTWARE/cloudflare-worker/command-center/wrangler.toml 2>/dev/null || true
cp fleet-deploy/command-center/status.json 04_SOFTWARE/cloudflare-worker/command-center/status.json

# Step 2c: Deploy worker
cd 04_SOFTWARE/cloudflare-worker/command-center
npx wrangler deploy
echo "✓ Command Center deployed"

# Step 2d: Set secret (interactive — will prompt)
echo ""
echo "Setting STATUS_TOKEN secret..."
echo "Enter a secure token when prompted:"
npx wrangler secret put STATUS_TOKEN 2>/dev/null || echo "(secret may already be set)"

# Step 2e: Push initial status to KV
echo "Pushing initial status.json to KV..."
npx wrangler kv key put --binding STATUS_KV status --path status.json 2>/dev/null || {
  echo "KV push via CLI failed. Use POST instead:"
  echo "  curl -X POST https://command-center.trimtab-signal.workers.dev/api/status \\"
  echo "    -H 'Authorization: Bearer YOUR_TOKEN' \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    -d @status.json"
}
echo "✓ BUILD 2 complete"
cd ../../..

# ── BUILD 3: Carrie Agent → Fleet Hub ──
echo ""
echo "▸ BUILD 3: Carrie Agent → Fleet Hub"
echo "─────────────────────────────────────────"
cp fleet-deploy/carrie-agent/src/index.js 04_SOFTWARE/cloudflare-worker/carrie-agent/src/index.js
cp fleet-deploy/carrie-agent/wrangler.toml 04_SOFTWARE/cloudflare-worker/carrie-agent/wrangler.toml 2>/dev/null || true
cd 04_SOFTWARE/cloudflare-worker/carrie-agent
npx wrangler deploy
echo "✓ BUILD 3 complete"
cd ../../..

# ── VERIFICATION ──
echo ""
echo "═══════════════════════════════════════════"
echo "VERIFICATION"
echo "═══════════════════════════════════════════"
echo ""
echo "1. Mesh:    curl -s https://p31-mesh.pages.dev | head -1"
echo "2. Cmd Ctr: curl -s https://command-center.trimtab-signal.workers.dev/api/health"
echo "3. Status:  curl -s https://command-center.trimtab-signal.workers.dev/api/status | python3 -m json.tool | head -5"
echo "4. Carrie:  curl -s https://carrie-agent.trimtab-signal.workers.dev | head -1"
echo ""
echo "To update status later:"
echo "  curl -X POST https://command-center.trimtab-signal.workers.dev/api/status \\"
echo "    -H 'Authorization: Bearer \$TOKEN' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d @status.json"
echo ""
echo "═══════════════════════════════════════════"
echo "FLEET DEPLOY COMPLETE — $(date '+%H:%M')"
echo "═══════════════════════════════════════════"
