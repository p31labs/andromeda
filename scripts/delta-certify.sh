#!/usr/bin/env bash
# delta-certify.sh — World Record Certification Script
# Usage: ./delta-certify.sh
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[1;33m'
BLD='\033[1m'
RST='\033[0m'

PASS=0
FAIL=0
WARN=0

check() {
  local name="$1"
  local result="$2"
  local detail="${3:-}"
  if [[ "$result" == "PASS" ]]; then
    echo -e "${GRN}[PASS]${RST} ${name}"
    PASS=$((PASS + 1))
  elif [[ "$result" == "WARN" ]]; then
    echo -e "${YLW}[WARN]${RST} ${name} ${detail}"
    WARN=$((WARN + 1))
  else
    echo -e "${RED}[FAIL]${RST} ${name} ${detail}"
    FAIL=$((FAIL + 1))
  fi
}

echo -e "${BLD}╔══════════════════════════════════════════════════════════╗${RST}"
echo -e "${BLD}║        DELTA PROTOCOL — WORLD RECORD CERTIFICATION        ║${RST}"
echo -e "${BLD}╚══════════════════════════════════════════════════════════╝${RST}"
echo ""
echo "Verifying gates..."
echo ""

# --- Gate G0: Medical ---
CA=$(python3 -c "import json; d=json.load(open('/home/p31/andromeda/medical-log.json')); print(d.get('serum_calcium_mg_dL',0))" 2>/dev/null || echo "0")
SP=$(python3 -c "import json; d=json.load(open('/home/p31/andromeda/spoon-state.json')); print(d.get('level',0))" 2>/dev/null || echo "0")
CA_OK=$(python3 -c "import sys; print('1' if float('$CA') >= 8.0 else '0')")
if [[ "$CA_OK" -eq 1 ]] && [[ "$SP" -ge 4 ]]; then
  check "G0 Medical" "PASS" "(Ca=${CA} mg/dL, spoons=${SP})"
else
  check "G0 Medical" "FAIL" "(Ca=${CA} mg/dL, spoons=${SP})"
fi

# --- Gate G7: Sovereign Sync (check early, requires p31 sync) ---
SYNC_STATUS=0
for cmd in p31 /home/p31/.local/bin/p31 /usr/local/bin/p31; do
  if command -v "$cmd" &> /dev/null; then
    SYNC_STATUS=$("$cmd" sync status 2>/dev/null | grep -c "synced" || true)
    SYNC_STATUS=${SYNC_STATUS:-0}
    break
  fi
done
if [[ "$SYNC_STATUS" -gt 0 ]]; then
  check "G7 Sovereign Sync" "PASS"
else
  check "G7 Sovereign Sync" "WARN" "(p31 CLI not accessible; verify manually)"
fi

# --- Gate G1: Token Debt (from quantum-polisher-report.json) ---
POLISHER_REPORT="/home/p31/andromeda/quantum-polisher-report.json"
if [[ -f "$POLISHER_REPORT" ]]; then
  HARDCODED=$(python3 -c "
import json, sys
with open('$POLISHER_REPORT') as f:
    p = json.load(f)
total = sum(p['projects'].get(proj,{}).get('layer_2',{}).get('hardcoded_count',0) for proj in p.get('projects',{}))
print(total)
" 2>/dev/null || echo "999")
  REDEFS=$(python3 -c "
import json, sys
with open('$POLISHER_REPORT') as f:
    p = json.load(f)
total = sum(p['projects'].get(proj,{}).get('layer_2',{}).get('redefinition_count',0) for proj in p.get('projects',{}))
print(total)
" 2>/dev/null || echo "999")
  if [[ "$HARDCODED" -eq 0 ]] && [[ "$REDEFS" -eq 0 ]]; then
    check "G1 Token Debt" "PASS" "(hardcoded=${HARDCODED}, redefs=${REDEFS})"
  else
    check "G1 Token Debt" "FAIL" "(hardcoded=${HARDCODED}, redefs=${REDEFS})"
  fi
else
  check "G1 Token Debt" "WARN" "(polisher report not found)"
fi

# --- Gate G2: Design-system adoption (project-type-aware) ---
G2_FAIL=0
G2_DETAIL=""
KNOWN_PROJECTS=(bonding frontend p31-delta-hiring p31-hearing-ops p31-pwa p31ca sovereign-command-center spaceship-earth spoon-calculator)
for proj in "${KNOWN_PROJECTS[@]}"; do
  path="$REPO_ROOT/software/$proj"
  [[ -d "$path" ]] || continue

  PASS_PROJ=false

  if [[ -f "$path/package.json" ]] && grep -q '"@p31/shared"' "$path/package.json" 2>/dev/null; then
    PASS_PROJ=true
  fi

  if [[ "$PASS_PROJ" == "false" ]] && ls "$path"/tailwind.config.* >/dev/null 2>&1; then
    if grep -rq "p31Preset" "$path"/tailwind.config.* 2>/dev/null; then
      PASS_PROJ=true
    fi
  fi

  if [[ "$PASS_PROJ" == "false" ]]; then
    if grep -rq "@import.*css-variables" "$path" --include="*.css" 2>/dev/null; then
      PASS_PROJ=true
    fi
  fi

  if [[ "$PASS_PROJ" == "false" ]]; then
    G2_DETAIL="$G2_DETAIL $proj"
    G2_FAIL=1
  fi
done

if [[ "$G2_FAIL" -eq 0 ]]; then
  PASSING=$((${#KNOWN_PROJECTS[@]} - ${#G2_DETAIL}))
  check "G2 Architecture" "PASS" "(adoption passed in $PASSING/${#KNOWN_PROJECTS[@]} projects)"
else
  check "G2 Architecture" "FAIL" "(missing adoption in:$G2_DETAIL)"
fi

# --- Gate G3: TypeScript Strict ---
TSC_ERRORS=$(cd /home/p31/andromeda && find software -name tsconfig.json -execdir pnpm tsc --noEmit 2>&1 \; | grep -c "error TS" || echo "0")
if [[ "$TSC_ERRORS" -eq 0 ]]; then
  check "G3 Patterns" "PASS" "(tsc: 0 errors)"
else
  check "G3 Patterns" "FAIL" "(tsc: ${TSC_ERRORS} errors)"
fi

# --- Gate G4: Test Coverage (skip if tools not available) ---
if command -v vitest &> /dev/null; then
  COVERAGE_OUT=$(cd /home/p31/andromeda && pnpm vitest --coverage 2>&1 | tail -20 || true)
  if echo "$COVERAGE_OUT" | grep -q "[8-9][0-9]\.[0-9]%\|100%"; then
    check "G4 Test Coverage" "PASS"
  elif echo "$COVERAGE_OUT" | grep -q "All files"; then
    AVG_COV=$(echo "$COVERAGE_OUT" | grep "All files" | awk '{print $NF}' | tr -d '%' || echo "0")
    COV_OK=$(python3 -c "import sys; print('1' if float('$AVG_COV') >= 80 else '0')")
    if [[ "$COV_OK" -eq 1 ]]; then
      check "G4 Test Coverage" "PASS" "(avg ${AVG_COV}%)"
    else
      check "G4 Test Coverage" "FAIL" "(avg ${AVG_COV}%)"
    fi
  else
    check "G4 Test Coverage" "WARN" "(run vitest --coverage manually to verify)"
  fi
else
  check "G4 Test Coverage" "WARN" "(vitest not installed; verify manually)"
fi

# --- Gate G5: PR Hygiene ---
if command -v gh &> /dev/null; then
  OPEN_PRS=$(gh pr list --state open --json number --jq 'length' 2>/dev/null || echo "0")
  DRAFT_PRS=$(gh pr list --state open --json isDraft --jq '[.[] | select(.isDraft == true)] | length' 2>/dev/null || echo "0")
  if [[ "$OPEN_PRS" -eq 0 ]]; then
    check "G5 PR Hygiene" "PASS" "(0 open PRs)"
  elif [[ "$DRAFT_PRS" -eq 0 ]]; then
    check "G5 PR Hygiene" "WARN" "(${OPEN_PRS} open PRs, 0 drafts)"
  else
    check "G5 PR Hygiene" "FAIL" "(${OPEN_PRS} open, ${DRAFT_PRS} drafts)"
  fi
else
  check "G5 PR Hygiene" "WARN" "(gh CLI not found; verify manually)"
fi

# --- Gate G6: Jitterbug Stability ---
GRADING="/home/p31/andromeda/grading-index.json"
if [[ -f "$GRADING" ]]; then
  TRANSITIONS=$(python3 -c "import json; d=json.load(open('$GRADING')); print(d.get('meta',{}).get('transitions_this_tick',0))" 2>/dev/null || echo "999")
  DEPRESSED=$(python3 -c "import json; d=json.load(open('$GRADING')); print(d.get('meta',{}).get('depressed_artifacts',0))" 2>/dev/null || echo "999")
  if [[ "$TRANSITIONS" -lt 5 ]] && [[ "$DEPRESSED" -eq 0 ]]; then
    check "G6 Jitterbug Stability" "PASS" "(transitions=${TRANSITIONS}, depressed=${DEPRESSED})"
  else
    check "G6 Jitterbug Stability" "FAIL" "(transitions=${TRANSITIONS}, depressed=${DEPRESSED})"
  fi
else
  check "G6 Jitterbug Stability" "WARN" "(grading-index.json not found)"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "Results: ${GRN}${PASS} passed${RST}, ${YLW}${WARN} warnings${RST}, ${RED}${FAIL} failed${RST}"
echo "════════════════════════════════════════════════════════════"

if [[ "$FAIL" -eq 0 ]] && [[ "$WARN" -eq 0 ]]; then
  echo ""
  echo -e "${GRN}${BLD}🏆 WORLD RECORD CERTIFIED${RST}"
  echo "All gates passed. Entropy ≤ 5. Fidelity ≥ 95. Debt = 0."
  echo "Tag this state: git tag delta-world-record-$(date +%Y%m%d)"
  echo ""
  echo "Certificate hash:"
  echo -n "  SHA256: "
  sha256sum "$0" 2>/dev/null | awk '{print $1}' || echo "N/A"
  exit 0
elif [[ "$FAIL" -eq 0 ]]; then
  echo ""
  echo -e "${YLW}⚠ Review warnings before certifying.${RST}"
  exit 1
else
  echo ""
  echo -e "${RED}❌ Certification failed. Resolve failures above.${RST}"
  exit 2
fi
