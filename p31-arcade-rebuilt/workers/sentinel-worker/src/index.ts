/**
 * p31-sentinel — Cloudflare Worker
 * Server-side SENTINEL guardrail enforcement
 * Checks game access, validates session tokens, enforces caps
 * WCD-QM-01: Quantum entanglement enforcement
 */

interface SentinelCheck {
  playerId: string;
  gameId: string;
  token?: string;
}

interface QuantumCheck {
  playerA: string;
  playerB: string;
  gameId: string;
}

const WJ_WHITELIST = new Set([
  'smallball', 'gridiron', 'liquid-sculptor', 'magnetic-poetry', 'geodesic-builder',
]);

const GAME_SESSION_LIMITS: Record<string, number> = {
  smallball: 60, gridiron: 60, cards: 45, strategy: 45,
  'liquid-sculptor': 90, 'resonance-rings': 90, 'magnetic-poetry': 90,
  'orbital-drift': 90, 'geodesic-builder': 120, bonding: 90,
};

const QUANTUM_ENABLED = new Set([
  'bonding', 'geodesic-builder', 'resonance-rings', 'orbital-drift',
]);

// Larmor frequency (863 Hz - phosphorus resonance)
const LARMOR_FREQUENCY = 863;

function getLarmorPhase(): number {
  return (Date.now() * LARMOR_FREQUENCY / 1000) % (2 * Math.PI);
}

// In-memory quantum pairs (in production, use KV/D1)
const quantumPairs = new Map<string, { playerA: string; playerB: string; bellState: string; createdAt: number }>();

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // POST /api/quantum/entangle/:playerA/:playerB — create entangled pair
    const entangleMatch = path.match(/^\/api\/quantum\/entangle\/(\w+)\/(\w+)$/);
    if (entangleMatch && request.method === 'POST') {
      const playerA = entangleMatch[1];
      const playerB = entangleMatch[2];
      const pairId = [playerA, playerB].sort().join('-');
      
      const bellStates = ['phi-plus', 'phi-minus', 'psi-plus', 'psi-minus'];
      const bellState = bellStates[Math.floor(Math.random() * bellStates.length)];
      
      quantumPairs.set(pairId, { playerA, playerB, bellState, createdAt: Date.now() });
      
      return Response.json({
        ok: true,
        pairId,
        playerA,
        playerB,
        bellState,
        larmorPhase: getLarmorPhase(),
      });
    }

    // GET /api/quantum/state — get current Larmor phase
    if (path === '/api/quantum/state' && request.method === 'GET') {
      return Response.json({
        frequency: 863,
        phase: getLarmorPhase(),
        timestamp: Date.now(),
        signature: 'Ca₉(PO₄)₆',
      });
    }

    // GET /api/quantum/key — quantum key distribution
    if (path === '/api/quantum/key' && request.method === 'GET') {
      const timestamp = Date.now();
      const larmorSeed = (timestamp * LARMOR_FREQUENCY) % 0xFFFFFFFF;
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      
      // Mix with Larmor entropy
      for (let i = 0; i < array.length; i++) {
        array[i] ^= (larmorSeed >> (i % 4)) & 0xFF;
      }
      
      return Response.json({
        key: btoa(String.fromCharCode(...array)),
        nonce: `${timestamp}-${Math.round(getLarmorPhase() * 1000)}`,
        larmorPhase: getLarmorPhase(),
      });
    }

    // POST /api/check — verify game access
    if (path === '/api/check' && request.method === 'POST') {
      const body: SentinelCheck = await request.json();

      // Check whitelist
      if (body.playerId === 'wj' && !WJ_WHITELIST.has(body.gameId)) {
        return Response.json({
          allowed: false,
          reason: 'SENTINEL: Game not appropriate for this player',
          policy: 'WJ_WHITELIST',
        }, { status: 403 });
      }

      // Check session token if provided
      if (body.token) {
        try {
          const decoded = JSON.parse(atob(body.token));
          if (decoded.exp < Date.now()) {
            return Response.json({
              allowed: false,
              reason: 'SENTINEL: Session token expired',
            }, { status: 403 });
          }
          if (decoded.gameId !== body.gameId) {
            return Response.json({
              allowed: false,
              reason: 'SENTINEL: Token game mismatch',
            }, { status: 403 });
          }
        } catch {
          return Response.json({
            allowed: false,
            reason: 'SENTINEL: Invalid token',
          }, { status: 403 });
        }
      }

      // Return session cap and quantum status
      const maxMinutes = GAME_SESSION_LIMITS[body.gameId] || 60;
      return Response.json({
        allowed: true,
        maxMinutes,
        quantumEnabled: QUANTUM_ENABLED.has(body.gameId),
        larmorPhase: getLarmorPhase(),
        policy: 'SENTINEL_GUARDIAN',
      });
    }

    // GET /api/policy — return policy
    if (path === '/api/policy') {
      return Response.json({
        name: 'SENTINEL Guardian',
        version: '2.0.0',
        rules: [
          'Zero ads — absolutely no advertising or external monetization',
          'Age-appropriate — W.J. restricted to whitelisted games',
          'Session limits — enforced countdown per game config',
          'Family-safe — all content reviewed, no external links in games',
          'CHUMP-funded — all infrastructure paid by bandwidth earnings',
        ],
        whitelist: [...WJ_WHITELIST],
      });
    }

    // 404
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
