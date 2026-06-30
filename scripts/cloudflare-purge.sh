#!/bin/bash
# P31 Labs — Cloudflare Orphaned Worker Purge — ICWP-001 Phase 1 (Optimized)
# Usage: ./scripts/cloudflare-purge.sh [--dry-run] [--force] [--parallel]

set -e

DRY_RUN=false
FORCE=false
PARALLEL=false
BATCH_SIZE=10

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run) DRY_RUN=true; shift ;;
    --force) FORCE=true; shift ;;
    --parallel) PARALLEL=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "🔴 P31 Cloudflare Purge — Starting"
if $DRY_RUN; then
  echo "⚠️  DRY RUN MODE — No workers will be deleted."
fi

# Count workers via Cloudflare API (no worker name required)
ACCOUNT_ID="ee05f70c889cb6f876b9925257e3a2fa"
COUNT_BEFORE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq '.result | length' 2>/dev/null || echo "0")
echo "📊 Workers before purge: $COUNT_BEFORE"

# Define workers to delete (same list)
DECOMMISSIONED="jitterbug-api k4-personal phos-ai-proxy spaceship-relay p31-hearing-ops social-dispatch posner-sync-fallback broadcast"
DUPLICATES="care-api-production events-queue-production p31-forge-production p31-sync-production p31-workers-production"
ORPHANED="affiliate-fleet airdrop-harvester auto-compounder backup-export bros-signaling btcpay-gateway buffer-worker capital-machine carrie-agent cashback-collector cashpilot-sync chump-edge contract-engine crypto-monitor dashboard data-monetization discord-alerter discord-bot events-queue fawn-guard fundraising-agent ip-licensing meatspace mesh-bridge mev-arbitrage micro-savings nft-royalties p31-access-gateway p31-api-gateway p31-bouncer p31-gateway p31-llm-proxy p31-mcp-server p31-push-notifications p31-q-factor-production p31-slicer p31-social-engine p31-spoon-bridge phos phos-api phos-atmosphere phos-oracle phos-voice-router phos-weave prediction-arb shadow-bridge simplex-email simplex-worker sovereign-justice-escrow sovereign-justice-evidence sovereign-justice-rag status-dashboard stripe-checkout stripe-webhook tetra-hub transient-mesh-gc yield-vault"

ALL_WORKERS="$DECOMMISSIONED $DUPLICATES $ORPHANED"
TOTAL=$(echo "$ALL_WORKERS" | wc -w)

echo "🗑️  Workers to delete: $TOTAL"
if ! $FORCE && ! $DRY_RUN; then
  echo "⚠️  This is destructive. Run with --force to proceed or --dry-run to preview."
  exit 1
fi

# Convert to array
WORKERS_ARRAY=($ALL_WORKERS)

# Deletion function
delete_worker() {
  local worker="$1"
  if $DRY_RUN; then
    echo "  [DRY RUN] Would delete: $worker"
  else
    echo "  Deleting $worker..."
    wrangler delete "$worker" --force 2>/dev/null || echo "    $worker already gone"
  fi
}

# Execute deletions
if $PARALLEL; then
  echo "⚡ Running deletions in parallel (batch size: $BATCH_SIZE)..."
  for ((i=0; i<${#WORKERS_ARRAY[@]}; i+=BATCH_SIZE)); do
    batch=("${WORKERS_ARRAY[@]:i:BATCH_SIZE}")
    for worker in "${batch[@]}"; do
      delete_worker "$worker" &
    done
    wait
  done
else
  for worker in "${WORKERS_ARRAY[@]}"; do
    delete_worker "$worker"
  done
fi

# Count workers after purge
COUNT_AFTER=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq '.result | length' 2>/dev/null || echo "0")
echo "📊 Workers after purge: $COUNT_AFTER"
echo "✅ Purge complete."