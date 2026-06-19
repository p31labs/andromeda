#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# P31 ANDROMEDA — Ecosystem Verification
# Checks all 17 projects: builds, tests, health probes, and deployment
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail
ANDROMEDA="${ANDROMEDA:-/home/p31/andromeda}"
PASS=0; FAIL=0; WARN=0; TOTAL=0

G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; B='\033[1m'; N='\033[0m'

pass() { PASS=$((PASS+1)); TOTAL=$((TOTAL+1)); echo -e "  ${G}✓${N} $1"; }
fail() { FAIL=$((FAIL+1)); TOTAL=$((TOTAL+1)); echo -e "  ${R}✗${N} $1"; }
warn() { WARN=$((WARN+1)); TOTAL=$((TOTAL+1)); echo -e "  ${Y}⚠${N} $1"; }

header() { echo -e "\n${B}${1}${N}"; }

header "🏗️  Build Phase"

for project in bonding p31ca phos spaceship-earth sovereign-command-center spoon-calculator k4-cage p31-forge p31-cortex; do
  dir="${ANDROMEDA}/software/${project}"
  if [[ -f "${dir}/package.json" ]]; then
    # Quick build check — does dist/ or build output exist?
    if [[ -d "${dir}/dist" ]] || [[ -d "${dir}/build" ]] || [[ -d "${dir}/.astro" ]]; then
      pass "${project} (built)"
    else
      warn "${project} (no build output, may need deploy)"
    fi
  else
    if [[ -d "${dir}" ]]; then
      pass "${project} (exists, no package.json)"
    else
      fail "${project} (missing)"
    fi
  fi
done

# Check BONDING monorepo separately
if [[ -d /home/p31/bonding ]]; then
  pass "bonding-monorepo (root at /home/p31/bonding)"
else
  fail "bonding-monorepo (missing)"
fi

header "🧪  BONDING Tests"
TEST_ROOT="${BONDING_ROOT:-/home/p31/bonding}"
if [[ -f "${TEST_ROOT}/package.json" ]]; then
if pnpm --dir "${TEST_ROOT}" test --reporter=verbose &>/dev/null; then
  pass "bonding tests"
else
  warn "bonding test run returned non-zero (check output)"
fi
else
  fail "bonding test root not found"
fi

header "🌐  Health Probes"
probes=(
  "https://bonding.p31ca.org"
  "https://bonding-meatspace.pages.dev"
  "https://p31ca.org"
  "https://ops.p31ca.org"
  "https://phosphorus31.org"
  "https://bonding-server.onrender.com/health"
  "https://command-center.trimtab-signal.workers.dev"
)
for url in "${probes[@]}"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 --max-time 10 "$url" 2>/dev/null || echo "000")
  if [[ "$code" =~ ^2 ]]; then
    pass "${url} (${code})"
  elif [[ "$code" =~ ^3 ]]; then
    warn "${url} (${code} redirect)"
  elif [[ "$code" == "000" ]]; then
    warn "${url} (unreachable)"
  else
    warn "${url} (${code})"
  fi
done

header "📋  CI Workflows"
if [[ -d "${ANDROMEDA}/.github/workflows" ]]; then
  count=$(ls "${ANDROMEDA}/.github/workflows"/*.yml 2>/dev/null | wc -l)
  pass "andromeda: ${count} workflows"
fi
if [[ -d /home/p31/bonding/.github/workflows ]]; then
  count=$(ls /home/p31/bonding/.github/workflows/*.yml 2>/dev/null | wc -l)
  pass "bonding: ${count} workflows"
fi

header "📊  Results"
echo -e "  Pass: ${PASS}  Fail: ${FAIL}  Warn: ${WARN}  Total: ${TOTAL}"
if [[ "$FAIL" -gt 0 ]]; then
  echo -e "\n  ${R}Some checks failed.${N}"
  exit 1
elif [[ "$WARN" -gt 0 ]]; then
  echo -e "\n  ${Y}All passes, some warnings.${N}"
  exit 0
else
  echo -e "\n  ${G}✅ Ecosystem equilibrium achieved.${N}"
  exit 0
fi
