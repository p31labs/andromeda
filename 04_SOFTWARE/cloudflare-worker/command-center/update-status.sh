#!/bin/bash
# P31 Labs — Status Update Script (CWP-043)
# Usage: ./update-status.sh [path/to/status.json]
#
# Token (first match wins):
#   1) Environment variable COMMAND_CENTER_STATUS_TOKEN
#   2) ENV_FILE (default: repo-root .env.master)
set -e

STATUS_FILE="${1:-status.json}"
REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || true)"
DEFAULT_ENV="${REPO_ROOT:+$REPO_ROOT/}.env.master"
ENV_FILE="${ENV_FILE:-$DEFAULT_ENV}"

if [ ! -f "$STATUS_FILE" ]; then
  echo "Error: $STATUS_FILE not found"
  exit 1
fi

# Validate JSON
node -e "JSON.parse(require('fs').readFileSync('$STATUS_FILE','utf8'))" 2>/dev/null || {
  echo "Error: Invalid JSON in $STATUS_FILE"
  exit 1
}

# Extract token
if [ -n "${COMMAND_CENTER_STATUS_TOKEN:-}" ]; then
  TOKEN="$COMMAND_CENTER_STATUS_TOKEN"
elif [ -f "$ENV_FILE" ]; then
  TOKEN=$(grep '^COMMAND_CENTER_STATUS_TOKEN=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
else
  echo "Error: No token. Set COMMAND_CENTER_STATUS_TOKEN, or create $ENV_FILE with COMMAND_CENTER_STATUS_TOKEN=..."
  exit 1
fi
if [ -z "$TOKEN" ]; then
  echo "Error: COMMAND_CENTER_STATUS_TOKEN not found in $ENV_FILE (and env var empty)"
  exit 1
fi

echo "Pushing $STATUS_FILE to command-center..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  https://command-center.trimtab-signal.workers.dev/api/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @"$STATUS_FILE")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Status updated successfully"
  echo "  Dashboard: https://command-center.trimtab-signal.workers.dev"
else
  echo "✗ Failed (HTTP $HTTP_CODE): $BODY"
  exit 1
fi
