# P31 Social Drop Automation — Deployment Guide

## What This Does

Cloudflare Worker with **11 scheduled cron triggers** that fire Discord webhook notifications with copy-paste-ready social media content at staggered times on March 26–31, 2026.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Cloudflare Worker: p31-social-drop-automation          │
│                                                         │
│  HTTP Endpoints:                                        │
│    GET  /          → Health check + wave list           │
│    POST /preflight → Manual link check                 │
│    POST /trigger   → Manual wave fire (testing)        │
│    GET  /waves     → List all available waves          │
│                                                         │
│  Scheduled Events (Cron Triggers):                      │
│    Mar 26 17:17 UTC → Pre-flight link check            │
│    Mar 26 17:20 UTC → Wave 1: Ko-fi                    │
│    Mar 26 17:35 UTC → Wave 2: X/Twitter                │
│    Mar 26 17:50 UTC → Wave 3: LinkedIn                 │
│    Mar 26 18:20 UTC → Wave 4: Reddit                   │
│    Mar 26 19:20 UTC → Wave 5: Personal/DMs            │
│    Mar 26 21:20 UTC → Wave 6: SuperStonk               │
│    Mar 27 13:00 UTC → Zenodo DP-5 + DP-1              │
│    Mar 27 17:20 UTC → 24hr analytics check             │
│    Mar 28 13:00 UTC → Zenodo DP-4 + DP-2              │
│    Mar 31 13:00 UTC → Zenodo DP-3                      │
│                                                         │
│  Output: Discord webhook → #social-drop channel        │
└─────────────────────────────────────────────────────────┘
```

## Deploy Steps

### 1. Install dependencies

```bash
cd 04_SOFTWARE/cloudflare-worker/social-drop-automation
npm install
```

### 2. Set Discord webhook secret

```bash
npx wrangler secret put DISCORD_WEBHOOK_URL
# Paste your Discord webhook URL when prompted
```

### 3. Deploy

```bash
npx wrangler deploy
```

### 4. Verify cron triggers

```bash
npx wrangler deployments list
```

## Manual Testing

### Test pre-flight link check
```bash
curl -X POST https://social-drop.p31ca.org/preflight
```

### Fire a specific wave manually
```bash
curl -X POST https://social-drop.p31ca.org/trigger \
  -H "Content-Type: application/json" \
  -d '{"wave": "wave1_kofi"}'
```

### List available waves
```bash
curl https://social-drop.p31ca.org/waves
```

### Health check
```bash
curl https://social-drop.p31ca.org/
```

## Available Wave IDs

| Wave ID | Content |
|---------|---------|
| `preflight` | Link check for all 5 URLs |
| `wave1_kofi` | Ko-fi post (copy-paste ready) |
| `wave2_twitter` | 5-tweet thread |
| `wave3_linkedin` | LinkedIn post |
| `wave4_reddit` | Reddit post (r/opensource) |
| `wave5_personal` | Festival family / personal DMs |
| `wave6_superstonk` | SuperStonk DD checklist |
| `zenodo_dp5_dp1` | Zenodo upload reminder |
| `zenodo_dp4_dp2` | Zenodo upload reminder |
| `zenodo_dp3` | Zenodo upload reminder |
| `analytics_24hr` | 24hr post-drop analytics checklist |

## Cron Schedule (EDT = UTC-4)

| Time (EDT) | Time (UTC) | Event |
|------------|-----------|-------|
| 1:17 PM | 17:17 | Pre-flight link check |
| 1:20 PM | 17:20 | Wave 1: Ko-fi |
| 1:35 PM | 17:35 | Wave 2: X/Twitter |
| 1:50 PM | 17:50 | Wave 3: LinkedIn |
| 2:20 PM | 18:20 | Wave 4: Reddit |
| 3:20 PM | 19:20 | Wave 5: Personal |
| 5:20 PM | 21:20 | Wave 6: SuperStonk |
| Mar 27 9:00 AM | 13:00 | Zenodo DP-5 + DP-1 |
| Mar 27 1:20 PM | 17:20 | 24hr analytics |
| Mar 28 9:00 AM | 13:00 | Zenodo DP-4 + DP-2 |
| Mar 31 9:00 AM | 13:00 | Zenodo DP-3 |

## If Discord Webhook Not Set

The worker logs all content to the Cloudflare Worker console logs instead. View with:

```bash
npx wrangler tail
```

## Route Configuration

The worker is routed to `social-drop.p31ca.org`. To change the route, edit `wrangler.toml`:

```toml
routes = [
  { pattern = "social-drop.p31ca.org/*", zone_name = "p31ca.org" }
]
```

## Source Files

- `worker.js` — All wave content + scheduled handler + HTTP handler
- `wrangler.toml` — Cron triggers + route config
- `package.json` — Dependencies
- `DEPLOY.md` — This file

## Content Source

All copy-paste content sourced from:
- [`docs/SOCIAL_DROP_LIVE.md`](../../../docs/SOCIAL_DROP_LIVE.md) — Waves 1-5
- [`docs/superstonk_post.md`](../../../docs/superstonk_post.md) — Wave 6
- [`docs/P31_Sprint_Deployment_Queue.md`](../../../docs/P31_Sprint_Deployment_Queue.md) — Zenodo schedule
