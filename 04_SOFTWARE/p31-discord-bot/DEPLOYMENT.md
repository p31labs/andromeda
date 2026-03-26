# P31 Discord Bot - Deployment Guide

## Quick Start

### Option 1: Direct Node.js (Development)
```bash
cd 04_SOFTWARE/p31-discord-bot
cp .env.example .env
# Edit .env with your Discord token
npm install
npm run dev
```

### Option 2: PM2 (Production)
```bash
cd 04_SOFTWARE/p31-discord-bot
npm install -g pm2
npm run build
pm2 start ecosystem.config.js
pm2 save  # Save for restart on reboot
```

### Option 3: Docker
```bash
cd 04_SOFTWARE/p31-discord-bot
cp .env.example .env
# Edit .env with your Discord token
docker-compose up -d
```

## Commands
- `pm2 status` - Check bot status
- `pm2 logs p31-discord-bot` - View logs
- `pm2 restart p31-discord-bot` - Restart bot
- `pm2 stop p31-discord-bot` - Stop bot

## Webhook Endpoints
Once running, these endpoints are available:
- `POST /webhooks/bonding` - BONDING game events
- `POST /webhooks/node-one` - Node One hardware status
- `POST /webhooks/kofi` - Ko-fi donations
- `GET /health` - Health check

## Discord Commands
- `p31 status` - Check system health
- `p31 spoon` - View spoon economy
- `p31 bonding` - Access BONDING game
- `p31 help` - Get help
