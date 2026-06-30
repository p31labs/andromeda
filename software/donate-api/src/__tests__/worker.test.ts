/// <reference types="@cloudflare/workers-types" />

// ── Types matching the worker ────────────────────────────────────────────────
interface Env {
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
  PAYPAL_MODE: string;
  PAYPAL_WEBHOOK_ID: string;
  PAYPAL_PRODUCT_ID: string;
  TURNSTILE_SECRET: string;
}

const env = {
  PAYPAL_CLIENT_ID: 'paypal_client_fake',
  PAYPAL_CLIENT_SECRET: 'paypal_secret_fake',
  PAYPAL_MODE: 'sandbox',
  PAYPAL_WEBHOOK_ID: 'webhook_fake',
  PAYPAL_PRODUCT_ID: 'PROD_fake',
  TURNSTILE_SECRET: 'turnstile_secret_fake',
} as const;

// ── Import worker after mocking global fetch ────────────────────────────────
function mockTurnstile() {
  mockFetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ success: true }), { status: 200 }),
  );
}

function mockPayPalOrderFlow(approvalUrl = 'https://www.sandbox.paypal.com/checkoutnow?token=test123') {
  mockTurnstile();
  mockFetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ access_token: 'access_fake' }), { status: 200 }),
  );
  mockFetch.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        id: 'ORDER_fake',
        links: [{ rel: 'approve', href: approvalUrl }],
      }),
      { status: 200 },
    ),
  );
}

// ── CORS preflight ──────────────────────────────────────────────────────────
// ── GET /health ────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns 200 JSON with status ok and processor paypal', async () => {
    const body = await res.json() as { status: string; worker: string; processor: string };
    expect(body.status).toBe('ok');
    expect(body.worker).toBe('donate-api');
    expect(body.processor).toBe('paypal');
  });
});

// ── 404 for unknown routes ──────────────────────────────────────────────────
// ── POST /create-checkout — validation ──────────────────────────────────────
      body: JSON.stringify({
        amount: 50,
        currency: 'usd',
        mode: 'once',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        turnstileToken: 'valid_token',
      }),
      body: JSON.stringify({
        amount: 100_000_000,
        currency: 'usd',
        mode: 'once',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        turnstileToken: 'valid_token',
      }),
  it('reflects Origin https://p31ca.org for CORS', async () => {
    mockPayPalOrderFlow();
        turnstileToken: 'valid_token',
    mockTurnstile();
        turnstileToken: 'valid_token',
  it('accepts valid u_* subject id', async () => {
    mockPayPalOrderFlow();
    const sid = 'u_' + 'a'.repeat(32);
        turnstileToken: 'valid_token',
  });

  it('rejects missing turnstile token', async () => {
    const worker = await getWorker();
    const req = new Request('https://example.com/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 500,
        currency: 'usd',
        mode: 'once',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      }),
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Security check required/);
  });

  it('rejects failed turnstile validation', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false }), { status: 200 }),
    );
    const worker = await getWorker();
    const req = new Request('https://example.com/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 500,
        currency: 'usd',
        mode: 'once',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        turnstileToken: 'invalid_token',
      }),
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Security check failed/);
      body: JSON.stringify({
        currency: 'usd',
        mode: 'once',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        turnstileToken: 'valid_token',
      }),
  it('allows localhost dev origin', async () => {
    mockPayPalOrderFlow();
      body: JSON.stringify({
        amount: 200,
        currency: 'usd',
        mode: 'once',
        successUrl: 'https://example.com/s',
        cancelUrl: 'https://example.com/c',
        turnstileToken: 'valid_token',
      }),
// ── POST /create-checkout — PayPal API calls ────────────────────────────────
describe('POST /create-checkout — PayPal integration', () => {
  it('creates one-time order and returns approval_url', async () => {
    mockPayPalOrderFlow();
    const worker = await getWorker();
    const req = new Request('https://example.com/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 500,
        currency: 'usd',
        mode: 'once',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        turnstileToken: 'valid_token',
      }),
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const body = await res.json() as { approval_url: string };
    expect(body.approval_url).toContain('paypal');
  });

  it('creates monthly subscription and returns approval_url', async () => {
    mockTurnstile();
    // getOrCreatePlan calls getPayPalAccessToken first
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'access_fake' }), { status: 200 }),
    );
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'P-Plan_fake',
          product_id: env.PAYPAL_PRODUCT_ID,
        }),
        { status: 201 },
      ),
    );
    // createPayPalSubscription calls getPayPalAccessToken again
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'access_fake' }), { status: 200 }),
    );
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'I-Sub_fake',
          links: [{ rel: 'approve', href: 'https://www.sandbox.paypal.com/webapps/billing/subscriptions?token=sub123' }],
        }),
        { status: 201 },
      ),
    );

    const worker = await getWorker();
    const req = new Request('https://example.com/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 1000,
        currency: 'usd',
        mode: 'monthly',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        turnstileToken: 'valid_token',
      }),
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const body = await res.json() as { approval_url: string };
    expect(body.approval_url).toContain('paypal');
  });

  it('returns 502 if PayPal token fetch fails', async () => {
    mockTurnstile();
    mockFetch.mockResolvedValueOnce(
      new Response('unauthorized', { status: 401 }),
    );
    const worker = await getWorker();
    const req = new Request('https://example.com/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 500,
        currency: 'usd',
        mode: 'once',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        turnstileToken: 'valid_token',
      }),
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(502);
  });

  it('returns 502 if PayPal order creation fails', async () => {
    mockTurnstile();
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'access_fake' }), { status: 200 }),
    );
    mockFetch.mockResolvedValueOnce(
      new Response('internal_error', { status: 500 }),
    );
    const worker = await getWorker();
    const req = new Request('https://example.com/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 500,
        currency: 'usd',
        mode: 'once',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        turnstileToken: 'valid_token',
      }),
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(502);
  });
});

