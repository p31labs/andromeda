/**
 * p31-sentinel — Cloudflare Worker
 * Server-side SENTINEL guardrail enforcement
 * Checks game access, validates session tokens, enforces caps
 */

interface SentinelCheck {
  playerId: string;
  gameId: string;
  token?: string;
}

const WJ_WHITELIST = new Set([
  'smallball', 'gridiron', 'liquid-sculptor', 'magnetic-poetry', 'geodesic-builder',
]);

const GAME_SESSION_LIMITS: Record<string, number> = {
  smallball: 60, gridiron: 60, cards: 45, strategy: 45,
  'liquid-sculptor': 90, 'resonance-rings': 90, 'magnetic-poetry': 90,
  'orbital-drift': 90, 'geodesic-builder': 120,
};

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

      // Return session cap
      const maxMinutes = GAME_SESSION_LIMITS[body.gameId] || 60;
      return Response.json({
        allowed: true,
        maxMinutes,
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
