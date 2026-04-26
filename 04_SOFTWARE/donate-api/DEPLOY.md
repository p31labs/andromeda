# Donate API Deployment Guide

**Monetary pipeline (full WBS, durable store, export, CI):** see **`../docs/CONTROLLED-WORK-PACKAGE-MONETARY-PIPELINE.md`** (`CWP-P31-MAP-2026-01`).

## Ground truth (this deployment)

| Surface | Value |
|--------|--------|
| **Default `workers.dev`** | `https://donate-api.trimtab-signal.workers.dev` (Worker name + account subdomain) |
| **Custom domain** | `donate-api.phosphorus31.org` |
| **Route** | `donate-api.phosphorus31.org/*` |

Health checks and glass probes use the **custom domain** URL: `https://donate-api.phosphorus31.org/health` (see home `p31-constants.json` / `p31-ecosystem.json`).

## Quick Deploy

```bash
cd 04_SOFTWARE/donate-api

# Deploy to Cloudflare Workers
npx wrangler deploy
```

## Domain routing (Cloudflare Dashboard)

After deploying, attach the org hostname to this Worker (same **Workers & Pages** flow you used):

1. **Workers & Pages** → **`donate-api`** → **Domains & Routes** (or **Triggers** + custom domain, depending on UI version).
2. **Custom domain:** `donate-api.phosphorus31.org` — should show a route like **`donate-api.phosphorus31.org/*`** to this Worker.
3. **Zone DNS** (`phosphorus31.org`): If Cloudflare does not auto-create a record, add a CNAME for **`donate-api`** → target **`donate-api.trimtab-signal.workers.dev`**, **Proxied** (orange cloud). (Do **not** use a generic `donate-api.workers.dev` target; the account-scoped `*.trimtab-signal.workers.dev` host matches the default Worker URL.)

4. The **`workers.dev`** host (`donate-api.trimtab-signal.workers.dev`) is for default-subdomain access; production clients and **MAP** verification should use **`https://donate-api.phosphorus31.org`**.

## Verify Deployment

**Static MAP gate (Andromedia repo root):** `node scripts/verify-monetary-surface.mjs` — `wrangler.toml`, worker routes, Phosphorus `donate.astro`, no `sk_*` in public trees, optional `../p31/p31-constants.json` cross-checks.

```bash
# Liveness (must match p31-constants payment.donateApiHealthUrl)
curl -sS -o /dev/null -w "%{http_code}\n" https://donate-api.phosphorus31.org/health
```

```bash
# Test the worker
curl -X POST https://donate-api.phosphorus31.org/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"amount": 2500, "currency": "usd", "mode": "once", "successUrl": "https://phosphorus31.org/donate?success=1", "cancelUrl": "https://phosphorus31.org/donate"}'
```

Expected response: `{"sessionId": "cs_..."}`

## Troubleshooting

- **Error 524:** Worker timeout - check worker logs in Cloudflare dashboard
- **CORS errors:** Verify ALLOWED_ORIGIN matches your domain exactly
- **404 on API:** Ensure you included `/create-checkout` in the URL

## Stripe Checkout Session

The worker creates Stripe Checkout Sessions. Make sure:
- Stripe secret key is set: `npx wrangler secret put STRIPE_SECRET_KEY`
- Use `sk_live_...` for production (starts with `sk_live_`)

## Optional: webhook idempotency (KV)

To deduplicate Stripe retries, create a KV namespace and uncomment `[[kv_namespaces]]` in `wrangler.toml`, then redeploy. Keys: `stripe:event:{eventId}` (90-day TTL).

**Package tests:** `npm test` in `04_SOFTWARE/donate-api`.
