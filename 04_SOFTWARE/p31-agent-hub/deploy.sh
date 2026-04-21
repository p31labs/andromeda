#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Deploy p31-agent-hub — Complete fresh build
# No injections. No Quick Edit. One file. One deploy.
#
# Usage:
#   chmod +x deploy.sh && ./deploy.sh
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${CYAN}[P31]${NC} $1"; }
ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
fail() { echo -e "${RED}  ✘${NC} $1"; exit 1; }

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# ── Preflight ─────────────────────────────────────────────────────
log "Preflight checks..."
command -v npx >/dev/null 2>&1 || fail "npx not found"
npx wrangler whoami 2>/dev/null | head -1 || fail "Not authenticated — run: npx wrangler login"
echo ""

# ── Verify source ────────────────────────────────────────────────
[ -f src/index.js ] || fail "src/index.js not found"
[ -f wrangler.toml ] || fail "wrangler.toml not found"
LINES=$(wc -l < src/index.js)
ok "Source: src/index.js (${LINES} lines)"

# ── Verify Service Binding targets exist ─────────────────────────
log "Checking service binding targets..."
for w in k4-cage k4-personal k4-hubs p31-bouncer; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${w}.trimtab-signal.workers.dev/health" --max-time 5 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    ok "${w}: live"
  else
    echo -e "  ${RED}⚠${NC} ${w}: HTTP ${STATUS} (may cause tool failures but won't block deploy)"
  fi
done
echo ""

# ── Dry run ──────────────────────────────────────────────────────
log "Dry run..."
DRY=$(npx wrangler deploy --dry-run 2>&1)
if echo "$DRY" | grep -q "Total Upload"; then
  SIZE=$(echo "$DRY" | grep "Total Upload" | head -1)
  ok "Dry run passed: ${SIZE}"
else
  echo "$DRY"
  fail "Dry run failed"
fi
echo ""

# ── Deploy ───────────────────────────────────────────────────────
log "Deploying p31-agent-hub..."
DEPLOY=$(npx wrangler deploy 2>&1)
if echo "$DEPLOY" | grep -q "Published\|Uploaded\|Current Version ID"; then
  ok "Deployed successfully"
  echo "$DEPLOY" | grep -E "Uploaded|Current Version|https://" | while read -r line; do
    echo -e "  ${GREEN}${line}${NC}"
  done
else
  echo "$DEPLOY"
  fail "Deploy failed"
fi
echo ""

# ── Smoke tests ──────────────────────────────────────────────────
log "Smoke tests..."

# Health
HEALTH=$(curl -s "https://p31-agent-hub.trimtab-signal.workers.dev/health" --max-time 5 2>/dev/null)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  ok "/health: ${HEALTH}"
else
  echo -e "  ${RED}⚠${NC} /health: ${HEALTH}"
fi

# Chat (with timeout — LLM calls can take 10-20s)
log "Testing /api/chat (may take up to 30s)..."
CHAT=$(curl -s -X POST "https://p31-agent-hub.trimtab-signal.workers.dev/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"session":"deploy-test","message":"[will] hello, what is the mesh status?"}' \
  --max-time 35 2>/dev/null)

if echo "$CHAT" | grep -q '"reply"'; then
  REPLY=$(echo "$CHAT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('reply','')[:120])" 2>/dev/null || echo "$CHAT" | head -c 200)
  
  # Check for leakage
  if echo "$REPLY" | grep -q '"tool_calls"'; then
    echo -e "  ${RED}⚠${NC} Reply contains raw tool_calls — leakage parser may not be catching this format"
  else
    ok "Chat reply: ${REPLY}..."
  fi
elif echo "$CHAT" | grep -q '"error"'; then
  MSG=$(echo "$CHAT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message','unknown'))" 2>/dev/null || echo "parse error")
  echo -e "  ${RED}⚠${NC} Chat error: ${MSG} (may be transient Workers AI issue — retry in 60s)"
else
  echo -e "  ${RED}⚠${NC} Unexpected response: $(echo "$CHAT" | head -c 200)"
fi

# Cleanup test session
curl -s -X POST "https://p31-agent-hub.trimtab-signal.workers.dev/api/clear" \
  -H "Content-Type: application/json" \
  -d '{"session":"deploy-test"}' --max-time 5 > /dev/null 2>&1

echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  p31-agent-hub deployed                       ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Endpoint:  https://p31-agent-hub.trimtab-signal.workers.dev"
echo -e "  Health:    /health"
echo -e "  Chat:      POST /api/chat {session, message}"
echo -e "  Clear:     POST /api/clear {session}"
echo ""
echo -e "  Monitor:   npx wrangler tail p31-agent-hub --format pretty"
echo -e "  Leakage:   npx wrangler tail p31-agent-hub | grep CWP-17B"
echo ""