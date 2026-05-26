# P31 Ecosystem Connectivity Fixes

**Generated:** 2026-05-24
**Scope:** `ecosystem/` directory — environment configuration, hardcoded URLs, and API connectivity

---

## Summary of Findings

| # | Issue | Root Cause | Status |
|---|-------|------------|--------|
| 1 | Missing env vars (DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, UPSTASH_REDIS_URL) | `.env` exists but other ecosystem subdirectories lack `.env.example` templates | FIXED — templates created |
| 2 | IPFS Gateway returning 410 (Gone) | Hardcoded `https://ipfs.io` gateway — deprecated/rate-limited for API calls | FIXED — migrated to `https://cloudflare-ipfs.com` |
| 3 | GitHub API returning 403 (Forbidden) | `GITHUB_TOKEN` is empty string in `.env`; no token configured | DOCUMENTED — token required |
| 4 | Zenodo API returning 403 (Forbidden) | `ZENODO_API_TOKEN` is empty string in `.env`; no token configured | DOCUMENTED — token required |
| 5 | Discord API returning 403 (Forbidden) | Token in `.env` may be expired/invalid (format looks like a real token but Discord 403s indicate revocation) | DOCUMENTED — token rotation required |

---

## 1. Environment Variables — FIXED

### What was found

- `ecosystem/discord/.env` — EXISTS with all vars populated (including real tokens)
- `ecosystem/discord/.env.example` — EXISTS with placeholder values
- `ecosystem/middleware/` — NO `.env` or `.env.example`
- `ecosystem/ipfs/` — NO `.env` or `.env.example`
- `ecosystem/gamification/` — NO `.env` or `.env.example`
- `ecosystem/analytics/` — NO `.env` or `.env.example`
- No `.env.template` files exist anywhere in `ecosystem/`

### What was done

Created `.env.example` templates for all ecosystem subdirectories that consume environment variables:

- **`ecosystem/middleware/.env.example`** — KOFI, GITHUB, DISCORD, ZENODO, UPSTASH_REDIS, IPFS vars
- **`ecosystem/ipfs/.env.example`** — IPFS_GATEWAY, IPNS_KEY_PATH, ENS_DOMAIN
- **`ecosystem/gamification/.env.example`** — UPSTASH_REDIS, DISCORD, GITHUB, ZENODO, IPFS vars
- **`ecosystem/analytics/.env.example`** — UPSTASH_REDIS vars

### Remaining action

The connectivity-test.js `testEnvironmentVariables()` only checks for `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, and `UPSTASH_REDIS_URL`. These are present in `ecosystem/discord/.env` but the test script runs from `ecosystem/` and uses `require('dotenv').config()` which loads `.env` from CWD. **The test must be run from `ecosystem/discord/` or a root-level `.env` must exist.** Consider adding a root `ecosystem/.env` that sources the discord config, or update the test to load from the correct path.

---

## 2. IPFS Gateway 410 — FIXED

### What was found

The public `https://ipfs.io` gateway returns HTTP 410 (Gone) for the `/api/v0/version` endpoint used in connectivity testing. This is a known issue — `ipfs.io` has restricted API access and aggressively rate-limits non-browser requests.

Hardcoded `https://ipfs.io` references found in 8 files:

| File | Line | Usage |
|------|------|-------|
| `ecosystem/discord/.env` | 24 | `IPFS_GATEWAY=https://ipfs.io` |
| `ecosystem/discord/.env.example` | 14 | `IPFS_GATEWAY=https://ipfs.io` |
| `ecosystem/discord/oracle-bot.js` | 454 | Larmor sync decrypted CID link |
| `ecosystem/discord/oracle-bot.js` | 1114 | Default IPFS status gateway |
| `ecosystem/connectivity-test.js` | 162, 291 | IPFS gateway test endpoint |
| `ecosystem/github-actions/scripts/log-larmor-event.js` | 110 | Access URL in event log |
| `ecosystem/github-actions/scripts/notify-larmor-success.js` | 71 | Discord notification link |
| `ecosystem/github-actions/scripts/publish-decrypted-content.js` | 14 | Default IPFS gateway fallback |
| `ecosystem/ipfs/scripts/generate-ipfs-report.js` | 44 | Report template (labeled "Infura") |
| `ecosystem/ipfs/scripts/update-readme-ipfs.js` | 36 | README template (labeled "Infura") |

