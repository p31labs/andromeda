 * Creates PayPal Checkout Orders and Subscriptions for phosphorus31.org/donate.
 * Secret key stored as CF secret (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET).
 *
 * Endpoints:
 *   POST /create-checkout  { amount, currency, mode, successUrl, cancelUrl [, p31_subject_id, turnstileToken] }
 *   → { approval_url }
 *   POST /paypal-webhook   PayPal event webhook (signature verified)
 */

/// <reference types="@cloudflare/workers-types" />

interface Env {
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
  PAYPAL_MODE: string;          // "sandbox" | "live"
  PAYPAL_WEBHOOK_ID: string;
  PAYPAL_PRODUCT_ID: string;
  TURNSTILE_SECRET: string;
  DISCORD_WEBHOOK_URL: string;  // https://webhook.p31ca.org/webhook/stripe
  ALLOWED_ORIGIN: string;
  GENESIS_GATE_URL?: string;    // https://genesis.p31ca.org (R09)
  /** Optional KV for PayPal event idempotency (CWP-P31-MAP D-MAP-3/5). */
// ── Helpers ──────────────────────────────────────────────────────────────────

  try {
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
    })?.catch(() => {});
  } catch {
    // never block the response
  }
}

interface CheckoutRequest {
  amount: number;       // cents (integer)
  /** Optional — p31.subjectIdDerivation/0.1.0 */
  p31_subject_id?: string;
  /** Cloudflare Turnstile token (bot protection) */
  turnstileToken?: string;
}

/** Aligned with `p31ca/public/lib/p31-subject-id.js` */
// ── PayPal API helpers ────────────────────────────────────────────────────────

function paypalApiBase(env: Env): string {
  return env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function getPayPalAccessToken(env: Env): Promise<string> {
  const auth = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`);
  const res = await fetch(`${paypalApiBase(env)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('PayPal token error:', res.status, err);
    throw new Error('Failed to obtain PayPal access token');
  }
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

async function validateTurnstile(token: string, env: Env): Promise<boolean> {
  if (!token) return false;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token }),
  });
  const data = await res.json() as { success: boolean };
  return data.success === true;
}

// Plan cache keyed on amount (in cents)
function getCachedPlanKey(amountCents: number): string {
  return `paypal:plan:${amountCents}`;
}

async function getOrCreatePlan(amountCents: number, env: Env): Promise<string> {
  const cacheKey = await getCachedPlanKey(amountCents);

  if (env.DONATE_EVENTS) {
    const cached = await env.DONATE_EVENTS.get(cacheKey);
    if (cached) return cached;
  }

  const accessToken = await getPayPalAccessToken(env);
  const dollars = (amountCents / 100).toFixed(2);
  const planBody = {
    product_id: env.PAYPAL_PRODUCT_ID,
    name: `Monthly Donation — $${dollars}`,
    billing_cycles: [
      {
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: dollars, currency_code: 'USD' } },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: null,
      setup_fee_failure_action: 'CONTINUE',
      payment_failure_threshold: 3,
    },
  };

  const res = await fetch(`${paypalApiBase(env)}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(planBody),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('PayPal plan creation error:', res.status, err);
    throw new Error('Failed to create PayPal billing plan');
  }

  const plan = await res.json() as { id: string };
  const planId = plan.id;

  if (env.DONATE_EVENTS) {
    await env.DONATE_EVENTS.put(cacheKey, planId, { expirationTtl: 60 * 60 * 24 * 365 });
  }

  return planId;
}

async function createPayPalOrder(
  amountCents: number,
  returnUrl: string,
  cancelUrl: string,
  env: Env,
): Promise<{ id: string; approvalUrl: string }> {
  const accessToken = await getPayPalAccessToken(env);
  const dollars = (amountCents / 100).toFixed(2);

  const res = await fetch(`${paypalApiBase(env)}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: dollars,
            breakdown: { item_total: { currency_code: 'USD', value: dollars } },
          },
          description: 'Donation to P31 Labs',
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: returnUrl,
            cancel_url: cancelUrl,
            user_action: 'commit',
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('PayPal order error:', res.status, err);
    throw new Error('Failed to create PayPal order');
  }

  const order = await res.json() as { id: string; links: { rel: string; href: string }[] };
  const approvalLink = order.links.find(l => l.rel === 'approve');
  if (!approvalLink) throw new Error('PayPal order missing approval link');

  return { id: order.id, approvalUrl: approvalLink.href };
}

