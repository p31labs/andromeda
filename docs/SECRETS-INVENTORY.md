# P31 Secrets Inventory
**Generated:** 2026-05-05  
**Source:** full codebase scan (`wrangler.toml`, `worker-allowlist.json`, source `env.*` refs, `.env.example`)  
**Master file:** `.env.master` (never committed — add secrets here, `bootstrap-secrets.sh` reads it)

---

## TIER 1 — Safety-critical (Ca²⁺ monitoring + payments)

| Secret | Worker | How to get | Set via |
|--------|--------|-----------|---------|
| `EPIC_CLIENT_ID` | `p31-fhir` (`api.p31ca.org/fhir/*`) | fhir.epic.com/developer → your app | `wrangler secret put EPIC_CLIENT_ID --env production` in `p31ca/workers/fhir/` |
| `EPIC_CLIENT_SECRET` | `p31-fhir` | fhir.epic.com/developer → app secret | same dir |
| `HA_WEBHOOK_CRITICAL` | `p31-fhir` | HA → Settings → Automations → create webhook trigger | same dir |
| `HA_WEBHOOK_WARNING` | `p31-fhir` | HA → Settings → Automations → create webhook trigger | same dir |
| `P31_API_SECRET` | `p31-fhir`, `p31-q-factor`, `command-center` | `openssl rand -hex 32` — shared auth token | all three workers |
| `P31_FHIR_SECRET` | `p31-q-factor`, `command-center` | same value as fhir's `P31_API_SECRET` | q-factor + command-center |
| `STRIPE_SECRET_KEY` | `donate-api` | Stripe Dashboard → Developers → API Keys → Secret key | `wrangler secret put STRIPE_SECRET_KEY` in `donate-api/` |
| `STRIPE_WEBHOOK_SECRET` | `donate-api` | Stripe Dashboard → Webhooks → endpoint → signing secret | same dir |

---

## TIER 2 — Platform integrity

| Secret | Worker | How to get | Set via |
|--------|--------|-----------|---------|
| `BOUNCER_GATE_TOKEN` | `p31-bouncer` | `openssl rand -hex 32` | `cloudflare-worker/bouncer/` |
| `CF_API_TOKEN` | `command-center` | Cloudflare Dashboard → My Profile → API Tokens → Edit Cloudflare Workers | `cloudflare-worker/command-center/` |
| `STATUS_TOKEN` | `command-center` | `openssl rand -hex 24` | same dir |
| `ADMIN_TOKEN` | `genesis-gate`, `k4-cage` | `openssl rand -hex 24` | each worker dir |
| `INTERNAL_FANOUT_TOKEN` | `k4-cage` (optional) | `openssl rand -hex 24` | `k4-cage/` |
| `HUBS_WRITE_TOKEN` | `k4-hubs`, `p31-agent-hub` | `openssl rand -hex 24` — same value both workers | both dirs |
| `HUB_LIVE_RELAY_SECRET` | `k4-hubs` | `openssl rand -hex 24` | `k4-hubs/` |
| `AUTH_TOKEN` | `kenosis-mesh` | **ROTATE** — old `kenosis-1743586400` is compromised (was plaintext in git) | `kenosis-mesh/` |
| `SIMPLEX_OPERATOR_SECRET` | `kenosis-mesh` | `openssl rand -hex 32` | `kenosis-mesh/` |
| `DISCORD_WEBHOOK_URL` | `donate-api`, `command-center`, `p31-forge`, mesh worker | Discord → Server → Integrations → Webhooks | each worker |

---

## TIER 3 — Feature completeness

| Secret | Worker | Source |
|--------|--------|--------|
| `FORGE_API_KEY` | `p31-forge` | `openssl rand -hex 32` |
| `DISCORD_WEBHOOK_SECRET` | `p31-forge` | Discord server webhook signing secret |
| `GITHUB_WEBHOOK_SECRET` | `p31-forge` | GitHub repo → Settings → Webhooks → secret |
| `KOFI_SECRET` | `p31-forge`, root `wrangler-kofi.toml` | Ko-fi Dashboard → Webhooks → secret |
| `GOOGLE_CLIENT_SECRET` | `p31-google-bridge` | Google Cloud Console → OAuth 2.0 Client |
| `AGENT_HUB_SECRET` | `p31-agent-hub` | `openssl rand -hex 32` |
| `OPERATOR_PUBLIC_KEY` | `k4-agent-hub` (home root) | DID signing key public half (Ed25519 base64url) |
| `M2M_BEARER_TOKEN` | `p31-node-zero-m2m` | `openssl rand -hex 32` |
| `DISCORD_PAYMENT_WEBHOOK_URL` | `p31-forge` | Discord payment channel webhook |
| `DISCORD_ACTIVITY_WEBHOOK_URL` | `p31-forge` | Discord activity channel webhook |

