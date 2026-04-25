#!/bin/bash
# P31 Labs — Status Update Script (CWP-043)
# Usage: ./update-status.sh [path/to/status.json]
#
# Token sources (first match wins):
#   1) Environment variable COMMAND_CENTER_STATUS_TOKEN
#   2) ENV_FILE (default: repo-root .env.master or .env)
set -euo pipefail

STATUS_FILE="${1:-status.json}"
REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || true)"
DEFAULT_ENV="${REPO_ROOT:+$REPO_ROOT/}.env.master"
ENV_FILE="${ENV_FILE:-$DEFAULT_ENV}"

if [ ! -f "$STATUS_FILE" ]; then
  echo "❌ Error: $STATUS_FILE not found"
  exit 1
fi

# Validate JSON
node -e "JSON.parse(require('fs').readFileSync('$STATUS_FILE','utf8'))" 2>/dev/null || {
  echo "❌ Error: Invalid JSON in $STATUS_FILE"
  exit 1
}

# Extract token
if [ -n "${COMMAND_CENTER_STATUS_TOKEN:-}" ]; then
  TOKEN="$COMMAND_CENTER_STATUS_TOKEN"
elif [ -f "$ENV_FILE" ]; then
  TOKEN=$(grep '^COMMAND_CENTER_STATUS_TOKEN=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-)
elif [ -f "${REPO_ROOT}/.env" ]; then
  TOKEN=$(grep '^COMMAND_CENTER_STATUS_TOKEN=' "${REPO_ROOT}/.env" 2>/dev/null | head -1 | cut -d= -f2-)
fi

if [ -z "${TOKEN:-}" ]; then
  echo "❌ Error: COMMAND_CENTER_STATUS_TOKEN not found"
  echo "  Set COMMAND_CENTER_STATUS_TOKEN env var or add to $ENV_FILE"
  exit 1
fi

echo "📡 Pushing $STATUS_FILE to command-center..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  https://command-center.p31ca.org/api/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @"$STATUS_FILE")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Status updated successfully"
  echo "   Dashboard: https://command-center.p31ca.org"
  echo "   Health:    http://localhost:9090/health"
else
  echo "❌ Failed (HTTP $HTTP_CODE)"
  echo "   Response: $BODY"
  exit 1
fi