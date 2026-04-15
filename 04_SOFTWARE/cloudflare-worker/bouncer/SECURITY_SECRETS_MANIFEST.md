# P31 Security, Secrets, and Auth — Definitive Manifest

**Canonical machine-readable index:** `src/secrets-index.json` (bundled into the Worker; edit + redeploy to update the live index).  
**Bouncer Worker:** `src/index.js` — gate checks and public index API.

---

## 1. Rules (non-negotiable)

| Rule | Detail |
|------|--------|
| No secrets in git | `.env`, `.env.local`, `.env.master`, `.dev.vars`, and **plaintext tokens in `wrangler.toml`** are forbidden. `.gitignore` already excludes common patterns. |
| Workers | Use `wrangler secret put SECRET_NAME`. Reference binding name in code as `env.SECRET_NAME`. |
| Vite / browser | Only `VITE_*` vars are exposed to the client — **never** put API secrets in `VITE_*`. |
| OAuth / webhooks | Prefer **signature verification** (GitHub HMAC, Discord Ed25519, Stripe signing secret) over shared static headers when the platform supports it. |
| Rotation | Any token that appeared in a committed doc, chat export, or handoff file must be **rotated** at the source (Ko-fi, Cloudflare, GitHub, etc.). |

---

## 2. Environment files present in the repo (examples only)

These are **templates** — copy to `.env` locally; do not commit filled copies.

| Path | Purpose |
|------|---------|
| `04_SOFTWARE/.env.example` | EDE monorepo (AI keys, Neo4j, IMAP, Sentry, Turbo, etc.) |
| `04_SOFTWARE/backend/.env.example` | FastAPI |
| `04_SOFTWARE/discord/p31-bot/.env.example` | Discord bot |
| `04_SOFTWARE/packages/oracle-terminal/.env.example` | Oracle terminal / Redis / Ollama |
| `04_SOFTWARE/spaceship-earth/.env.example` | Spaceship Earth |
| `ecosystem/discord/.env.example` | Ecosystem Discord |
| `p31labs/social-content-engine/.env.example` | Social content engine |

**Tests:** `04_SOFTWARE/bonding/.env.test`, `04_SOFTWARE/discord/p31-bot/.env.test` — test doubles only.

---

## 3. Cloudflare Workers — secret inventory (by package)

Secrets are **names only**. Set with `cd <package> && npx wrangler secret put <NAME>`.

### Core product / APIs

