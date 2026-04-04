/**
 * donate-api — Cloudflare Worker
 *
 * Creates Stripe Checkout Sessions for phosphorus31.org/donate.
 * Secret key stored as CF secret (STRIPE_SECRET_KEY).
 *
 * Endpoints:
 *   POST /create-checkout  { amount, currency, successUrl, cancelUrl }
 *   → { sessionId }
 */

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  DISCORD_WEBHOOK_URL: string;  // https://webhook.p31ca.org/webhook/stripe
  ALLOWED_ORIGIN: string;
  GENESIS_GATE_URL?: string;    // https://genesis.p31ca.org (R09)
}

// R09: Emit telemetry to Genesis Gate (fire-and-forget, never throws)
function emitEvent(env: Env, type: string, payload: Record<string, unknown>): void {
  const url = env.GENESIS_GATE_URL ?? 'https://genesis.p31ca.org';
  fetch(url + '/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'donate-api',
      type,
      payload,
      timestamp: new Date().toISOString(),
      session_id: 'worker-' + Math.random().toString(36).slice(2, 8),
    }),
  }).catch(() => { /* never block the response */ });
}

interface CheckoutRequest {
  amount: number;       // cents
  currency: string;     // "usd"
  mode: 'monthly' | 'once';
  successUrl: string;
  cancelUrl: string;
}

function corsHeaders(origin: string, allowed: string): Record<string, string> {
  const isAllowed = origin === allowed
    || origin === 'http://localhost:4321'  // astro dev
    || origin === 'http://localhost:3000';
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin, env.ALLOWED_ORIGIN);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);

    if (url.pathname === '/create-checkout' && request.method === 'POST') {
      try {
        const body = await request.json() as CheckoutRequest;

        // Validate
        if (!body.amount || body.amount < 100) {
          return Response.json({ error: 'Minimum donation is $1' }, { status: 400, headers });
        }
        if (body.amount > 99999900) {
          return Response.json({ error: 'Amount too large' }, { status: 400, headers });
        }

        // Determine payment mode (subscription for monthly, payment for one-time)
        const paymentMode = body.mode === 'monthly' ? 'subscription' : 'payment';

        // Create Stripe Checkout Session via REST API (no SDK needed)
        const params = new URLSearchParams();
        params.append('mode', paymentMode);
        params.append('line_items[0][price_data][currency]', body.currency || 'usd');
        params.append('line_items[0][price_data][product_data][name]', 'Donation to P31 Labs');
        params.append('line_items[0][price_data][product_data][description]', 'Supporting free assistive technology for neurodivergent families');
        params.append('line_items[0][price_data][unit_amount]', String(body.amount));
        params.append('line_items[0][quantity]', '1');

        // Add recurring interval for monthly donations
        if (body.mode === 'monthly') {
          params.append('line_items[0][price_data][recurring][interval]', 'month');
        }

        params.append('success_url', body.successUrl || 'https://phosphorus31.org/donate?success=1');
        params.append('cancel_url', body.cancelUrl || 'https://phosphorus31.org/donate');
        // submit_type only valid for mode=payment (not subscription)
        if (body.mode !== 'monthly') {
          params.append('submit_type', 'donate');
        }

        const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        if (!stripeRes.ok) {
          const err = await stripeRes.text();
          console.error('Stripe error:', err);
          return Response.json({ error: 'Failed to create checkout session' }, { status: 500, headers });
        }

        const session = await stripeRes.json() as { id: string };
        return Response.json({ sessionId: session.id }, { headers });

      } catch (e) {
        console.error('Worker error:', e);
        return Response.json({ error: 'Internal error' }, { status: 500, headers });
      }
    }

    if (url.pathname === '/stripe-webhook' && request.method === 'POST') {
      return handleStripeWebhook(request, env);
    }

    // Health check endpoint
    if (url.pathname === '/health' && request.method === 'GET') {
      return Response.json({
        status: 'ok',
        worker: 'donate-api',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }, { headers });
    }

    return Response.json({ error: 'Not found' }, { status: 404, headers });
  },
};

// ── Stripe webhook handler ──────────────────────────────────────────────────

async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  const sig = request.headers.get('stripe-signature');
  if (!sig || !env.STRIPE_WEBHOOK_SECRET) {
    return new Response('Webhook secret not configured', { status: 400 });
  }

  const rawBody = await request.text();

  // Verify HMAC-SHA256 signature (no SDK — Web Crypto API)
  const isValid = await verifyStripeSignature(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    return new Response('Invalid signature', { status: 400 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // R09: Emit donation_processed to Genesis Gate (no amount — privacy)
  if (event.type === 'checkout.session.completed') {
    emitEvent(env, 'donation_processed', { source: 'stripe', mode: (event.data as Record<string, unknown>)?.mode ?? 'unknown' });
  }

  // Forward checkout.session.completed to the Discord bot webhook (best-effort)
  if (event.type === 'checkout.session.completed' && env.DISCORD_WEBHOOK_URL) {
    try {
      await fetch(env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    } catch (e) {
      console.error('Failed to forward to Discord bot:', e);
      // Don't fail the Stripe webhook — just log
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
): Promise<boolean> {
  try {
    // Parse t= and v1= from the Stripe-Signature header
    const parts = Object.fromEntries(
      sigHeader.split(',').map(p => p.split('=') as [string, string])
    );
    const timestamp = parts['t'];
    const v1 = parts['v1'];
    if (!timestamp || !v1) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
    const computed = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return computed === v1;
  } catch {
    return false;
  }
}
