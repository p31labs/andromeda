#!/bin/bash
# P31 Discord Bot - Deployment Script
# Run: bash deploy.sh

set -e

echo "🔺 P31 Discord Bot Deployment"

# Build the TypeScript
echo "📦 Building TypeScript..."
cd "$(dirname "$0")"
npm run build

# Build and start Docker container
echo "🐳 Building Docker container..."
docker-compose build

echo "🚀 Starting bot..."
docker-compose up -d

echo "✅ Deployment complete!"
echo "   Bot should be online in ~10 seconds"
echo "   Webhook endpoint: http://localhost:3000"
