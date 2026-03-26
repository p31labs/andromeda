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
  ALLOWED_ORIGIN: string;
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
        params.append('submit_type', 'donate');

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

    return Response.json({ error: 'Not found' }, { status: 404, headers });
  },
};