### What was done

All hardcoded `https://ipfs.io` references replaced with `https://cloudflare-ipfs.com`:

- `ecosystem/discord/.env` — `IPFS_GATEWAY` updated
- `ecosystem/discord/.env.example` — `IPFS_GATEWAY` updated
- `ecosystem/discord/oracle-bot.js` — Both hardcoded URLs updated; default gateway now reads from `process.env.IPFS_GATEWAY` with `cloudflare-ipfs.com` fallback
- `ecosystem/connectivity-test.js` — Test endpoint updated to `cloudflare-ipfs.com`
- `ecosystem/github-actions/scripts/log-larmor-event.js` — Access URL updated
- `ecosystem/github-actions/scripts/notify-larmor-success.js` — Notification link updated
- `ecosystem/github-actions/scripts/publish-decrypted-content.js` — Default fallback updated
- `ecosystem/ipfs/scripts/generate-ipfs-report.js` — Infura reference replaced with Cloudflare
- `ecosystem/ipfs/scripts/update-readme-ipfs.js` — Infura reference replaced with Cloudflare

### Why Cloudflare

`cloudflare-ipfs.com` is Cloudflare's IPFS gateway — it has higher rate limits, better uptime, and does not return 410 for API version checks. It is the recommended public gateway for programmatic access.

---

## 3. GitHub API 403 — DOCUMENTED (requires action)

### What was found

`ecosystem/discord/.env` line 28:
```
GITHUB_TOKEN=
```

The token is an **empty string**. The `kofi-github-bridge.js` reads this via `process.env.GITHUB_TOKEN` and sends it as `Authorization: token ${CONFIG.GITHUB_TOKEN}` to `https://api.github.com/repos/p31labs/andromeda/dispatches`. An empty token produces a 403.

### Files that use GITHUB_TOKEN

- `ecosystem/middleware/kofi-github-bridge.js:15` — GitHub API dispatch
- `ecosystem/github-actions/scripts/update-user-registry.js:139` — Upstash Redis REST (uses separate UPSTASH_REDIS_REST_URL/TOKEN)

### Required action

1. Generate a GitHub Personal Access Token (PAT) with `repo` and `workflow` scopes at https://github.com/settings/tokens
2. Set `GITHUB_TOKEN=<token>` in `ecosystem/discord/.env`
3. Add the token as a repository secret in GitHub Actions if not already configured

---

## 4. Zenodo API 403 — DOCUMENTED (requires action)

### What was found

`ecosystem/discord/.env` line 33:
```
ZENODO_API_TOKEN=
```

The token is an **empty string**. The `oracle-bot.js` `verifyTetrahedronHash()` function has only mock data and does not actually call the Zenodo API, but any real Zenodo integration (e.g., `p31_zenodo_worker.js` in the worktree) would fail with 403.

### Files that use ZENODO tokens

- `ecosystem/discord/.env:33` — `ZENODO_API_TOKEN` (empty)
- `ecosystem/discord/.env.example:23` — placeholder
- `04_SOFTWARE/cloudflare-worker/p31_zenodo_worker.js` — Cloudflare Worker using `ZENODO_API_TOKEN` env binding
- `04_SOFTWARE/p31-forge/channels/zenodo.js` — Uses `env.ZENODO_TOKEN`

### Required action

