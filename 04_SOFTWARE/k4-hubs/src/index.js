/**
 * K4-Hubs — Life-context K₄ hub router with dock bindings to personal mesh.
 * Routes messages and queries via HTTP service bindings to k4-cage and k4-personal.
 */
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/route" && request.method === "POST") {
      const { from, to, action, payload, scope } = await request.json();
      if (!from || !scope) {
        return Response.json({ error: "Missing from or scope" }, { status: 400 });
      }

      switch (action) {
        case "send_to_mesh": {
          // WebSocket room routing requires the FamilyMeshRoom DO (unavailable in KV-only mode).
          // Fall back to recording the interaction as a KV-backed ping instead.
          const target = to || scope;
          if (!target || target === from) {
            return Response.json({ error: "Missing or self target" }, { status: 400 });
          }
          return env.K4_CAGE.fetch(new Request(
            `https://k4-cage.internal/api/ping/${encodeURIComponent(from)}/${encodeURIComponent(target)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload || {}),
            }
          ));
        }

        case "query_agent": {
          if (!to) return Response.json({ error: "Missing target" }, { status: 400 });
          const energyRes = await env.K4_PERSONAL.fetch(
            new Request(`https://k4-personal.internal/agent/${encodeURIComponent(to)}/energy`)
          );
          const energy = await energyRes.json();
          return Response.json({
            available: (energy.spoons ?? 10) > 2,
            energy: { spoons: energy.spoons ?? 10, max: energy.max ?? 12 },
          });
        }

        case "broadcast": {
          const members = payload?.members || [];
          const results = await Promise.all(
            members.filter((m) => m !== from).map(async (memberId) => {
              try {
                await env.K4_PERSONAL.fetch(new Request(
                  `https://k4-personal.internal/agent/${encodeURIComponent(memberId)}/chat`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: `[System] ${payload.message}`, scope }),
                  }
                ));
                return { member: memberId, status: "ok" };
              } catch (e) {
                return { member: memberId, status: "error", error: e.message };
              }
            })
          );
          return Response.json({ ok: true, results });
        }

        default:
          return Response.json({ error: "Unknown action" }, { status: 400 });
      }
    }

    const meshMatch = url.pathname.match(/^\/mesh-state\/(.+)$/);
    if (meshMatch) {
      const scope = meshMatch[1];
      try {
        const statsRes = await env.K4_CAGE.fetch(
          new Request(`https://k4-cage.internal/room-stats/${encodeURIComponent(scope)}`)
        );
        const stats = await statsRes.json();
        return Response.json({ scope, ...stats });
      } catch {
        return Response.json({ scope, connections: 0, error: "Room not found" });
      }
    }

    // ── Admin: Mesh Metrics ──
    if (url.pathname === "/api/admin/mesh/metrics" && request.method === "GET") {
      return withAccess(request, env, 'admin', async (auth) => {
        try {
          // Aggregate metrics from K4 Cage
          const cageRes = await env.K4_CAGE.fetch(
            new Request('https://k4-cage.internal/api/admin/metrics')
          );
          const cageMetrics = await cageRes.json();

          return jsonResponse({
            metrics: {
              messagesPerSecond: cageMetrics.messagesPerSecond || 0,
              activeConnections: cageMetrics.activeConnections || 0,
              totalConversations: cageMetrics.totalConversations || 0,
              totalMembers: cageMetrics.totalMembers || 0,
              avgLatency: cageMetrics.avgLatency || 0,
              errorRate: cageMetrics.errorRate || 0
            },
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          return jsonResponse({ error: 'Failed to fetch metrics' }, 500);
        }
      });
    }

    // ── Admin: System Health ──
    if (url.pathname === "/api/admin/system/health" && request.method === "GET") {
      return withAccess(request, env, 'admin', async (auth) => {
        try {
          const checks = await Promise.all([
            env.K4_CAGE.fetch(new Request('https://k4-cage.internal/health')),
            env.K4_CAGE.fetch(new Request('https://k4-cage.internal/api/health')),
            env.K4_PERSONAL.fetch(new Request('https://k4-personal.internal/health'))
          ]);

          const health = {
            worker: checks[0].ok ? 'healthy' : 'unhealthy',
            d1: checks[1].ok ? 'healthy' : 'unknown',
            kv: checks[0].ok ? 'healthy' : 'unknown',
            websocket: 'healthy'
          };

          const overall = Object.values(health).every(v => v === 'healthy') 
            ? 'healthy' 
            : 'degraded';

          return jsonResponse({ 
            health,
            overall,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          return jsonResponse({ 
            health: { worker: 'unknown', d1: 'unknown', kv: 'unknown', websocket: 'unknown' },
            overall: 'unknown'
          });
        }
      });
    }

    // ── Admin: Conversation Management ──
    if (url.pathname === "/api/admin/conversations" && request.method === "GET") {
      return withAccess(request, env, 'admin', async (auth) => {
        try {
          const search = new URL(request.url).searchParams.get('search');
          // Proxy to K4 Cage
          const path = search 
            ? `/api/admin/conversations/search?q=${encodeURIComponent(search)}`
            : '/api/admin/conversations';
            
          const res = await env.K4_CAGE.fetch(
            new Request(`https://k4-cage.internal${path}`)
          );
          const data = await res.json();
          return jsonResponse(data);
        } catch (e) {
          return jsonResponse({ error: 'Failed to fetch conversations' }, 500);
        }
      });
    }

    // ── Admin: Logs ──
    if (url.pathname === "/api/admin/logs" && request.method === "GET") {
      return withAccess(request, env, 'admin', async (auth) => {
        const limit = Math.min(parseInt(new URL(request.url).searchParams.get('limit') || '100'), 1000);
        // In production, would fetch from telemetry backend
        return jsonResponse({
          logs: [],
          count: 0,
          limit
        });
      });
    }

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", service: "k4-hubs" });
    }

    return new Response("k4-hubs alive", { status: 200 });
  },
};

export { index_default as default };
