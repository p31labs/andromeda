# Stripe → PayPal + Cloudflare Turnstile Migration

## Deployment Status

- ✅ Worker code deployed (sandbox mode)
- ✅ KV namespace `DONATE_EVENTS` created and bound
- ✅ All 22 tests passing
- ✅ TypeScript compiles clean
- ⏳ Secrets pending (must be set before payments work)
- ⏳ PayPal app configuration pending
- ⏳ Cloudflare Turnstile configuration pending
- ⏳ Frontend rebuild pending (needs `PUBLIC_TURNSTILE_SITE_KEY`)

Worker URL: `https://donate-api.trimtab-signal.workers.dev`  
Version ID: `6a1db554-e081-4283-b483-512eda689457`  
KV Namespace ID: `66478f1b65ee4dc590d80f880604d43f`

---

## Step 1: Set Worker Secrets

Run these commands in `/home/p31/andromeda/software/donate-api/`. Each will prompt for a value.

```bash
# New PayPal + Turnstile secrets
npx wrangler secret put PAYPAL_CLIENT_ID
npx wrangler secret put PAYPAL_CLIENT_SECRET
npx wrangler secret put PAYPAL_WEBHOOK_ID
npx wrangler secret put PAYPAL_PRODUCT_ID
npx wrangler secret put TURNSTILE_SECRET

# Optional: remove old Stripe secrets (no longer used)
npx wrangler secret delete STRIPE_SECRET_KEY
npx wrangler secret delete STRIPE_WEBHOOK_SECRET
```

---

## Step 2: Configure PayPal Developer App

1. Go to <https://developer.paypal.com/>
2. Create a **REST API app** → copy **Client ID** and **Secret** (for secrets above)
3. Create a **Billing Product** (name: "P31 Labs Donations") → copy **Product ID**
4. Add a **webhook**:
   - URL: `https://donate-api.phosphorus31.org/paypal-webhook`
   - Events to subscribe:
     - `CHECKOUT.ORDER.APPROVED`
     - `PAYMENT.CAPTURE.COMPLETED`
     - `BILLING.SUBSCRIPTION.ACTIVATED`
     - `PAYMENT.SALE.COMPLETED`
   - Copy the **Webhook ID** from webhook details

---

## Step 3: Configure Cloudflare Turnstile

1. Go to <https://dash.cloudflare.com/?to=/:account/turnstile>
2. Create a new site (recommend "Managed" for nonprofit)
3. Copy the **Site Key** and **Secret**
   - **Site Key** → frontend env var: `PUBLIC_TURNSTILE_SITE_KEY`
   - **Secret** → Worker secret: `TURNSTILE_SECRET`

---

## Step 4: Frontend Environment

Add to your Astro build environment:

```
PUBLIC_TURNSTILE_SITE_KEY=<your-turnstile-site-key>
```

If using Cloudflare Pages, set this in **Settings → Environment Variables → Production**.

---

## Step 5: Rebuild & Deploy Frontend

```bash
cd /home/p31/andromeda/phosphorus31.org/planetary-planet
npm run build
# Deploy via your usual method (e.g., `wrangler pages deploy`, git push, etc.)
```

---

## Step 6: Switch to Production Mode

Once sandbox testing passes, edit `wrangler.toml`:

```toml
PAYPAL_MODE = "live"
```

Then redeploy:

```bash
cd /home/p31/andromeda/software/donate-api
npx wrangler deploy
```

---

## Step 7: Sandbox Testing Checklist

- [ ] Turnstile widget renders on `/donate`
- [ ] Turnstile validates before checkout (bots blocked)
- [ ] One-time donation redirects to PayPal sandbox
- [ ] Monthly subscription creates plan + redirects
- [ ] Webhook receives `CHECKOUT.ORDER.APPROVED` → captures order
- [ ] Webhook receives `PAYMENT.CAPTURE.COMPLETED` → logs donation
- [ ] Discord webhook receives forwarded events with `X-P31-Ingress-Signature`
- [ ] Genesis Gate receives `donation_processed` telemetry
- [ ] KV deduplication works (duplicate webhook returns `duplicate: true`)
- [ ] Health check returns `processor: "paypal"`

---

## Secrets Reference

| Secret | Source | Required |
|--------|--------|----------|
| `PAYPAL_CLIENT_ID` | PayPal REST API app | ✅ Yes |
| `PAYPAL_CLIENT_SECRET` | PayPal REST API app | ✅ Yes |
| `PAYPAL_WEBHOOK_ID` | PayPal webhook config | ✅ Yes |
| `PAYPAL_PRODUCT_ID` | PayPal Billing Product | ✅ Yes |
| `TURNSTILE_SECRET` | Cloudflare Turnstile | ✅ Yes |
| `DISCORD_WEBHOOK_URL` | Already set | ✅ Yes |
| `ALLOWED_ORIGIN` | Already set (`https://phosphorus31.org`) | ✅ Yes |
| `STRIPE_SECRET_KEY` | Old - can delete | ❌ No |
| `STRIPE_WEBHOOK_SECRET` | Old - can delete | ❌ No |

---

## Webhook Endpoint

```
POST https://donate-api.phosphorus31.org/paypal-webhook
```

PayPal sends events here. Worker verifies signature via PayPal's
`/v1/notifications/verify-webhook-signature` endpoint.

---

## Subscription Migration Note

Existing Stripe subscriptions cannot be migrated. Monthly donors must
re-subscribe via the new PayPal flow. Consider sending a notice to
existing subscribers before switching to live mode.

---

## Rollback

If issues arise in production:

```bash
npx wrangler versions list
npx wrangler rollback <version-id>
```

---

## Architecture

```
Browser → POST /create-checkout (+ Turnstile token)
         → Worker creates PayPal Order/Subscription
         → Returns approval_url
Browser redirects → PayPal hosted checkout
PayPal → POST /paypal-webhook (signed)
        → Worker verifies + processes
        → Discord + Genesis Gate + KV idempotency
```
