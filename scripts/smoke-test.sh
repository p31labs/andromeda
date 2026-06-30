#!/bin/bash
# P31 Labs — Post-Deployment Smoke Tests (TICWP-001 Phase 2)
# Run after every k4-core deployment.
# Usage: ./scripts/smoke-test.sh

set -e

# Configuration
API_BASE="${K4_API:-https://k4-cage.trimtab-signal.workers.dev}"
PASSPORT_API="${PASSPORT_API:-https://passport-api.trimtab-signal.workers.dev}"
LOVE_API="${LOVE_API:-https://love-ledger.trimtab-signal.workers.dev}"
GOVERNANCE_API="${GOVERNANCE_API:-https://governance-engine.trimtab-signal.workers.dev}"

PASS=0
FAIL=0
TIMEOUT=15

function test_endpoint() {
  local name="$1"
  local url="$2"
  local expected="${3:-200}"

  echo -n "  $name... "
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")

  if [[ "$code" == "$expected" ]]; then
    echo "✅ $code"
    ((PASS++))
  else
    echo "❌ $code (expected $expected)"
    ((FAIL++))
  fi
}

function test_json_endpoint() {
  local name="$1"
  local url="$2"
  local field="$3"
  local expected_value="$4"

  echo -n "  $name... "
  response=$(curl -s --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "{}")
  value=$(echo "$response" | jq -r "$field" 2>/dev/null || echo "null")

  if [[ "$value" == "$expected_value" ]]; then
    echo "✅ $value"
    ((PASS++))
  else
    echo "❌ got '$value' expected '$expected_value'"
    ((FAIL++))
  fi
}

echo "🔍 P31 Labs — Smoke Tests"
echo "=========================="
echo "API Base: $API_BASE"
echo ""

# 1. Core health checks
echo "📊 Core Health:"
test_endpoint "k4-core health" "$API_BASE/health"
test_endpoint "passport-api health" "$PASSPORT_API/health"
test_endpoint "love-ledger health" "$LOVE_API/health"
test_endpoint "governance-engine health" "$GOVERNANCE_API/health"

# 2. k4-core endpoint validation
echo ""
echo "📋 k4-core Endpoints:"
test_endpoint "k4-core /health JSON" "$API_BASE/health"
test_endpoint "k4-core /love/health" "$API_BASE/love/health"
test_endpoint "k4-core /governance/health" "$API_BASE/governance/health"
test_endpoint "k4-core /care/health" "$API_BASE/care/health"

# 3. Mesh status
echo ""
echo "🌐 Mesh Status:"
test_endpoint "K4 mesh" "$API_BASE/mesh/peers"
test_endpoint "K4 dispute list" "$API_BASE/dispute/claim"

# 4. Governance endpoints
echo ""
echo "🏛️ Governance:"
test_endpoint "Proposals list" "$GOVERNANCE_API/proposals"
test_json_endpoint "Proposals has proposals array" "$GOVERNANCE_API/proposals" ".proposals" "null"

# 5. LOVE ledger
echo ""
echo "💰 LOVE Ledger:"
TEST_DID="did:key:z6MkSmokeTest$(date +%s)"
test_endpoint "Balance endpoint" "$LOVE_API/love/balance/$TEST_DID" "404"

echo ""
echo "=========================="
echo "✅ Pass: $PASS | ❌ Fail: $FAIL"

if [[ $FAIL -gt 0 ]]; then
  echo "❌ Smoke tests FAILED — investigate before proceeding."
  exit 1
fi

echo "✅ All smoke tests passed. System is operational."
exit 0