async function createPayPalSubscription(
  amountCents: number,
  returnUrl: string,
  cancelUrl: string,
  env: Env,
): Promise<{ id: string; approvalUrl: string }> {
  const planId = await getOrCreatePlan(amountCents, env);
  const accessToken = await getPayPalAccessToken(env);

  const res = await fetch(`${paypalApiBase(env)}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan_id: planId,
      start_time: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        user_action: 'SUBSCRIBE_NOW',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('PayPal subscription error:', res.status, err);
    throw new Error('Failed to create PayPal subscription');
  }

  const sub = await res.json() as { id: string; links: { rel: string; href: string }[] };
  const approvalLink = sub.links.find(l => l.rel === 'approve');
  if (!approvalLink) throw new Error('PayPal subscription missing approval link');

  return { id: sub.id, approvalUrl: approvalLink.href };
}

async function capturePayPalOrder(orderId: string, env: Env): Promise<Record<string, unknown>> {
  const accessToken = await getPayPalAccessToken(env);
  const res = await fetch(`${paypalApiBase(env)}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('PayPal capture error:', res.status, err);
    throw new Error('Failed to capture PayPal order');
  }

  return res.json() as Promise<Record<string, unknown>>;
}

// ── PayPal webhook verification ──────────────────────────────────────────────