| Package | Secret names (representative) |
|---------|-------------------------------|
| `04_SOFTWARE/p31-forge` | `FORGE_API_KEY`, `GITHUB_WEBHOOK_SECRET`, `DISCORD_PUBLIC_KEY`, `KOFI_SECRET`, channel publish keys (Bluesky, Mastodon, Zenodo, Twitter, …), `DISCORD_*_WEBHOOK_URL` |
| `04_SOFTWARE/donate-api` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DISCORD_WEBHOOK_URL` |
| `04_SOFTWARE/k4-cage` | `ADMIN_TOKEN` |
| `04_SOFTWARE/k4-hubs` | `HUBS_WRITE_TOKEN`, `HUB_LIVE_RELAY_SECRET` (optional) |
| `04_SOFTWARE/genesis-gate` | `ADMIN_TOKEN` |
| `04_SOFTWARE/p31-state` | `SESSION_SECRET` (future session signing) |
| `04_SOFTWARE/kenosis-mesh` | `AUTH_TOKEN` — **must** be `wrangler secret put`, not `[vars]` |

### `cloudflare-worker/` family

| Package | Secret names |
|---------|--------------|
| `command-center` | `STATUS_TOKEN` (Bearer for `/api/status`, Cloud Hub), `CF_API_TOKEN` (Cloudflare API for hub UI) |
| `bash-agent`, `will-agent`, `willow-agent`, `christyn-agent` | `ADMIN_TOKEN` |
| `social-drop-automation`, `p31-social-engine` | Social stack: Discord webhook, Twitter, Reddit, Bluesky, Mastodon, Nostr, Substack (see each `wrangler.toml` comments) |
| `p31-sce-broadcaster` | Twitter app keys + Bearer |
| Root `cloudflare-worker` | `UPSTASH_TOKEN` (if used) |

### Other Workers (elsewhere in `04_SOFTWARE`)

See `secrets-index.json` → `workers[]` for the full grouped list.

---

## 4. Frontend (Vite) — public env vars

| Variable | Typical use |
|----------|----------------|
| `VITE_SENTRY_DSN` | Client error reporting (safe to expose DSN) |
| `VITE_RELAY_URL` | BONDING / mesh relay URL |
| `VITE_WS_AUTH_TOKEN` | **If set**, sent to WS — treat as sensitive in deployment; prefer short-lived tokens |

**Rule:** Anything that must stay private belongs in **server-side** Workers or backend env, not `VITE_*`.

---

## 5. “Login” and OAuth — how this repo actually works

There is **no** single end-user OAuth2 login server (no NextAuth-style session) spanning the monorepo. Instead:

- **Operator tools:** Bearer tokens (`ADMIN_TOKEN`, `STATUS_TOKEN`, `FORGE_API_KEY`, `AUTH_TOKEN` on kenosis, etc.).
- **Discord:** Bot uses **bot token** in `.env` (discord bot package); **Interactions** verification uses **`DISCORD_PUBLIC_KEY`** (Ed25519) on Workers.
- **GitHub:** Webhooks use **`GITHUB_WEBHOOK_SECRET`** + HMAC body verification (`p31-forge`).
- **Stripe / Ko-fi:** Dashboard-issued signing or verification tokens (`STRIPE_WEBHOOK_SECRET`, `KOFI_SECRET`).
- **Social APIs:** OAuth-style **app credentials** (Twitter, Reddit, etc.) stored as Wrangler secrets where posting Workers exist — see `SOCIAL_API_SETUP.md`.

---

## 6. Bouncer Worker (`bouncer/`)

Purpose: a **small, auditable gate** and **read-only** API for `secrets-index.json`.

| Route | Auth | Behavior |
|-------|------|------------|
| `GET /health` | None | Liveness |
| `GET /v1/secrets-index` | None | Returns `secrets-index.json` (names/metadata only) |
| `GET /v1/gate` | `Authorization: Bearer <BOUNCER_GATE_TOKEN>` | `200` if token matches secret; `401` otherwise |

Set **`BOUNCER_GATE_TOKEN`** with `wrangler secret put BOUNCER_GATE_TOKEN`.  
Use `/v1/gate` to verify automation or sibling Workers have the correct token **without** exposing other secrets.

### CI and local automation

| Mechanism | What it does |
|-----------|----------------|
| **Bootstrap GitHub secrets from laptop** | One-time: `gh auth login`, then from repo root `pnpm run automate:bootstrap` (reads `.env.master` → `gh secret set` for `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `BOUNCER_GATE_TOKEN` when present). Script: `04_SOFTWARE/scripts/sync-github-secrets.mjs`. |
| `.github/workflows/p31-automation.yml` | PR/push: tests + docs build + link check (**optional** fleet URLs warn-only — no manual ignore-list cleanup). Deploy jobs: optional step **pipes `secrets.BOUNCER_GATE_TOKEN` → `wrangler secret put`** before `deploy` so the gate token stays synced without local wrangler. Requires `CLOUDFLARE_*` in GitHub; `BOUNCER_GATE_TOKEN` there is optional but recommended for hands-off deploys. |
| `04_SOFTWARE/scripts/automate-all.mjs` | `verify` / `deploy-edge` / `deploy-docs` — `pnpm run automate:*` from `04_SOFTWARE`. |
| `command-center/update-status.ps1` / `update-status.sh` | Pushes `status.json` to KV (`COMMAND_CENTER_STATUS_TOKEN` in repo-root `.env.master` — not synced by bootstrap script unless you extend `sync-github-secrets.mjs`). |

---

## 7. Known hygiene issues (track to closure)

1. **`kenosis-mesh`:** Plaintext `AUTH_TOKEN` was removed from `wrangler.toml` — deploy with `wrangler secret put AUTH_TOKEN` and rotate the old value.
2. **`docs/SHIFT_REPORT_2026-03-31_HANDOFF.md`:** Contained a **Ko-fi verification token** — rotate in Ko-fi dashboard and redact from git history if the repo is public.
3. **Operator docs:** Any file that embeds live Bearer tokens should be treated as **compromised** for that token class; rotate and reference only `wrangler secret put` in canonical docs.

---

## 8. Related runbooks

| Doc | Topic |
|-----|--------|
| `04_SOFTWARE/cloudflare-worker/SOCIAL_API_SETUP.md` | Twitter, Reddit, Bluesky, Mastodon, Nostr secrets |
| `04_SOFTWARE/cloudflare-worker/SETUP.md` | Discord `DISCORD_PUBLIC_KEY`, Workers patterns |
| `04_SOFTWARE/p31-forge/wrangler.toml` | Forge + webhook secrets list |
| `04_SOFTWARE/cloudflare-worker/command-center/CLOUD_HUB.md` | `STATUS_TOKEN`, `CF_API_TOKEN` |
| `CWP-2026-002_.../SOP-03_Cryptographic_Hygiene.md` | Org-wide crypto hygiene |

---

*This file is the **single** narrative source for “where do secrets live?” The JSON index is for tools and the Bouncer Worker.*
