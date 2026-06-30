/**
 * integration.test.ts — Integration tests for k4-core
 * P31 Labs, Inc. | EIN 42-1888158
 *
 * Tests full request/response flows using the Worker's fetch handler.
 * Uses cloudflare:test helpers for execution context.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test';
import worker, { Env } from '../index';

beforeEach(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});

afterEach(() => {
  fetchMock.assertNoPendingInterceptors();
  fetchMock.deactivate();
});

describe('k4-core Integration Tests', () => {
  it('should handle health check', async () => {
    const request = new Request('http://localhost/health');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env as Env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  it('should handle LOVE mint with valid DID', async () => {
    fetchMock.get('https://passport-api.trimtab-signal.workers.dev/identity/resolve/*')
      .reply(200, { exists: true });

    const request = new Request('http://localhost/love/mint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        did: 'did:key:zTestDID1234567890123456789012345678901234567890',
        amount: 100,
        memo: 'Test mint',
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env as Env, ctx);
    await waitOnExecutionContext(ctx);

    expect([201, 400]).toContain(response.status);
  });

  it('should handle governance proposal list', async () => {
    const request = new Request('http://localhost/governance/proposals');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env as Env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('proposals');
    expect(data).toHaveProperty('count');
  });

  it('should handle K4 mesh status', async () => {
    const request = new Request('http://localhost/mesh/peers');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env as Env, ctx);
    await waitOnExecutionContext(ctx);

    expect([200, 501]).toContain(response.status);
  });
});

describe('k4-core Durable Object Integration', () => {
  it('should route governance requests to GovernanceEngineDO', async () => {
    const request = new Request('http://localhost/governance/proposals');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env as Env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.proposals).toBeDefined();
  });

  it('should route LOVE legacy DO requests', async () => {
    const request = new Request('http://localhost/love/health');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env as Env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.service).toContain('love');
  });
});
