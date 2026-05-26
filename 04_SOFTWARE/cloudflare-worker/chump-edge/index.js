export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'GET' && url.pathname === '/api/stats') {
      try {
        let stats = await env.CHUMP_LEDGER.get('current_stats', { type: 'json' });
        if (!stats) {
          stats = {
            monthly_estimate: 230,
            active_streams: 4,
            nodes_online: 0,
            streams: {
              extension: { label: 'Chrome Extension', amount: 30, type: 'Passive Data' },
              labeling: { label: 'Data Labeling', amount: 100, type: 'AI Training' },
              surveys: { label: 'Survey Panel', amount: 40, type: 'Research' },
              moderation: { label: 'Content Mod', amount: 60, type: 'Community' },
            },
            status: 'Operational',
            timestamp: Date.now(),
          };
        }
        return new Response(JSON.stringify(stats), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Failed to fetch stats' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/report') {
      try {
        const auth = request.headers.get('Authorization');
        if (auth !== `Bearer ${env.CHUMP_MASTER_KEY}`) {
          return new Response('Unauthorized', { status: 401, headers: corsHeaders });
        }
        const payload = await request.json();
        const { source, amount, type } = payload;
        ctx.waitUntil(this.processEarningEvent(env, payload));
        return new Response(JSON.stringify({ success: true, logged: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      } catch (e) {
        return new Response('Bad Request', { status: 400, headers: corsHeaders });
      }
    }

    if (request.method === 'GET' && url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'operational',
        service: 'chump-edge',
        environment: env.ENVIRONMENT || 'production',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response('CHUMP Edge API — Route Not Found', { status: 404, headers: corsHeaders });
  },

  async processEarningEvent(env, payload) {
    try {
      const { source, amount } = payload;
      const prev = await env.CHUMP_LEDGER.get('current_stats', { type: 'json' });
      if (prev) {
        prev.monthly_estimate = (prev.monthly_estimate || 0) + (amount || 0);
        prev.lastUpdated = Date.now();
        if (!prev.streams) prev.streams = {};
        if (!prev.streams[source]) prev.streams[source] = { label: source, amount: 0, type: 'custom' };
        prev.streams[source].amount += amount || 0;
        prev.active_streams = Object.keys(prev.streams).length;
        await env.CHUMP_LEDGER.put('current_stats', JSON.stringify(prev));
      }
    } catch (e) {
      console.error('[CHUMP] processEarningEvent error:', e);
    }
  },
};