// ── POST /paypal-webhook ────────────────────────────────────────────────────
describe('POST /paypal-webhook', () => {
  it('rejects request with no PayPal signature headers', async () => {
    const worker = await getWorker();
    const req = new Request('https://example.com/paypal-webhook', {
      method: 'POST',
      body: JSON.stringify({ event_type: 'PAYMENT.CAPTURE.COMPLETED' }),
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(401);
  });

  it('rejects invalid PayPal webhook signature', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'access_fake' }), { status: 200 }),
    );
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ verification_status: 'FAILURE' }), { status: 200 }),
    );
    const worker = await getWorker();
    const req = new Request('https://example.com/paypal-webhook', {
      method: 'POST',
      headers: {
        'paypal-transmission-id': 'txn_1',
        'paypal-transmission-time': new Date().toISOString(),
        'paypal-cert-url': 'https://api-m.sandbox.paypal.com/cert',
        'paypal-auth-algo': 'SHA256withRSA',
        'paypal-transmission-sig': 'badsig',
      },
      body: JSON.stringify({ event_type: 'PAYMENT.CAPTURE.COMPLETED' }),
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(401);
  });

  it('accepts valid PayPal webhook signature', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'access_fake' }), { status: 200 }),
    );
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ verification_status: 'SUCCESS' }), { status: 200 }),
    );
    mockFetch.mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const worker = await getWorker();
    const req = new Request('https://example.com/paypal-webhook', {
      method: 'POST',
      headers: {
        'paypal-transmission-id': 'txn_1',
        'paypal-transmission-time': new Date().toISOString(),
        'paypal-cert-url': 'https://api-m.sandbox.paypal.com/cert',
        'paypal-auth-algo': 'SHA256withRSA',
        'paypal-transmission-sig': 'goodsig',
      },
      body: JSON.stringify({
        id: 'evt_paypal_1',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'CAPTURE_fake',
          status: 'COMPLETED',
          amount: { value: '5.00', currency_code: 'USD' },
          create_time: new Date().toISOString(),
        },
      }),
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const body = await res.json() as { received: boolean };
    expect(body.received).toBe(true);
  });

  it('returns duplicate on second delivery of same event id', async () => {
    const storage = new Map<string, string>();
    const mockKV = {
      async get(k: string) { return storage.get(k) ?? null; },
      async put(k: string, v: string) { storage.set(k, v); },
    } as KVNamespace;

    const localEnv = {
      ...env,
      DONATE_EVENTS: mockKV,
    };

    const webhookHeaders = {
      'paypal-transmission-id': 'txn_idem',
      'paypal-transmission-time': new Date().toISOString(),
      'paypal-cert-url': 'https://api-m.sandbox.paypal.com/cert',
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-transmission-sig': 'goodsig',
    };
    const payload = JSON.stringify({
      id: 'evt_idem_1',
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: 'CAPTURE_idem',
        status: 'COMPLETED',
        amount: { value: '5.00', currency_code: 'USD' },
        create_time: new Date().toISOString(),
      },
    });

    // First delivery
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'access_fake' }), { status: 200 }),
    );
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ verification_status: 'SUCCESS' }), { status: 200 }),
    );
    mockFetch.mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const worker = await getWorker();
    const req1 = new Request('https://example.com/paypal-webhook', {
      method: 'POST',
      headers: webhookHeaders,
      body: payload,
    });
    const r1 = await worker.fetch(req1, localEnv);
    // Second delivery — need fresh mocks
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'access_fake' }), { status: 200 }),
    );
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ verification_status: 'SUCCESS' }), { status: 200 }),
    );
    mockFetch.mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const req2 = new Request('https://example.com/paypal-webhook', {
      method: 'POST',
      headers: { ...webhookHeaders, 'paypal-transmission-id': 'txn_idem_2' },
      body: payload,
    });

// ── CORS origin handling ────────────────────────────────────────────────────
describe('CORS origin', () => {
  it('allows localhost dev origin for create-checkout', async () => {
    mockPayPalOrderFlow();
    const worker = await getWorker();
    const req = new Request('https://example.com/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:4321',
      },
      body: JSON.stringify({
        amount: 200,
        currency: 'usd',
        mode: 'once',
        successUrl: 'https://example.com/s',
        cancelUrl: 'https://example.com/c',
        turnstileToken: 'valid_token',
      }),
    });
    const res = await worker.fetch(req, env);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:4321');
  });
});
