# P31 Social Media Integration Guide

## Overview

This guide documents the integration between the P31 Discord Bot and the P31 Social Worker (Cloudflare Worker) for automated multi-platform social media posting.

## Architecture

```
Discord Bot (p31-bot)          Social Worker (Cloudflare)          Platforms
              │                              │                        │
              │ 1. User Command             │                        │
              │─────────────────────────────>│                        │
              │                              │                        │
              │ 2. API Request              │                        │
              │─────────────────────────────>│                        │
              │                              │ 3. Platform API        │
              │                              │───────────────────────>│
              │                              │                        │
              │ 4. Results                  │                        │
              │<─────────────────────────────│                        │
              │                              │                        │
```

## Components

### 1. Discord Bot (`p31-bot`)
- **Location**: `04_SOFTWARE/discord/p31-bot/`
- **Commands**: `p31 social [subcommand]`
- **Features**: 
  - Template-based content creation
  - Multi-platform broadcasting
  - Wave scheduling
  - Analytics dashboard

### 2. Social Worker (`social-drop-automation`)
- **Location**: `04_SOFTWARE/cloudflare-worker/social-drop-automation/`
- **Platform**: Cloudflare Workers
- **Features**:
  - Twitter/X posting (OAuth 1.0a)
  - Reddit posting (OAuth 2.0)
  - Bluesky posting (AT Protocol)
  - Mastodon posting (Bearer token)
  - Substack posting (API)
  - Discord webhooks
  - Automated scheduling

## Discord Commands

### List Templates
```bash
p31 social templates
p31 social templates creation
```

### Create Post
```bash
p31 social create <template> [variables...]

# Examples:
p31 social create creation_code_drop project_name=MyApp feature=Auth language=TypeScript repo_link=https://github.com/me/app
p31 social create education_tutorial tutorial_title="Getting Started" steps_summary="Step 1..." difficulty="Easy" time_estimate="10 min"
```

### Dashboard
```bash
p31 social dashboard
```

### Broadcast
```bash
p31 social broadcast <message>
```

### List Waves
```bash
p31 social waves
```

### Trigger Wave
```bash
p31 social trigger <wave-name>
```

## Content Templates

### Creation Pillar (3 templates)
1. **Hardware Drop** - New hardware builds
2. **Code Drop** - Software releases
3. **Prototype Preview** - Upcoming projects

### Education Pillar (3 templates)
4. **Concept Explainer** - Technical concepts
5. **Tutorial** - Step-by-step guides
6. **Math/Physics** - Formula explanations

### Advocacy Pillar (3 templates)
7. **ADA Rights** - Disability advocacy
8. **Legal Update** - Court proceedings
9. **Systemic Issue** - Problem analysis

### Awareness Pillar (3 templates)
10. **Mission Declaration** - P31 mission
11. **Festival/Family** - Community events
12. **Status Update** - Project progress

## Platform Configuration

### Environment Variables

Set these secrets in the Social Worker:

```bash
cd 04_SOFTWARE/cloudflare-worker/social-drop-automation

# Discord
npx wrangler secret put DISCORD_WEBHOOK_URL

# Twitter/X
npx wrangler secret put TWITTER_API_KEY
npx wrangler secret put TWITTER_API_SECRET
npx wrangler secret put TWITTER_ACCESS_TOKEN
npx wrangler secret put TWITTER_ACCESS_TOKEN_SECRET

# Reddit
npx wrangler secret put REDDIT_CLIENT_ID
npx wrangler secret put REDDIT_CLIENT_SECRET
npx wrangler secret put REDDIT_USERNAME
npx wrangler secret put REDDIT_PASSWORD

# Bluesky
npx wrangler secret put BLUESKY_HANDLE
npx wrangler secret put BLUESKY_APP_PASSWORD

# Mastodon
npx wrangler secret put MASTODON_INSTANCE
npx wrangler secret put MASTODON_ACCESS_TOKEN

# Nostr (optional)
npx wrangler secret put NOSTR_PRIVATE_KEY

# Substack (optional)
npx wrangler secret put SUBSTACK_API_KEY
```

### Setup Script

Use the automated setup script:
```bash
cd 04_SOFTWARE/cloudflare-worker
bash setup-social-secrets.sh
```

## Deployment

### Deploy Social Worker
```bash
cd 04_SOFTWARE/cloudflare-worker/social-drop-automation
npx wrangler deploy
```

### Deploy Discord Bot
```bash
cd 04_SOFTWARE/discord/p31-bot
npm run build
npm start
```

## Testing

### Run Unit Tests
```bash
cd 04_SOFTWARE/discord/p31-bot
npm test
```

### Test Coverage
- Template system: ✅
- Command parsing: ✅
- API integration: ✅
- Content building: ✅
- Error handling: ✅

### Manual Testing

1. **Test Worker Status**
```bash
curl https://social.p31ca.org/status
```

2. **Test Wave List**
```bash
curl https://social.p31ca.org/waves
```

3. **Test Broadcast**
```bash
curl -X POST https://social.p31ca.org/broadcast \
  -H "Content-Type: application/json" \
  -d '{"content": "Test message", "platforms": ["twitter", "mastodon"]}'
```

## Scheduling

### Automated Waves

The worker runs on a daily cron schedule (17:00 UTC):

- **Monday**: Weekly social wave
- **Wednesday**: Mid-week update
- **Friday**: Weekend recap
- **Daily 17:20**: Ko-fi node count digest
- **1st of month 13:00**: Zenodo upload reminder

### Manual Scheduling

Use the Discord bot to trigger waves:
```bash
p31 social trigger weekly_update
```

## API Reference

### Endpoints

#### GET `/`
Health check and available endpoints

#### GET `/status`
Platform configuration status

#### GET `/waves`
List available content waves

#### POST `/broadcast`
Broadcast to platforms
```json
{
  "content": "Message text",
  "platforms": ["twitter", "mastodon", "bluesky"]
}
```

#### POST `/trigger`
Fire a specific wave
```json
{
  "wave": "weekly_update"
}
```

#### POST `/preflight`
Run link health check

## Troubleshooting

### Worker Offline
Check Cloudflare Worker status:
```bash
npx wrangler tail p31-social-worker
```

### Platform Authentication Failed
Verify secrets are set:
```bash
npx wrangler secret list
```

### Discord Bot Not Responding
Check bot permissions and intents:
- Message Content intent enabled
- Guilds and Guild Messages intents enabled

### Rate Limiting
Each platform has rate limits:
- Twitter: 300 posts/3 hours
- Reddit: Varies by karma
- Mastodon: 300 posts/hour
- Bluesky: Rate limits apply

## Security

### Legal Compliance
- All posts include necessary disclaimers
- Medical device compliance (FDA)
- ADA rights advocacy
- Privacy protection (no PII collection)

### Data Handling
- No user data collection
- No tracking cookies
- GDPR/CCPA compliant
- Open-source transparency

## Monitoring

### Metrics
- Post success/failure rates
- Platform connectivity
- Response times
- Error rates

### Logs
Cloudflare Worker logs available via:
```bash
npx wrangler tail p31-social-worker
```

## Contributing

### Adding New Templates
1. Add template to `social.ts` templates object
2. Add content builder in `buildContentFromTemplate`
3. Update documentation
4. Add tests

### Adding New Platforms
1. Implement `postTo<Platform>` function
2. Add to `broadcastToPlatforms`
3. Add configuration to worker
4. Update status endpoint

## License

AGPLv3 - See LICENSE file for details

## Support

- GitHub Issues: https://github.com/p31labs/issues
- Discord: https://discord.gg/p31
- Email: support@p31ca.org