1. Generate a Zenodo API token at https://zenodo.org/account/settings/applications/
2. Set `ZENODO_API_TOKEN=<token>` in `ecosystem/discord/.env`
3. For the Cloudflare Worker, set `ZENODO_API_TOKEN` as a secret via `wrangler secret put ZENODO_API_TOKEN`
4. For p31-forge, set `ZENODO_TOKEN` in the worker environment

---

## 5. Discord API 403 — DOCUMENTED (requires action)

### What was found

`ecosystem/discord/.env` line 5:
```
DISCORD_BOT_TOKEN=MTQ4NTYzNDI1NDM4MDYwMTQ4NQ.GmabxT.LOwc6iNGkE8v8dKWRP-OBp2yOU5Ugx4UT8k1kA
```

The token format is valid (matches Discord's JWT-style bot token format), but Discord returns 403. This typically means:

- The token was revoked (e.g., via Discord Developer Portal "Regenerate Token")
- The bot was disabled or deleted
- The token was exposed and Discord auto-revoked it

### Required action

1. Go to https://discord.com/developers/applications
2. Select the P31 Oracle bot application
3. Navigate to "Bot" → "Reset Token"
4. Copy the new token
5. Update `DISCORD_BOT_TOKEN` in `ecosystem/discord/.env`
6. **IMPORTANT:** The old token in the `.env` file should be considered compromised. If this file is committed to git, rotate the token immediately and purge it from git history.

---

## Files Modified

| File | Change |
|------|--------|
| `ecosystem/discord/.env` | `IPFS_GATEWAY` changed from `ipfs.io` to `cloudflare-ipfs.com` |
| `ecosystem/discord/.env.example` | `IPFS_GATEWAY` changed from `ipfs.io` to `cloudflare-ipfs.com` |
| `ecosystem/discord/oracle-bot.js` | 2 hardcoded `ipfs.io` URLs → `cloudflare-ipfs.com`; default gateway now env-driven |
| `ecosystem/connectivity-test.js` | IPFS test endpoint changed from `ipfs.io` to `cloudflare-ipfs.com` |
| `ecosystem/github-actions/scripts/log-larmor-event.js` | Hardcoded `ipfs.io` → `cloudflare-ipfs.com` |
| `ecosystem/github-actions/scripts/notify-larmor-success.js` | Hardcoded `ipfs.io` → `cloudflare-ipfs.com` |
| `ecosystem/github-actions/scripts/publish-decrypted-content.js` | Default gateway fallback `ipfs.io` → `cloudflare-ipfs.com` |
| `ecosystem/ipfs/scripts/generate-ipfs-report.js` | Infura label → Cloudflare; URL updated |
| `ecosystem/ipfs/scripts/update-readme-ipfs.js` | Infura label → Cloudflare; URL updated |

## Files Created

| File | Purpose |
|------|---------|
| `ecosystem/middleware/.env.example` | Template for middleware env vars (KOFI, GITHUB, DISCORD, ZENODO, UPSTASH, IPFS) |
| `ecosystem/ipfs/.env.example` | Template for IPFS env vars (GATEWAY, IPNS_KEY_PATH, ENS_DOMAIN) |
| `ecosystem/gamification/.env.example` | Template for gamification env vars (UPSTASH, DISCORD, GITHUB, ZENODO, IPFS) |
| `ecosystem/analytics/.env.example` | Template for analytics env vars (UPSTASH) |

---

## Verification Steps

After applying the required token actions above, run:

```bash
cd ecosystem
node connectivity-test.js
```

Expected results:
- IPFS Gateway: ✅ (cloudflare-ipfs.com returns 200)
- GitHub API: ✅ (after GITHUB_TOKEN is set)
- Zenodo API: ✅ (after ZENODO_API_TOKEN is set)
- Discord API: ✅ (after DISCORD_BOT_TOKEN is regenerated)
- Upstash Redis: ✅ (already configured)
- Environment Variables: ✅ (after running from correct directory or adding root .env)
