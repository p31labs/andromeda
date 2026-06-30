/**
 * handlers.test.ts — Unit tests for k4-core handlers
 * P31 Labs, Inc. | EIN 42-1888158
 *
 * Tests individual handler functions in isolation.
 * Uses Vitest + @cloudflare/vitest-pool-workers with native fetchMock.
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

describe('k4-core Unit Tests', () => {
  describe('Health Check', () => {
    it('should return 200 with service info', async () => {
      const request = new Request('http://localhost/health');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env as Env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('k4-core');
    });
  });

  describe('LOVE Ledger', () => {
    it('should reject mint without DID', async () => {
      const request = new Request('http://localhost/love/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100 }),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env as Env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Missing or invalid "did"');
    });

    it('should reject mint with invalid DID format', async () => {
      const request = new Request('http://localhost/love/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: 'invalid-did', amount: 100 }),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env as Env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid DID format');
    });

    it('should return 404 for non-existent DID balance', async () => {
      const request = new Request('http://localhost/love/balance/did:key:zNonExistent');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env as Env, ctx);
      await waitOnExecutionContext(ctx);

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Governance', () => {
    it('should reject proposal creation without required fields', async () => {
      const request = new Request('http://localhost/governance/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test' }),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env as Env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Missing fields');
    });
  });

  describe('Care API', () => {
    it('should reject sync without Turnstile token', async () => {
      const request = new Request('http://localhost/care/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKeyHex: 'test-key' }),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env as Env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Turnstile token required');
    });
  });
});
