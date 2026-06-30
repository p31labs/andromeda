#!/bin/bash
# P31 Labs — End-to-End Governance Flow Test
# Tests: Create proposal → Vote → Execute
# Usage: ./scripts/e2e-governance.sh

set -e

GOVERNANCE_API="${GOVERNANCE_API:-https://governance-engine.trimtab-signal.workers.dev}"

PASS=0
FAIL=0

echo "🔍 E2E: Governance Flow"
echo "======================="

TEST_DID="did:key:z6MkGov$(date +%s)"
echo "  Test DID: $TEST_DID"

# 1. Create proposal
echo ""
echo "📝 Step 1: Create Proposal"
PROPOSAL_RESPONSE=$(curl -s -X POST "$GOVERNANCE_API/proposals" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"E2E Test Proposal $(date +%s)\",\"description\":\"Test governance flow\",\"param\":\"test\",\"target\":\"governance-engine\",\"creatorDid\":\"$TEST_DID\"}")

PROPOSAL_ID=$(echo "$PROPOSAL_RESPONSE" | jq -r '.proposal.id // empty' 2>/dev/null || echo "")
PROPOSAL_STATUS=$(echo "$PROPOSAL_RESPONSE" | jq -r '.proposal.status // empty' 2>/dev/null || echo "")

if [[ -n "$PROPOSAL_ID" && "$PROPOSAL_STATUS" == "active" ]]; then
  echo "  ✅ Proposal created: $PROPOSAL_ID"
  ((PASS++))
else
  echo "  ❌ Failed to create proposal"
  echo "  Response: $PROPOSAL_RESPONSE"
  ((FAIL++))
fi

# 2. Cast vote
echo ""
echo "🗳️  Step 2: Cast Vote"
VOTE_RESPONSE=$(curl -s -X POST "$GOVERNANCE_API/proposals/$PROPOSAL_ID/vote" \
  -H "Content-Type: application/json" \
  -d "{\"voterDid\":\"$TEST_DID\",\"vote\":\"yes\"}")

VOTE_OK=$(echo "$VOTE_RESPONSE" | jq -r '.ok // false' 2>/dev/null || echo "false")
if [[ "$VOTE_OK" == "true" ]]; then
  echo "  ✅ Vote cast: yes"
  ((PASS++))
else
  echo "  ❌ Failed to cast vote"
  echo "  Response: $VOTE_RESPONSE"
  ((FAIL++))
fi

# 3. Execute proposal
echo ""
echo "⚡ Step 3: Execute Proposal"
EXECUTE_RESPONSE=$(curl -s -X PATCH "$GOVERNANCE_API/proposals/$PROPOSAL_ID/execute")

EXECUTE_STATUS=$(echo "$EXECUTE_RESPONSE" | jq -r '.status // empty' 2>/dev/null || echo "")
if [[ "$EXECUTE_STATUS" == "passed" || "$EXECUTE_STATUS" == "executed" ]]; then
  echo "  ✅ Proposal executed: $EXECUTE_STATUS"
  ((PASS++))
else
  echo "  ❌ Failed to execute proposal"
  echo "  Response: $EXECUTE_RESPONSE"
  ((FAIL++))
fi

# Summary
echo ""
echo "======================="
echo "✅ Pass: $PASS | ❌ Fail: $FAIL"

if [[ $FAIL -gt 0 ]]; then
  echo "❌ E2E governance FAILED"
  exit 1
fi

echo "✅ Governance flow complete."
exit 0
