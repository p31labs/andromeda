#!/bin/bash
# P31 Labs — End-to-End Dispute Flow Test
# Tests: Create dispute → List → Resolve
# Usage: ./scripts/e2e-dispute.sh

set -e

API_BASE="${K4_API:-https://k4-cage.trimtab-signal.workers.dev}"

PASS=0
FAIL=0

echo "🔍 E2E: Dispute Flow"
echo "===================="

# 1. Create dispute
echo ""
echo "⚖️  Step 1: Create Dispute"
DISPUTE_RESPONSE=$(curl -s -X POST "$API_BASE/api/dispute" \
  -H "Content-Type: application/json" \
  -d "{\"from\":\"will\",\"to\":\"christyn\",\"reason\":\"E2E test dispute $(date +%s)\",\"escrowAmount\":5}")

DISPUTE_ID=$(echo "$DISPUTE_RESPONSE" | jq -r '.dispute.id // empty' 2>/dev/null || echo "")
DISPUTE_STATUS=$(echo "$DISPUTE_RESPONSE" | jq -r '.dispute.status // empty' 2>/dev/null || echo "")

if [[ -n "$DISPUTE_ID" && "$DISPUTE_STATUS" == "escrow_locked" ]]; then
  echo "  ✅ Dispute created: $DISPUTE_ID (status: $DISPUTE_STATUS)"
  ((PASS++))
else
  echo "  ❌ Failed to create dispute"
  echo "  Response: $DISPUTE_RESPONSE"
  ((FAIL++))
fi

# 2. List disputes
echo ""
echo "📋 Step 2: List Disputes"
LIST_RESPONSE=$(curl -s "$API_BASE/api/disputes")
LIST_COUNT=$(echo "$LIST_RESPONSE" | jq -r '.count // 0' 2>/dev/null || echo "0")

if [[ "$LIST_COUNT" -gt 0 ]]; then
  echo "  ✅ Disputes found: $LIST_COUNT"
  ((PASS++))
else
  echo "  ❌ No disputes found"
  echo "  Response: $LIST_RESPONSE"
  ((FAIL++))
fi

# 3. Resolve dispute
echo ""
echo "✅ Step 3: Resolve Dispute"
RESOLVE_RESPONSE=$(curl -s -X POST "$API_BASE/api/dispute/$DISPUTE_ID/resolve" \
  -H "Content-Type: application/json" \
  -d "{\"resolvedBy\":\"will\",\"outcome\":\"resolved\"}")

RESOLVE_STATUS=$(echo "$RESOLVE_RESPONSE" | jq -r '.dispute.status // empty' 2>/dev/null || echo "")
if [[ "$RESOLVE_STATUS" == "resolved" ]]; then
  echo "  ✅ Dispute resolved"
  ((PASS++))
else
  echo "  ❌ Failed to resolve dispute"
  echo "  Response: $RESOLVE_RESPONSE"
  ((FAIL++))
fi

# Summary
echo ""
echo "======================="
echo "✅ Pass: $PASS | ❌ Fail: $FAIL"

if [[ $FAIL -gt 0 ]]; then
  echo "❌ E2E dispute FAILED"
  exit 1
fi

echo "✅ Dispute flow complete."
exit 0
