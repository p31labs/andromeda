import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../src/index';
import { makeEnv, makeRequest } from './helpers';

const mockGlobalFetch = (handler: (input: RequestInfo | URL, init?: RequestInit | undefined) => Promise<Response>) => {
  global.fetch = handler as typeof fetch;
};

describe('genesis-gate', () => {
  let worker: { fetch: (request: Request, env: Env) => Promise<Response> };

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
    global.fetch = (() => { throw 'unexpected fetch'; }) as typeof fetch;
    const mod = await import('../src/index');
    worker = mod.default;
  });

  describe('OPTIONS — CORS preflight', () => {
    it('returns 204 with CORS headers', async () => {
      const env = makeEnv();
      const req = makeRequest('OPTIONS', '/event', {
        headers: { Origin: 'https://p31ca.org' },
      });

      const res = await worker.fetch(req, env);

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://p31ca.org');
      expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
      expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
      expect(res.headers.get('Access-Control-Max-Age')).toBe('86400');
      expect(res.headers.get('Vary')).toBe('Origin');
    });

    it('rejects non-allowed origins', async () => {
      const env = makeEnv();
      const req = makeRequest('OPTIONS', '/event', {
        headers: { Origin: 'https://evil.com' },
      });

      const res = await worker.fetch(req, env);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://p31ca.org');
    });

    it('allows localhost origins', async () => {
      const env = makeEnv();
      const req = makeRequest('OPTIONS', '/event', {
        headers: { Origin: 'http://localhost:3000' },
      });

      const res = await worker.fetch(req, env);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    });
  });

  describe('POST /event — ingest', () => {
    it('accepts a valid event and returns 201', async () => {
      const env = makeEnv();
      const req = makeRequest('POST', '/event', {
        body: {
          source: 'test-suite',
          type: 'code_run',
          payload: { test: true, suite: 'genesis-gate' },
          session_id: 'tritest-001',
          timestamp: '2026-04-14T12:00:00.000Z',
        },
      });

      const res = await worker.fetch(req, env);
      const body = await res.json() as Record<string, unknown>;

      expect(res.status).toBe(201);
      expect(body.ok).toBe(true);
      expect(body.timestamp).toBe('2026-04-14T12:00:00.000Z');
    });

    it('defaults timestamp to current time when omitted', async () => {
      const env = makeEnv();
      const before = Date.now();
      const req = makeRequest('POST', '/event', {
        body: {
          source: 'test-suite',
          type: 'page_view',
          payload: {},
          session_id: 'tritest-002',
        },
      });

      const res = await worker.fetch(req, env);
      const body = await res.json() as Record<string, unknown>;

      expect(res.status).toBe(201);
      const ts = new Date(body.timestamp as string).getTime();
      expect(ts).toBeGreaterThanOrEqual(before - 1000);
      expect(ts).toBeLessThanOrEqual(Date.now() + 1000);
    });

    it('accepts unknown event types with console warning', async () => {
      const env = makeEnv();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const req = makeRequest('POST', '/event', {
        body: {
          source: 'test-suite',
          type: 'unknown_type_xyz',
          payload: {},
          session_id: 'tritest-003',
        },
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(201);
      expect(warnSpy).toHaveBeenCalledWith('[genesis-gate] Unknown event type: unknown_type_xyz');
      warnSpy.mockRestore();
    });

    it('rejects missing required fields (source)', async () => {
      const env = makeEnv();
      const req = makeRequest('POST', '/event', {
        body: {
          type: 'page_view',
          session_id: 'tritest-004',
        },
      });

      const res = await worker.fetch(req, env);
      const body = await res.json() as Record<string, unknown>;

      expect(res.status).toBe(400);
      expect(body.error).toBe('Missing required fields: source, type, session_id');
    });

    it('rejects missing required fields (type)', async () => {
      const env = makeEnv();
      const req = makeRequest('POST', '/event', {
        body: {
          source: 'test-suite',
          session_id: 'tritest-005',
        },
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(400);
    });

    it('rejects missing required fields (session_id)', async () => {
      const env = makeEnv();
      const req = makeRequest('POST', '/event', {
        body: {
          source: 'test-suite',
          type: 'page_view',
        },
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(400);
    });

    it('rejects invalid JSON body', async () => {
      const env = makeEnv();
      const req = makeRequest('POST', '/event', {
        body: undefined,
      });
      const badReq = new Request('https://genesis-gate/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json {{{',
      });

      const res = await worker.fetch(badReq, env);
      const body = await res.json() as Record<string, unknown>;

      expect(res.status).toBe(400);
      expect(body.error).toBe('Invalid JSON');
    });

    it('rejects payloads exceeding MAX_PAYLOAD_BYTES', async () => {
      const env = makeEnv({ MAX_PAYLOAD_BYTES: '50' });
      const bodyStr = JSON.stringify({
        source: 'test-suite',
        type: 'page_view',
        payload: { data: 'x'.repeat(100) },
        session_id: 'tritest-006',
      });
      const req = new Request('https://genesis-gate/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': String(bodyStr.length) },
        body: bodyStr,
      });

      const res = await worker.fetch(req, env);
      const body = await res.json() as Record<string, unknown>;

      expect(res.status).toBe(413);
      expect(body.error).toBe('Payload too large');
    });

    it('clamps source and type to 64 chars and session_id to 128', async () => {
      const env = makeEnv();
      const req = makeRequest('POST', '/event', {
        body: {
          source: 'a'.repeat(100),
          type: 'b'.repeat(100),
          payload: {},
          session_id: 'c'.repeat(200),
        },
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(201);

      const listResult = await env.EVENTS_KV.list({ prefix: 'event:' });
      const eventKey = listResult.keys.find(k => k.name.includes('event:'));
      const raw = eventKey ? await env.EVENTS_KV.get(eventKey.name) : null;
      const stored = JSON.parse(raw!) as Record<string, unknown>;
      expect((stored.source as string).length).toBeLessThanOrEqual(64);
      expect((stored.type as string).length).toBeLessThanOrEqual(64);
      expect((stored.session_id as string).length).toBeLessThanOrEqual(128);
    });

    it('defaults non-object payload to {}', async () => {
      const env = makeEnv();
      const req = makeRequest('POST', '/event', {
        body: {
          source: 'test-suite',
          type: 'page_view',
          payload: 'not-an-object',
          session_id: 'tritest-007',
        },
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(201);
    });

    it('triggers governance alert for spoon_decay MINIMAL', async () => {
      const env = makeEnv();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const req = makeRequest('POST', '/event', {
        body: {
          source: 'buffer',
          type: 'spoon_decay',
          payload: { tier: 'MINIMAL' },
          session_id: 'tritest-008',
        },
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(201);
      const alertCall = warnSpy.mock.calls.find(c => String(c[0]).includes('MINIMAL spoon tier'));
      expect(alertCall).toBeDefined();
      warnSpy.mockRestore();
    });

    it('triggers governance alert for fawn_guard_trigger', async () => {
      const env = makeEnv();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const req = makeRequest('POST', '/event', {
        body: {
          source: 'buffer',
          type: 'fawn_guard_trigger',
          payload: { severity: 'high' },
          session_id: 'tritest-009',
        },
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(201);
      const alertCall = warnSpy.mock.calls.find(c => String(c[0]).includes('Fawn Guard'));
      expect(alertCall).toBeDefined();
      warnSpy.mockRestore();
    });

    it('triggers error rate governance alert after threshold', async () => {
      const env = makeEnv({
        GOVERNANCE_ERROR_THRESHOLD: '2',
        GOVERNANCE_WINDOW_SECONDS: '60',
      });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      for (let i = 0; i < 3; i++) {
        const req = makeRequest('POST', '/event', {
          body: {
            source: 'test-suite',
            type: 'error',
            payload: { iteration: i },
            session_id: `tritest-err-${i}`,
          },
        });
        await worker.fetch(req, env);
      }

      const alertCall = warnSpy.mock.calls.find(c => String(c[0]).includes('ERROR RATE ALERT'));
      expect(alertCall).toBeDefined();
      expect(String(alertCall?.[0])).toContain('2 errors');
      warnSpy.mockRestore();
    });

    it('sends Discord webhook on governance alert when configured', async () => {
      const discordCalls: RequestInit[] = [];
      mockGlobalFetch((url, init) => {
        if (url === 'https://discord.webhook/alert' && init) {
          discordCalls.push(init);
        }
        return Promise.resolve(new Response('ok', { status: 200 }));
      });

      const env = makeEnv({
        DISCORD_WEBHOOK_URL: 'https://discord.webhook/alert',
      });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const req = makeRequest('POST', '/event', {
        body: {
          source: 'buffer',
          type: 'fawn_guard_trigger',
          payload: {},
          session_id: 'tritest-discord',
        },
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(201);

      await new Promise(r => setTimeout(r, 50));

      expect(discordCalls.length).toBe(1);
      const body = JSON.parse(discordCalls[0].body as string) as { content: string };
      expect(body.content).toContain('Fawn Guard');
      expect(body.content).toContain('🔴 P31 Governance Alert');
      warnSpy.mockRestore();
    });

    it('stores event in KV with correct key format and TTL', async () => {
      const putCalls: { key: string; opts?: { expirationTtl?: number } }[] = [];
      const env = makeEnv();
      const origPut = env.EVENTS_KV.put;
      env.EVENTS_KV.put = (key: string, value: string, opts?: { expirationTtl?: number }) => {
        putCalls.push({ key, opts });
        return origPut.call(env.EVENTS_KV, key, value, opts);
      };

      const req = makeRequest('POST', '/event', {
        body: {
          source: 'test-suite',
          type: 'page_view',
          payload: {},
          session_id: 'tritest-kv',
          timestamp: '2026-04-14T12:00:00.000Z',
        },
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(201);

      expect(putCalls.length).toBe(1);
      expect(putCalls[0].key.startsWith('event:')).toBe(true);
      expect(putCalls[0].opts?.expirationTtl).toBe(30 * 24 * 60 * 60);
    });
  });

  describe('GET /events — feed', () => {
    it('returns events by default (last 1 hour) when no ADMIN_TOKEN', async () => {
      const env = makeEnv({ ADMIN_TOKEN: undefined });
      const storedEvent = JSON.stringify({
        source: 'test-suite',
        type: 'page_view',
        payload: { route: 'feed-test' },
        session_id: 'tritest-feed-001',
        timestamp: new Date().toISOString(),
      });
      await env.EVENTS_KV.put('event:feedtest:abcd', storedEvent);

      const req = makeRequest('GET', '/events');
      const res = await worker.fetch(req, env);
      const body = await res.json() as Record<string, unknown>;

      expect(res.status).toBe(200);
      expect(body.events).toBeInstanceOf(Array);
      expect(body.count).toBeGreaterThanOrEqual(1);
    });

    it('returns 401 when ADMIN_TOKEN set and no auth header', async () => {
      const env = makeEnv({ ADMIN_TOKEN: 'super-secret' });
      const req = makeRequest('GET', '/events');

      const res = await worker.fetch(req, env);
      const body = await res.json() as Record<string, unknown>;

      expect(res.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 401 when ADMIN_TOKEN set and wrong token', async () => {
      const env = makeEnv({ ADMIN_TOKEN: 'super-secret' });
      const req = makeRequest('GET', '/events', {
        headers: { Authorization: 'Bearer wrong-token' },
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(401);
    });

    it('returns 200 with valid admin token', async () => {
      const env = makeEnv({ ADMIN_TOKEN: 'super-secret' });
      const req = makeRequest('GET', '/events', {
        headers: { Authorization: 'Bearer super-secret' },
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
    });

    it('returns 400 for invalid since parameter', async () => {
      const env = makeEnv({ ADMIN_TOKEN: undefined });
      const req = makeRequest('GET', '/events?since=notadate');

      const res = await worker.fetch(req, env);
      const body = await res.json() as Record<string, unknown>;

      expect(res.status).toBe(400);
      expect(body.error).toBe('Invalid since parameter');
    });

    it('respects limit parameter and caps at 1000', async () => {
      const env = makeEnv({ ADMIN_TOKEN: undefined });
      const req = makeRequest('GET', '/events?limit=2000');

      const res = await worker.fetch(req, env);
      const body = await res.json() as Record<string, unknown>;

      expect(res.status).toBe(200);
      expect(body.count as number).toBeLessThanOrEqual(1000);
    });

    it('response includes events, count, since, and generated_at', async () => {
      const env = makeEnv({ ADMIN_TOKEN: undefined });
      const req = makeRequest('GET', '/events?since=2026-01-01T00:00:00.000Z');

      const res = await worker.fetch(req, env);
      const body = await res.json() as Record<string, unknown>;

      expect(body).toHaveProperty('events');
      expect(body).toHaveProperty('count');
      expect(body).toHaveProperty('since');
      expect(body).toHaveProperty('generated_at');
      expect(typeof body.count).toBe('number');
      expect(typeof body.since).toBe('string');
      expect(typeof body.generated_at).toBe('string');
    });

    it('filters events by since timestamp', async () => {
      const env = makeEnv({ ADMIN_TOKEN: undefined });
      const oldTsMs = new Date('2026-01-01T00:00:00.000Z').getTime();
      const newTsMs = new Date('2026-04-14T12:00:00.000Z').getTime();
      const oldEvent = JSON.stringify({
        source: 'test-suite',
        type: 'page_view',
        payload: { old: true },
        session_id: 'tritest-old',
        timestamp: '2026-01-01T00:00:00.000Z',
      });
      const newEvent = JSON.stringify({
        source: 'test-suite',
        type: 'page_view',
        payload: { new: true },
        session_id: 'tritest-new',
        timestamp: '2026-04-14T12:00:00.000Z',
      });
      await env.EVENTS_KV.put(`event:${oldTsMs}:old1`, oldEvent);
      await env.EVENTS_KV.put(`event:${newTsMs}:new1`, newEvent);

      const sinceIso = new Date('2026-04-01T00:00:00.000Z').toISOString();
      const req = makeRequest('GET', `/events?since=${sinceIso}`);
      const res = await worker.fetch(req, env);
      const body = await res.json() as { events: Array<{ payload: Record<string, unknown> }> };

      expect(res.status).toBe(200);
      const hasNew = body.events.some(e => e.payload.new === true);
      const hasOld = body.events.some(e => e.payload.old === true);
      expect(hasNew).toBe(true);
      expect(hasOld).toBe(false);
    });

    it('skips corrupt KV entries silently', async () => {
      const env = makeEnv({ ADMIN_TOKEN: undefined });
      await env.EVENTS_KV.put('event:corrupt:bad1', 'not-json-at-all');
      const validEvent = JSON.stringify({
        source: 'test-suite',
        type: 'page_view',
        payload: { valid: true },
        session_id: 'tritest-corrupt',
        timestamp: new Date().toISOString(),
      });
      await env.EVENTS_KV.put('event:corrupt:good1', validEvent);

      const req = makeRequest('GET', '/events?since=2026-01-01T00:00:00.000Z');
      const res = await worker.fetch(req, env);
      const body = await res.json() as { events: unknown[] };

      expect(res.status).toBe(200);
      expect(body.events.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /health', () => {
    it('returns 200 with service metadata', async () => {
      const env = makeEnv();
      const req = makeRequest('GET', '/health');

      const res = await worker.fetch(req, env);
      const body = await res.json() as Record<string, unknown>;

      expect(res.status).toBe(200);
      expect(body.service).toBe('genesis-gate');
      expect(body.status).toBe('ok');
      expect(body.version).toBe('1.0.0');
      expect(body).toHaveProperty('timestamp');
      expect(body.bindings).toEqual(['EVENTS_KV']);
    });

    it('includes canonical route list', async () => {
      const env = makeEnv();
      const req = makeRequest('GET', '/health');

      const res = await worker.fetch(req, env);
      const body = await res.json() as { routes: string[] };

      expect(body.routes).toContain('POST /event');
      expect(body.routes).toContain('GET  /events?since=<iso_timestamp>&limit=<n>');
      expect(body.routes).toContain('GET  /health');
    });

    it('includes all valid event types', async () => {
      const env = makeEnv();
      const req = makeRequest('GET', '/health');

      const res = await worker.fetch(req, env);
      const body = await res.json() as { event_types: string[] };

      expect(body.event_types).toContain('page_view');
      expect(body.event_types).toContain('spoon_decay');
      expect(body.event_types).toContain('fawn_guard_trigger');
      expect(body.event_types).toContain('larmor_activation');
      expect(body.event_types).toContain('donation');
      expect(body.event_types).toContain('error');
      expect(body.event_types.length).toBeGreaterThanOrEqual(26);
    });
  });

  describe('404 — unmatched routes', () => {
    it('returns 404 for unknown GET paths', async () => {
      const env = makeEnv();
      const req = makeRequest('GET', '/unknown');

      const res = await worker.fetch(req, env);
      const body = await res.json() as Record<string, unknown>;

      expect(res.status).toBe(404);
      expect(body.error).toBe('Not found');
    });

    it('returns 404 for GET /event (wrong method)', async () => {
      const env = makeEnv();
      const req = makeRequest('GET', '/event');

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
    });

    it('returns 404 for POST /events (wrong method)', async () => {
      const env = makeEnv();
      const req = makeRequest('POST', '/events');

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
    });

    it('returns 404 for POST /health (wrong method)', async () => {
      const env = makeEnv();
      const req = makeRequest('POST', '/health');

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
    });
  });

  describe('response format', () => {
    it('all responses include Content-Type: application/json', async () => {
      const env = makeEnv();

      const cases = [
        { method: 'POST', path: '/event', body: { source: 'test', type: 'page_view', session_id: 't' } },
        { method: 'GET', path: '/events', body: undefined },
        { method: 'GET', path: '/health', body: undefined },
        { method: 'GET', path: '/unknown', body: undefined },
      ];

      for (const c of cases) {
        const req = makeRequest(c.method, c.path, { body: c.body });
        const res = await worker.fetch(req, env);
        expect(res.headers.get('Content-Type')).toBe('application/json');
      }
    });
  });
});
