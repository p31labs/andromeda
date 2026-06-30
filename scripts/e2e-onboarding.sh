#!/bin/bash
# P31 Labs — End-to-End Onboarding Flow Test
# Tests: Passport → Settlement → LOVE mint
# Usage: ./scripts/e2e-onboarding.sh

set -e

API_BASE="${K4_API:-https://k4-cage.trimtab-signal.workers.dev}"
PASSPORT_API="${PASSPORT_API:-https://passport-api.trimtab-signal.workers.dev}"
LOVE_API="${LOVE_API:-https://love-ledger.trimtab-signal.workers.dev}"

PASS=0
FAIL=0

echo "🔍 E2E: Onboarding Flow"
echo "======================="

# Generate test DID (simulated — real flow uses Web Crypto)
TEST_DID="did:key:z6MkE2E$(date +%s)"
echo "  Test DID: $TEST_DID"

# 1. Create Settlement
echo ""
echo "📦 Step 1: Create Settlement"
RESPONSE=$(curl -s -X POST "$API_BASE/api/settlement" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"E2E Test Settlement $(date +%s)\",\"creatorVertex\":\"will\",\"creatorDid\":\"$TEST_DID\"}")

INVITE_CODE=$(echo "$RESPONSE" | jq -r '.settlement.inviteCode // empty' 2>/dev/null || echo "")
SETTLEMENT_ID=$(echo "$RESPONSE" | jq -r '.settlement.id // empty' 2>/dev/null || echo "")

if [[ -n "$INVITE_CODE" && "$INVITE_CODE" != "null" ]]; then
  echo "  ✅ Settlement created: $SETTLEMENT_ID"
  echo "  📋 Invite code: $INVITE_CODE"
  ((PASS++))
else
  echo "  ❌ Failed to create settlement"
  echo "  Response: $RESPONSE"
  ((FAIL++))
fi

# 2. Join Settlement (simulated)
echo ""
echo "🤝 Step 2: Join Settlement"
JOIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/settlement/join" \
  -H "Content-Type: application/json" \
  -d "{\"inviteCode\":\"$INVITE_CODE\",\"vertex\":\"christyn\",\"did\":\"did:key:z6MkJoin$(date +%s)\"}")

JOIN_STATUS=$(echo "$JOIN_RESPONSE" | jq -r '.settlement.vertices // [] | length' 2>/dev/null || echo "0")
if [[ "$JOIN_STATUS" -gt 1 ]]; then
  echo "  ✅ Joined settlement (vertices: $JOIN_STATUS)"
  ((PASS++))
else
  echo "  ❌ Failed to join settlement"
  echo "  Response: $JOIN_RESPONSE"
  ((FAIL++))
fi

# 3. Mint LOVE
echo ""
echo "💰 Step 3: Mint LOVE"
MINT_RESPONSE=$(curl -s -X POST "$LOVE_API/love/mint" \
  -H "Content-Type: application/json" \
  -d "{\"did\":\"$TEST_DID\",\"amount\":100,\"memo\":\"E2E onboarding test\"}")

NEW_BALANCE=$(echo "$MINT_RESPONSE" | jq -r '.newBalance // 0' 2>/dev/null || echo "0")
if [[ "$NEW_BALANCE" -gt 0 ]]; then
  echo "  ✅ LOVE minted: $NEW_BALANCE LOVE"
  ((PASS++))
else
  echo "  ❌ Failed to mint LOVE"
  echo "  Response: $MINT_RESPONSE"
  ((FAIL++))
fi

# Summary
echo ""
echo "======================="
echo "✅ Pass: $PASS | ❌ Fail: $FAIL"

if [[ $FAIL -gt 0 ]]; then
  echo "❌ E2E onboarding FAILED"
  exit 1
fi

echo "✅ Onboarding flow complete."
exit 0