---

## TIER 4 — Social publishing

| Secret | Worker | Source |
|--------|--------|--------|
| `BLUESKY_HANDLE` | `p31-forge`, `p31-social-worker` | `p31labs.bsky.social` |
| `BLUESKY_APP_PASSWORD` | same | Bluesky Settings → Privacy & Security → App Passwords |
| `MASTODON_INSTANCE` | same | `fosstodon.org` |
| `MASTODON_ACCESS_TOKEN` | same | Fosstodon → Settings → Development → New Application |
| `TWITTER_API_KEY` | same | developer.twitter.com → project → app keys |
| `TWITTER_API_SECRET` | same | same |
| `TWITTER_ACCESS_TOKEN` | same | same (user context) |
| `TWITTER_ACCESS_TOKEN_SECRET` | same | same |
| `REDDIT_CLIENT_ID` | same | reddit.com/prefs/apps |
| `REDDIT_CLIENT_SECRET` | same | same |
| `REDDIT_USERNAME` | same | `u/p31labs` |
| `REDDIT_PASSWORD` | same | Reddit account password |
| `NOSTR_PRIVATE_KEY` | `p31-social-worker` | `openssl rand -hex 32` (nsec) |
| `NOSTR_RELAYS` | same | `wss://relay.damus.io,wss://nos.lol` |
| `SUBSTACK_API_KEY` | `p31-forge` | Substack → Settings → API |
| `DEVTO_API_KEY` | `p31-forge` | dev.to → Settings → Account → DEV Community API Keys |
| `HASHNODE_TOKEN` | `p31-forge` | Hashnode → Account Settings → Developer |
| `HASHNODE_PUBLICATION_ID` | `p31-forge` | Hashnode publication URL slug |
| `ZENODO_TOKEN` | `p31-forge` | zenodo.org → Account → Applications → Personal Access Tokens |

---

## Infrastructure gaps (not secrets, but blocks deploy)

| Item | Worker | Action |
|------|--------|--------|
| D1 `database_id` | `unified-k4-cage` (`wrangler.toml` has `REPLACE_WITH_YOUR_D1_DATABASE_ID`) | `npx wrangler d1 create p31-k4-cage-db` → paste ID into wrangler.toml |
| Meshtastic WiFi SSID | `05_FIRMWARE/meshtastic/p31-mesh-config.yaml` | Run `bash scripts/ignite-phase2.sh` in TTY |
| Meshtastic WiFi password | same | same |
| Meshtastic MQTT password | same | same |
| Postmoogle Gmail app password | `04_SOFTWARE/matrix/.env` | Google Account → Security → App Passwords → Mail |
| Backblaze B2 keys | `04_SOFTWARE/matrix/.env` | backblaze.com → App Keys → Create Application Key |
| Hetzner API token | `scripts/provision-matrix-vps.sh` | Hetzner Cloud Console → Security → API Tokens → Create |

---

## Security fix committed

`kenosis-mesh/wrangler.toml` — `AUTH_TOKEN = "kenosis-1743586400"` was plaintext in `[vars]` (committed to git).  
**Fixed:** removed from `[vars]`, added comment directing to `wrangler secret put`.  
**Action required:** rotate the token — the old value `kenosis-1743586400` is compromised.

```bash
cd 04_SOFTWARE/kenosis-mesh
NEW_TOKEN=$(openssl rand -hex 24)
echo "$NEW_TOKEN" | npx wrangler secret put AUTH_TOKEN
echo "New AUTH_TOKEN: $NEW_TOKEN  ← add to .env.master"
```

---

## bootstrap-secrets.sh coverage

`scripts/bootstrap-secrets.sh` currently auto-sets (reads from `.env.master`):

- `P31_API_SECRET` → q-factor + fhir
- `P31_FHIR_SECRET` → q-factor
- `EPIC_CLIENT_ID`, `EPIC_CLIENT_SECRET`, `HA_WEBHOOK_CRITICAL`, `HA_WEBHOOK_WARNING` → fhir
- `HA_LONG_LIVED_TOKEN` → meshtastic/ha-mqtt-bridge.yaml

**To add a secret to auto-bootstrap**, add to `.env.master`:
```
SECRET_NAME=value
```
Then add `set_secret "$WORKER_DIR" "SECRET_NAME"` to `scripts/bootstrap-secrets.sh`.