async function verifyPayPalWebhookSignature(request: Request, env: Env, rawBody: string): Promise<boolean> {
  const body = rawBody;
  const headers = Object.fromEntries(request.headers);

  const transmissionId = headers['paypal-transmission-id'] as string | undefined;
  const timestamp = headers['paypal-transmission-time'] as string | undefined;
  const certUrl = headers['paypal-cert-url'] as string | undefined;
  const authAlgo = headers['paypal-auth-algo'] as string | undefined;
  const transmissionSig = headers['paypal-transmission-sig'] as string | undefined;
  const webhookId = env.PAYPAL_WEBHOOK_ID;

  if (!transmissionId || !timestamp || !certUrl || !authAlgo || !transmissionSig || !webhookId) {
    console.error('PayPal webhook missing verification headers');
    return false;
  }

  const accessToken = await getPayPalAccessToken(env);
  const verifyRes = await fetch(`${paypalApiBase(env)}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: timestamp,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  });

  if (!verifyRes.ok) {
    console.error('PayPal webhook verify endpoint error:', verifyRes.status);
    return false;
  }

  const verifyData = await verifyRes.json() as { verification_status: string };
  return verifyData.verification_status === 'SUCCESS';
}

// ── Routes ───────────────────────────────────────────────────────────────────

      return handleCreateCheckout(request, env, headers);
    }

    if (url.pathname === '/paypal-webhook' && request.method === 'POST') {
      return handlePayPalWebhook(request, env);
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      return Response.json({
        status: 'ok',
        worker: 'donate-api',
        version: '2.0.0',
        processor: 'paypal',
        map: { checkoutSubjectBind: true, subjectIdSchema: 'p31.subjectIdDerivation/0.1.0', botProtection: 'turnstile' },
// ── POST /create-checkout ────────────────────────────────────────────────────

async function handleCreateCheckout(request: Request, env: Env, headers: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json() as CheckoutRequest;

    // Validate p31_subject_id if present
    const subjectCheck = validatedSubjectId(body.p31_subject_id);
    if (!subjectCheck.ok) {
      return Response.json({ error: subjectCheck.message }, { status: 400, headers });
    }

    // Validate amount
    if (!body.amount || body.amount < 100) {
      return Response.json({ error: 'Minimum donation is $1.00' }, { status: 400, headers });
    }
    if (body.amount > 99999900) {
      return Response.json({ error: 'Amount too large' }, { status: 400, headers });
    }

    // Validate mode
    if (body.mode !== 'once' && body.mode !== 'monthly') {
      return Response.json({ error: 'Invalid mode — must be "once" or "monthly"' }, { status: 400, headers });
    }

    // Validate Turnstile token (bot protection)
    if (!body.turnstileToken) {
      return Response.json({ error: 'Security check required' }, { status: 400, headers });
    }
    const turnstileOk = await validateTurnstile(body.turnstileToken, env);
    if (!turnstileOk) {
      return Response.json({ error: 'Security check failed' }, { status: 400, headers });
    }

    const returnUrl = body.successUrl || 'https://phosphorus31.org/donate?success=1';
    const cancelUrl = body.cancelUrl || 'https://phosphorus31.org/donate';

    let approvalUrl: string;
    let processorReference: string;

    try {
      if (body.mode === 'monthly') {
        const sub = await createPayPalSubscription(body.amount, returnUrl, cancelUrl, env);
        approvalUrl = sub.approvalUrl;
        processorReference = sub.id;
      } else {
        const order = await createPayPalOrder(body.amount, returnUrl, cancelUrl, env);
        approvalUrl = order.approvalUrl;
        processorReference = order.id;
      }
    } catch (e) {
      console.error('PayPal session creation failed:', e);
      return Response.json({ error: 'Payment processor unavailable' }, { status: 502, headers });
    }

    emitEvent(env, 'checkout_created', {
      processor: 'paypal',
      mode: body.mode,
      amount: body.amount,
      currency: body.currency || 'usd',
      p31_subject_id: subjectCheck.value ?? undefined,
      processor_ref: processorReference,
    });

    return Response.json({ approval_url: approvalUrl }, { headers });

  } catch (e) {
    console.error('Worker error:', e);
    return Response.json({ error: 'Internal error' }, { status: 500, headers });
  }
}

// ── POST /paypal-webhook ─────────────────────────────────────────────────────

async function handlePayPalWebhook(request: Request, env: Env): Promise<Response> {
  const rawBody = await request.text();

  // Verify PayPal webhook signature (body must be passed for verification)
  const isValid = await verifyPayPalWebhookSignature(request, env, rawBody);
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  const eventType = typeof event.event_type === 'string' ? event.event_type : null;

  if (env.DONATE_EVENTS && eventId) {
    const dedupKey = `paypal:event:${eventId}`;
  // Extract donation details from PayPal event payload
  let donationData: Record<string, unknown> | null = null;

  if (eventType === 'CHECKOUT.ORDER.APPROVED') {
    // One-time order approved — capture it now
    const resource = event.resource as Record<string, unknown> | undefined;
    const orderId = typeof resource?.id === 'string' ? resource.id : null;
    if (orderId) {
      try {
        const captured = await capturePayPalOrder(orderId, env);
        const payer = captured.payer as Record<string, unknown> | undefined;
        const email = typeof payer?.email_address === 'string' ? payer.email_address : undefined;
        const purchaseUnits = captured.purchase_units as Record<string, unknown>[] | undefined;
        const amount = purchaseUnits?.[0]?.amount as Record<string, unknown> | undefined;
        const value = typeof amount?.value === 'string' ? amount.value : undefined;
        const currency = typeof amount?.currency_code === 'string' ? amount.currency_code : undefined;

        donationData = {
          processor: 'paypal',
          event_type: eventType,
          order_id: orderId,
          capture_id: typeof captured.id === 'string' ? captured.id : undefined,
          amount: value,
          currency,
          email,
          status: captured.status,
          timestamp: captured.create_time || new Date().toISOString(),
        };
      } catch (e) {
        console.error('PayPal capture after ORDER.APPROVED failed:', e);
        // Don't fail the webhook — PayPal will retry
      }
    }
  } else if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
    // Payment capture completed (may arrive separately for some integrations)
    const resource = event.resource as Record<string, unknown> | undefined;
    const amount = resource?.amount as Record<string, unknown> | undefined;
    const payer = resource?.payer as Record<string, unknown> | undefined;
    donationData = {
      processor: 'paypal',
      event_type: eventType,
      capture_id: typeof resource?.id === 'string' ? resource.id : undefined,
      amount: typeof amount?.value === 'string' ? amount.value : undefined,
      currency: typeof amount?.currency_code === 'string' ? amount.currency_code : undefined,
      email: typeof payer?.email_address === 'string' ? payer.email_address : undefined,
      status: resource?.status,
      timestamp: resource?.create_time || new Date().toISOString(),
    };
  } else if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
    const resource = event.resource as Record<string, unknown> | undefined;
    const subscriber = resource?.subscriber as Record<string, unknown> | undefined;
    const payerInfo = subscriber?.payer_info as Record<string, unknown> | undefined;
    donationData = {
      processor: 'paypal',
      event_type: eventType,
      subscription_id: typeof resource?.id === 'string' ? resource.id : undefined,
      status: resource?.status,
      email: typeof payerInfo?.email === 'string' ? payerInfo.email : undefined,
      timestamp: resource?.start_time || new Date().toISOString(),
      mode: 'monthly',
    };
  } else if (eventType === 'PAYMENT.SALE.COMPLETED') {
    const resource = event.resource as Record<string, unknown> | undefined;
    const amount = resource?.amount as Record<string, unknown> | undefined;
    const payer = resource?.payer as Record<string, unknown> | undefined;
    donationData = {
      processor: 'paypal',
      event_type: eventType,
      sale_id: typeof resource?.id === 'string' ? resource.id : undefined,
      amount: typeof amount?.total === 'string' ? amount.total : typeof amount?.value === 'string' ? amount.value : undefined,
      currency: typeof amount?.currency === 'string' ? amount.currency : undefined,
      email: typeof payer?.email === 'string' ? payer.email : undefined,
      status: resource?.state,
      timestamp: resource?.create_time || new Date().toISOString(),
      mode: 'monthly',
    };
  }

  // Process donation if we have data
  if (donationData && env.DISCORD_WEBHOOK_URL) {
    try {
      const body = JSON.stringify({ ...event, _donation_data: donationData });
      const discordHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (env.P31_DISCORD_INGRESS_SECRET) {
        const hex = await hmacSha256Hex(env.P31_DISCORD_INGRESS_SECRET, body);
        discordHeaders['X-P31-Ingress-Signature'] = `sha256=${hex}`;
      }
      await fetch(env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: discordHeaders,
    }
  }

  if (donationData) {
    emitEvent(env, 'donation_processed', donationData);
  }

  if (env.DONATE_EVENTS && eventId) {
    try {
      await env.DONATE_EVENTS.put(`paypal:event:${eventId}`, new Date().toISOString(), {
        expirationTtl: 60 * 60 * 24 * 90,
