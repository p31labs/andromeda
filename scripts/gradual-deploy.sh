#!/bin/bash
# P31 Labs — Gradual Deployment Script (TICWP-001 Phase 4)
# Usage: ./scripts/gradual-deploy.sh [--percentage 10|25|50|100]

set -e

PERCENTAGE="${1:-10}"
WORKER_NAME="k4-core"
WORKER_DIR="workers/k4-core"

echo "🚀 Gradual Deployment: $WORKER_NAME"
echo "================================"
echo "Target percentage: $PERCENTAGE%"
echo ""

# 1. Upload new version without deploying
echo "📤 Step 1: Upload new version..."
cd "$WORKER_DIR"
VERSION_OUTPUT=$(npx wrangler versions upload 2>&1)
VERSION_ID=$(echo "$VERSION_OUTPUT" | grep -oP 'Version ID: \K[^\s]+' | head -1)

if [[ -z "$VERSION_ID" ]]; then
  echo "❌ Failed to upload version"
  echo "$VERSION_OUTPUT"
  exit 1
fi
echo "  ✅ Version uploaded: $VERSION_ID"

# 2. Get current version ID
echo ""
echo "📋 Step 2: Get current deployment..."
DEPLOYMENT_INFO=$(npx wrangler versions list --format json)
CURRENT_VERSION=$(echo "$DEPLOYMENT_INFO" | jq -r '.versions[0].version_id' 2>/dev/null || echo "")

if [[ -z "$CURRENT_VERSION" ]]; then
  echo "  ⚠️  No existing version found — will deploy new version at 100%"
  npx wrangler versions deploy --version-id "$VERSION_ID" --percentage 100
  echo "  ✅ Deployed at 100%"
  exit 0
fi
echo "  Current version: $CURRENT_VERSION"

# 3. Create gradual deployment
echo ""
echo "🔄 Step 3: Create gradual deployment ($PERCENTAGE% new)..."
npx wrangler versions deploy \
  --version-id "$VERSION_ID" \
  --percentage "$PERCENTAGE" \
  --version-id "$CURRENT_VERSION" \
  --percentage $((100 - PERCENTAGE))

echo "  ✅ Deployment created with $PERCENTAGE% traffic to new version"

# 4. Run smoke tests on new version
echo ""
echo "🧪 Step 4: Running smoke tests..."
cd - > /dev/null
./scripts/smoke-test.sh

if [[ $? -ne 0 ]]; then
  echo "❌ Smoke tests failed! Rolling back..."
  cd "$WORKER_DIR"
  npx wrangler rollback --version-id "$CURRENT_VERSION"
  echo "  ✅ Rolled back to $CURRENT_VERSION"
  exit 1
fi

echo "✅ Smoke tests passed."

# 5. If percentage < 100, prompt for full rollout
if [[ "$PERCENTAGE" -lt 100 ]]; then
  echo ""
  echo "📊 Deployment is at $PERCENTAGE% ($((100 - PERCENTAGE))% on old version)"
  echo "To progress to 100%, run:"
  echo "  cd $WORKER_DIR && npx wrangler versions deploy --percentage 100"
fi

echo ""
echo "✅ Gradual deployment complete."
