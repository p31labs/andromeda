#!/bin/bash
# P31 Social API Secret Setup Script
# Run from: 04_SOFTWARE/cloudflare-worker/

set -e

echo "=================================================="
echo "🔺 P31 SOCIAL API SECRET SETUP"
echo "=================================================="
echo ""

# Check we're in the right directory
if [ ! -f "wrangler.toml" ] && [ ! -d "social-drop-automation" ]; then
    echo "❌ Run this from 04_SOFTWARE/cloudflare-worker/"
    exit 1
fi

echo "Which worker are you configuring?"
echo "  1) social-drop-automation (wave reminders)"
echo "  2) p31-mesh-discord-worker (Discord bot)"
echo "  3) p31-social-broadcast-worker (multi-platform)"
echo ""
read -p "Choice [1]: " WORKER_CHOICE
WORKER_CHOICE=${WORKER_CHOICE:-1}

case $WORKER_CHOICE in
    1) WORKER_DIR="social-drop-automation" ;;
    2) WORKER_DIR="." ;;
    3) WORKER_DIR="." ;;
    *) echo "Invalid choice"; exit 1 ;;
esac

cd "$WORKER_DIR" 2>/dev/null || true

echo ""
echo "── Discord Webhook (recommended for all workers) ──"
read -p "Set Discord webhook? (y/n) [y]: " SET_DISCORD
SET_DISCORD=${SET_DISCORD:-y}
if [ "$SET_DISCORD" = "y" ]; then
    echo "Paste your Discord webhook URL:"
    npx wrangler secret put DISCORD_WEBHOOK_URL
    echo "✅ Discord webhook set"
fi

if [ "$WORKER_CHOICE" = "3" ]; then
    echo ""
    echo "── Twitter/X API ──"
    read -p "Set Twitter API keys? (y/n) [n]: " SET_TWITTER
    if [ "$SET_TWITTER" = "y" ]; then
        echo "Paste API Key:"
        npx wrangler secret put TWITTER_API_KEY
        echo "Paste API Secret:"
        npx wrangler secret put TWITTER_API_SECRET
        echo "Paste Access Token:"
        npx wrangler secret put TWITTER_ACCESS_TOKEN
        echo "Paste Access Token Secret:"
        npx wrangler secret put TWITTER_ACCESS_SECRET
        echo "✅ Twitter configured"
    fi

    echo ""
    echo "── Reddit API ──"
    read -p "Set Reddit API keys? (y/n) [n]: " SET_REDDIT
    if [ "$SET_REDDIT" = "y" ]; then
        echo "Paste Client ID:"
        npx wrangler secret put REDDIT_CLIENT_ID
        echo "Paste Client Secret:"
        npx wrangler secret put REDDIT_CLIENT_SECRET
        echo "Enter Reddit username:"
        npx wrangler secret put REDDIT_USERNAME
        echo "Enter Reddit password:"
        npx wrangler secret put REDDIT_PASSWORD
        echo "✅ Reddit configured"
    fi

    echo ""
    echo "── Mastodon (optional) ──"
    read -p "Set Mastodon keys? (y/n) [n]: " SET_MASTODON
    if [ "$SET_MASTODON" = "y" ]; then
        echo "Enter instance URL (e.g., https://mastodon.social):"
        npx wrangler secret put MASTODON_INSTANCE
        echo "Paste Access Token:"
        npx wrangler secret put MASTODON_ACCESS_TOKEN
        echo "✅ Mastodon configured"
    fi

    echo ""
    echo "── Bluesky (optional) ──"
    read -p "Set Bluesky keys? (y/n) [n]: " SET_BLUESKY
    if [ "$SET_BLUESKY" = "y" ]; then
        echo "Enter handle (e.g., p31labs.bsky.social):"
        npx wrangler secret put BLUESKY_HANDLE
        echo "Paste App Password:"
        npx wrangler secret put BLUESKY_APP_PASSWORD
        echo "✅ Bluesky configured"
    fi

    echo ""
    echo "── Nostr (optional) ──"
    read -p "Set Nostr keys? (y/n) [n]: " SET_NOSTR
    if [ "$SET_NOSTR" = "y" ]; then
        echo "Paste private key (hex):"
        npx wrangler secret put NOSTR_PRIVATE_KEY
        echo "✅ Nostr configured"
    fi
fi

echo ""
echo "=================================================="
echo "✅ SETUP COMPLETE"
echo "=================================================="
echo ""
echo "Verify with:"
echo "  npx wrangler secret list"
echo ""
echo "Deploy with:"
echo "  npx wrangler deploy"
echo ""
