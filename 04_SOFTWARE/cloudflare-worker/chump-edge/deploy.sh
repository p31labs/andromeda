#!/bin/bash
set -e

echo "🚀 Deploying CHUMP Edge Worker..."
npx wrangler deploy

echo ""
echo "✅ CHUMP Edge deployed!"
echo "   API:     https://chump-edge.trimtab-signal.workers.dev"
echo "   Stats:   https://chump-edge.trimtab-signal.workers.dev/api/stats"
echo "   Health:  https://chump-edge.trimtab-signal.workers.dev/api/health"
