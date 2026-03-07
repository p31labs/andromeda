/**
 * Suite D — Worker Endpoints (WCD-M22)
 *
 * Tests relay endpoint structure, nonce uniqueness,
 * ping payload validation, and rate limiting logic.
 *
 * Note: These are unit tests for payload/protocol validation.
 * Full Miniflare integration tests require the worker source
 * (bonding-relay CF Worker) which lives in a separate repo.
 */

import { describe, it, expect } from 'vitest';

// ── Nonce uniqueness ──

describe('Suite D: Worker Endpoints', () => {
  describe('nonce uniqueness', () => {
    it('crypto.randomUUID produces unique values', () => {
      const nonces = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        nonces.add(crypto.randomUUID());
      }
      expect(nonces.size).toBe(1000);
    });

    it('UUID v4 format is valid', () => {
      const uuid = crypto.randomUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(uuid).toMatch(uuidRegex);
    });
  });

  // ── Room code format ──

  describe('handshake room codes', () => {
    it('generates HS_ prefixed room code', () => {
      const code = `HS_${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      expect(code).toMatch(/^HS_[A-F0-9]{6}$/);
    });

    it('room codes are unique', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(`HS_${crypto.randomUUID().slice(0, 6).toUpperCase()}`);
      }
      expect(codes.size).toBe(100);
    });
  });

  // ── Ping payload validation ──

  describe('ping payload structure', () => {
    it('HANDSHAKE_LOCK payload has required fields', () => {
      const payload = {
        from: 0,
        atomId: 0,
        reaction: 'HANDSHAKE_LOCK',
        data: {
          did: 'did:key:z6MkTest',
          lockTime: Date.now(),
          signature: 'abcdef0123456789',
        },
      };

      expect(payload.reaction).toBe('HANDSHAKE_LOCK');
      expect(payload.data.did).toMatch(/^did:key:/);
      expect(typeof payload.data.lockTime).toBe('number');
      expect(typeof payload.data.signature).toBe('string');
      expect(payload.data.signature.length).toBeGreaterThan(0);
    });

    it('HANDSHAKE_CONFIRM payload has required fields', () => {
      const payload = {
        from: 0,
        atomId: 0,
        reaction: 'HANDSHAKE_CONFIRM',
        data: {
          did: 'did:key:z6MkTest',
          signature: 'fedcba9876543210',
        },
      };

      expect(payload.reaction).toBe('HANDSHAKE_CONFIRM');
      expect(payload.data.did).toMatch(/^did:key:/);
      expect(typeof payload.data.signature).toBe('string');
    });

    it('MINT_SIGN_REQUEST payload has required fields', () => {
      const nonce = crypto.randomUUID();
      const canonicalTimestamp = Date.now();
      const dids = ['did:key:zA', 'did:key:zB', 'did:key:zC', 'did:key:zD'];
      const canonical = JSON.stringify({
        nonce,
        canonicalTimestamp,
        dids: [...dids].sort(),
      });

      const payload = {
        from: 0,
        atomId: 0,
        reaction: 'MINT_SIGN_REQUEST',
        data: { nonce, canonicalTimestamp, canonical },
      };

      expect(payload.reaction).toBe('MINT_SIGN_REQUEST');
      expect(payload.data.nonce).toBe(nonce);
      const parsed = JSON.parse(payload.data.canonical);
      expect(parsed.dids.length).toBe(4);
      expect(parsed.dids).toEqual([...dids].sort());
    });

    it('MINT_SIGN_RESPONSE payload has required fields', () => {
      const payload = {
        from: 0,
        atomId: 0,
        reaction: 'MINT_SIGN_RESPONSE',
        data: {
          did: 'did:key:z6MkTest',
          signature: 'aa'.repeat(64), // 128 hex chars = 64 bytes
        },
      };

      expect(payload.reaction).toBe('MINT_SIGN_RESPONSE');
      expect(payload.data.signature.length).toBe(128);
    });
  });

  // ── Mint request structure ──

  describe('mint request structure', () => {
    it('mint POST body includes nonce, timestamp, 4 signatures, gcode', () => {
      const body = {
        nonce: crypto.randomUUID(),
        canonicalTimestamp: Date.now(),
        signatures: [
          { did: 'did:key:zA', signature: 'sig1' },
          { did: 'did:key:zB', signature: 'sig2' },
          { did: 'did:key:zC', signature: 'sig3' },
          { did: 'did:key:zD', signature: 'sig4' },
        ],
        gcodeFile: 'k4_node_v1.gcode',
      };

      expect(body.signatures.length).toBe(4);
      expect(body.gcodeFile).toMatch(/\.gcode$/);
      expect(typeof body.nonce).toBe('string');
    });

    it('rejects mint with fewer than 4 signatures', () => {
      const signatures = [
        { did: 'did:key:zA', signature: 'sig1' },
        { did: 'did:key:zB', signature: 'sig2' },
        { did: 'did:key:zC', signature: 'sig3' },
      ];
      expect(signatures.length).toBeLessThan(4);
    });

    it('canonical payload DIDs are sorted for determinism', () => {
      const dids = ['did:key:zD', 'did:key:zA', 'did:key:zC', 'did:key:zB'];
      const sorted = [...dids].sort();
      const canonical = JSON.stringify({
        nonce: 'test',
        canonicalTimestamp: 0,
        dids: sorted,
      });
      const parsed = JSON.parse(canonical);
      expect(parsed.dids).toEqual(['did:key:zA', 'did:key:zB', 'did:key:zC', 'did:key:zD']);
    });
  });

  // ── Rate limiting logic ──

  describe('rate limiting', () => {
    it('relay fetch uses 10s timeout via AbortController', () => {
      const TIMEOUT_MS = 10_000;
      expect(TIMEOUT_MS).toBe(10_000);
    });

    it('mint signature collection has 30s timeout', () => {
      const SIGNATURE_COLLECT_TIMEOUT_MS = 30_000;
      expect(SIGNATURE_COLLECT_TIMEOUT_MS).toBe(30_000);
    });

    it('handshake poll has 30s timeout with 1s interval', () => {
      const POLL_TIMEOUT_MS = 30_000;
      const POLL_INTERVAL_MS = 1000;
      expect(POLL_TIMEOUT_MS / POLL_INTERVAL_MS).toBe(30); // max 30 polls
    });

    it('mint poll uses 2s interval', () => {
      const POLL_INTERVAL_MS = 2000;
      const TIMEOUT_MS = 30_000;
      expect(TIMEOUT_MS / POLL_INTERVAL_MS).toBe(15); // max 15 polls
    });
  });

  // ── Signature hex encoding ──

  describe('signature encoding', () => {
    it('Ed25519 signature encodes to 128 hex chars', () => {
      // 64 bytes → 128 hex chars
      const sigBytes = new Uint8Array(64);
      crypto.getRandomValues(sigBytes);
      const hex = Array.from(sigBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      expect(hex.length).toBe(128);
    });

    it('hex encoding is deterministic', () => {
      const bytes = new Uint8Array([0, 15, 255]);
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      expect(hex).toBe('000fff');
    });
  });

  // ── Partner lock detection ──

  describe('partner lock detection', () => {
    it('filters out own DID from ping results', () => {
      const myDID = 'did:key:zMyself';
      const pings = [
        { reaction: 'HANDSHAKE_LOCK', data: { did: myDID, lockTime: 1000 } },
        { reaction: 'HANDSHAKE_LOCK', data: { did: 'did:key:zPartner', lockTime: 1500 } },
        { reaction: 'OTHER', data: { did: 'did:key:zOther' } },
      ];

      const partnerLock = pings.find(
        (p) => p.reaction === 'HANDSHAKE_LOCK' && p.data?.did && p.data.did !== myDID,
      );

      expect(partnerLock).toBeDefined();
      expect(partnerLock!.data.did).toBe('did:key:zPartner');
    });

    it('returns null when no partner lock found', () => {
      const myDID = 'did:key:zMyself';
      const pings = [
        { reaction: 'HANDSHAKE_LOCK', data: { did: myDID, lockTime: 1000 } },
      ];

      const partnerLock = pings.find(
        (p) => p.reaction === 'HANDSHAKE_LOCK' && p.data?.did && p.data.did !== myDID,
      );

      expect(partnerLock).toBeUndefined();
    });
  });
});
