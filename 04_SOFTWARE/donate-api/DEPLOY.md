# Donate API Deployment Guide

**Monetary pipeline (full WBS, durable store, export, CI):** see **`../docs/CONTROLLED-WORK-PACKAGE-MONETARY-PIPELINE.md`** (`CWP-P31-MAP-2026-01`).

## Quick Deploy

```bash
cd 04_SOFTWARE/donate-api

# Deploy to Cloudflare Workers
npx wrangler deploy
```

## Domain Routing Setup (Cloudflare Dashboard)

After deploying, you need to route `donate-api.phosphorus31.org` to the worker:

1. **Go to Cloudflare Dashboard** → https://dash.cloudflare.com
2. **Select your domain** → `phosphorus31.org`
3. **Go to DNS** → Add a CNAME record:
   - **Name:** `donate-api`
   - **Content:** `donate-api.workers.dev`
   - **Proxy status:** Proxied (orange cloud)

4. **Go to Workers & Pages** → Click on `donate-api` → **Triggers**
5. **Add Custom Domain:**
   - Domain: `donate-api.phosphorus31.org`

## Verify Deployment

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

**Local / CI:** run `npm test` and from repo root `node scripts/verify-monetary-surface.mjs`.
