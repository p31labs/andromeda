#!/bin/bash
# P31 Labs — Rollback Script
# Usage: ./scripts/rollback.sh [--version-id VERSION_ID]

set -e

WORKER_DIR="workers/k4-core"
TARGET_VERSION="${1:-}"

echo "🔙 P31 Labs — Rollback"
echo "======================"

cd "$WORKER_DIR"

# If no version specified, list available versions
if [[ -z "$TARGET_VERSION" ]]; then
  echo "📋 Available versions:"
  npx wrangler versions list --format json | jq -r '.versions[] | "  \(.version_id)  \(.created_on)  \(.tags // "")"'
  echo ""
  echo "Usage: $0 --version-id <VERSION_ID>"
  exit 1
fi

echo "🔄 Rolling back to version: $TARGET_VERSION"
npx wrangler rollback --version-id "$TARGET_VERSION"

echo "✅ Rollback complete."
echo "🧪 Running smoke tests to verify..."
cd - > /dev/null
./scripts/smoke-test.sh

if [[ $? -eq 0 ]]; then
  echo "✅ Rollback successful — system operational."
else
  echo "❌ Smoke tests failed after rollback — manual intervention required."
  exit 1
fi
