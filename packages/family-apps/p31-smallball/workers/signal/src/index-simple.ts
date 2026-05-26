// P31 Smallball Cloudflare Worker - Simplified Version
// Basic health check and seed generation without Durable Objects

export interface Env {
  // Add your bindings here
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/api/health') {
      return Response.json({
        status: 'ok',
        service: 'p31-smallball-signal',
        version: '0.0.1',
        timestamp: Date.now(),
      }, { headers: corsHeaders });
    }

    // Generate seed for deterministic simulation
    if (url.pathname === '/api/seed') {
      const seedBytes = new Uint32Array(1);
      crypto.getRandomValues(seedBytes);
      const seed = seedBytes[0];
      const matchId = crypto.randomUUID();

      return Response.json({
        matchId,
        seed,
        timestamp: Date.now(),
      }, { headers: corsHeaders });
    }

    // Default response
    return new Response('P31 Smallball Signal Worker', {
      status: 200,
      headers: corsHeaders,
    });
  },
};
