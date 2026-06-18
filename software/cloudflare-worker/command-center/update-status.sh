#!/bin/bash
# P31 Labs — Status Update Script (CWP-043) — with CF Access service-token support
# Usage: ./update-status.sh [path/to/status.json]
#
# Tries HTTP POST first (requires Access session or service token).
# Supports three auth modes:
#   1) Bearer token (COMMAND_CENTER_STATUS_TOKEN)
#   2) CF Access service token headers (CF_ACCESS_CLIENT_ID + CF_ACCESS_CLIENT_SECRET)
#   3) Falls back to wrangler KV direct write (requires wrangler login)
#
# Token resolution (first match wins for each path):
#   HTTP Bearer: COMMAND_CENTER_STATUS_TOKEN
#   Service token: CF_ACCESS_CLIENT_ID + CF_ACCESS_CLIENT_SECRET
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATUS_FILE="${1:-$SCRIPT_DIR/status.json}"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || true)"
DEFAULT_ENV="${REPO_ROOT:+$REPO_ROOT/}.env.master"
ENV_FILE="${ENV_FILE:-$DEFAULT_ENV}"

WRANGLER=""
for candidate in \
  "$REPO_ROOT/software/p31ca/node_modules/.bin/wrangler" \
  "$(command -v wrangler 2>/dev/null || true)"; do
  [ -x "$candidate" ] && { WRANGLER="$candidate"; break; }
done

KV_NAMESPACE_ID="ff890e80e7e64ae8b8afb59870f1a0f6"
KV_KEY="status"

if [ ! -f "$STATUS_FILE" ]; then
  echo "Error: $STATUS_FILE not found"
  exit 1
fi

node -e "JSON.parse(require('fs').readFileSync('$STATUS_FILE','utf8'))" 2>/dev/null || {
  echo "Error: Invalid JSON in $STATUS_FILE"
  exit 1
}

TOKEN=""
if [ -n "${COMMAND_CENTER_STATUS_TOKEN:-}" ]; then
  TOKEN="$COMMAND_CENTER_STATUS_TOKEN"
elif [ -f "$ENV_FILE" ]; then
  TOKEN=$(grep '^COMMAND_CENTER_STATUS_TOKEN=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
fi

CF_ACCESS_CLIENT_ID="${CF_ACCESS_CLIENT_ID:-}"
CF_ACCESS_CLIENT_SECRET="${CF_ACCESS_CLIENT_SECRET:-}"
if [ -z "$CF_ACCESS_CLIENT_ID" ] && [ -f "$ENV_FILE" ]; then
  CF_ACCESS_CLIENT_ID=$(grep '^CF_ACCESS_CLIENT_ID=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
  CF_ACCESS_CLIENT_SECRET=$(grep '^CF_ACCESS_CLIENT_SECRET=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
fi

AUTH_HEADERS=()
if [ -n "$TOKEN" ]; then
  AUTH_HEADERS+=(-H "Authorization: Bearer $TOKEN")
fi
if [ -n "$CF_ACCESS_CLIENT_ID" ] && [ -n "$CF_ACCESS_CLIENT_SECRET" ]; then
  AUTH_HEADERS+=(-H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID")
  AUTH_HEADERS+=(-H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET")
fi

HTTP_OK=false
if [ ${#AUTH_HEADERS[@]} -gt 0 ]; then
  echo "Trying HTTP POST to command-center…"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    https://command-center.trimtab-signal.workers.dev/api/status \
    "${AUTH_HEADERS[@]}" \
    -H "Content-Type: application/json" \
    -d @"$STATUS_FILE" \
    --max-time 15)
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ HTTP POST succeeded (HTTP 200)"
    HTTP_OK=true
  else
    echo "  HTTP returned $HTTP_CODE — falling back to wrangler KV write"
  fi
else
  echo "No token available — skipping HTTP POST, using wrangler KV write directly"
fi

if [ "$HTTP_OK" = "false" ]; then
  if [ -z "$WRANGLER" ]; then
    echo "Error: wrangler not found. Install with: npm i -g wrangler && wrangler login"
    exit 1
  fi
  echo "Writing $STATUS_FILE → KV '$KV_KEY' (ns: $KV_NAMESPACE_ID) via wrangler…"
  "$WRANGLER" kv key put \
    --namespace-id "$KV_NAMESPACE_ID" \
    "$KV_KEY" \
    --path "$STATUS_FILE" \
    --remote
  echo "✓ KV write succeeded"
fi

echo "  Dashboard: https://command-center.trimtab-signal.workers.dev"
