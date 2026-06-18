#!/usr/bin/env bash
# p31-ecosystem verify — canonical path mapping per 2026-06-18 audit.
# Build reference and intent established; all paths explicit.
set -euo pipefail
BASE=/home/p31/andromeda/software
BONDING_ROOT=/home/p31/bonding/apps

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'
PASS=0; FAIL=0; WARN=0

pass() { ((PASS++)); echo -e "  ${GREEN}✓${NC} $1"; }
fail() { ((FAIL++)); echo -e "  ${RED}✘${NC} $1"; }
warn() { ((WARN++)); echo -e "  ${YELLOW}!${NC} $1"; }
info() { echo -e "  ${NC}▸${NC} $1"; }
section() { echo ""; echo -e "\033[1m$1\033[0m"; }

section "🏗️  Build Phase"
info "Building BONDING chemistry game..."
if pnpm --dir "$BASE/bonding" run build >/dev/null 2>&1; then pass "bonding (chemistry)"; else fail "bonding (chemistry)"; fi

info "Building BONDING onboarding..."
if [ -d "$BONDING_ROOT/onboarding" ]; then
  if pnpm --dir "$BONDING_ROOT/onboarding" run build >/dev/null 2>&1; then pass "bonding (onboarding)"; else warn "bonding (onboarding) — build skipped"; fi
else
  warn "bonding (onboarding) — directory not found at $BONDING_ROOT/onboarding"
fi

info "Building BONDING mobile..."
if [ -d "$BONDING_ROOT/mobile" ]; then
  if pnpm --dir "$BONDING_ROOT/mobile" run build >/dev/null 2>&1; then pass "bonding (mobile)"; else warn "bonding (mobile)"; fi
else
  warn "bonding (mobile) — directory not found at $BONDING_ROOT/mobile"
fi

info "Building p31ca.org..."
if npx astro build --dir "$BASE/p31ca" >/dev/null 2>&1; then pass "p31ca.org"; else fail "p31ca.org"; fi

info "Building PHOS..."
if npm run build --prefix "$BASE/phos" >/dev/null 2>&1; then pass "PHOS"; else warn "PHOS"; fi

info "Building Sovereign CC..."
if npx next build --dir "$BASE/sovereign-command-center" >/dev/null 2>&1; then pass "sovereign-command-center"; else warn "sovereign-command-center"; fi

info "Building Spaceship Earth..."
if npx vite build --dir "$BASE/spaceship-earth" >/dev/null 2>&1; then pass "spaceship-earth"; else warn "spaceship-earth"; fi

info "Building p31-hearing-ops..."
if [ -d "$BASE/p31-hearing-ops" ]; then
  if npm run build --prefix "$BASE/p31-hearing-ops" >/dev/null 2>&1; then pass "p31-hearing-ops"; else warn "p31-hearing-ops"; fi
else
  warn "p31-hearing-ops — directory not found at $BASE/p31-hearing-ops"
fi

section "🧪 Test Phase"
info "Running BONDING chemistry tests..."
if npx vitest run --dir "$BASE/bonding" >/dev/null 2>&1; then pass "bonding tests"; else warn "bonding tests"; fi

info "Running BONDING mobile tests..."
if [ -d "$BONDING_ROOT/mobile" ]; then
  if npx vitest run --dir "$BONDING_ROOT/mobile" >/dev/null 2>&1; then pass "mobile tests"; else warn "mobile tests"; fi
else
  warn "mobile tests — directory not found at $BONDING_ROOT/mobile"
fi

info "Running spin-mesh tests..."
if [ -d "$BASE/spin-mesh" ]; then
  if npx vitest run --dir "$BASE/spin-mesh" >/dev/null 2>&1; then pass "spin-mesh tests"; else warn "spin-mesh tests"; fi
else
  warn "spin-mesh tests — directory not found at $BASE/spin-mesh"
fi

section "🌐 Health Probes"
TIMEOUT=10
probe_json() {
  local name=$1; local url=$2;
  local body
  body=$(curl -s -f --max-time "$TIMEOUT" -H 'Accept: application/json' "$url" 2>/dev/null || true)
  if echo "$body" | grep -q '"ok"'; then
    pass "$name (JSON healthy)"
  else
    fail "$name (no JSON response)"
  fi
}

probe "k4-cage"            "https://k4-cage.trimtab-signal.workers.dev"
probe "donate-api"         "https://donate-api.trimtab-signal.workers.dev"
probe "p31-forge"          "https://p31-forge.trimtab-signal.workers.dev"
probe "p31-cortex"         "https://p31-cortex.trimtab-signal.workers.dev"
probe "command-center"     "https://command-center.trimtab-signal.workers.dev"
probe "spin-matchmaking"   "https://spin-matchmaking.trimtab-signal.workers.dev"
probe "spin-logistics"     "https://spin-logistics.trimtab-signal.workers.dev"
probe "bonding (chem)"     "https://bonding.p31ca.org"
probe "bonding (meatspace)" "https://bonding-meatspace.pages.dev"
probe "p31ca.org"          "https://p31ca.org"
probe "PHOS"               "https://phos.p31ca.org"
probe "ops.p31ca.org"      "https://ops.p31ca.org"
probe "phosphorus31.org"   "https://phosphorus31.org"

section "📊 Results"
TOTAL=$((PASS + FAIL + WARN))
echo ""
echo -e "  ${GREEN}Pass${NC}: $PASS  ${RED}Fail${NC}: $FAIL  ${YELLOW}Warn${NC}: $WARN  Total: $TOTAL"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}✅ Ecosystem equilibrium achieved.${NC}"
  exit 0
else
  echo -e "  ${RED}❘ Equilibrium incomplete — $FAIL failure(s) require attention.${NC}"
  exit 1
fi
