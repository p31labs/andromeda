// ═══════════════════════════════════════════════════════════
// k4-hubs: The Six Tetrahedral Edges
//
// The nervous system of the K₄ mesh. Routes messages between
// the four vertices. No vertex communicates directly.
// All traffic flows through the hubs.
// ═══════════════════════════════════════════════════════════

import { calculateQFactor, HubMessage } from '@p31/k4-mesh-core';

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Health check
    if (path === '/health' || path === '/api/health') {
      return Response.json({
        status: 'healthy',
        edges: 6,
        vertices: 4,
        timestamp: Date.now(),
      });
    }

    // Q-Factor: Fisher-Escolà coherence score
    if (path === '/hub/q-factor' && request.method === 'GET') {
      return this.getQFactor(env);
    }

    // Broadcast to all vertices
    if (path === '/hub/broadcast' && request.method === 'POST') {
      return this.broadcastMessage(await request.json(), env);
    }

    // The six edge channels
    const edgeRoutes: Record<string, string[]> = {
      '/hub/energy-voltage':   ['OPERATOR_STATE', 'SIGNAL_PROCESSOR'],
      '/hub/energy-context':   ['OPERATOR_STATE', 'CONTEXT_ENGINE'],
      '/hub/energy-shield':    ['OPERATOR_STATE', 'SHIELD_ENGINE'],
      '/hub/signal-context':   ['SIGNAL_PROCESSOR', 'CONTEXT_ENGINE'],
      '/hub/signal-shield':    ['SIGNAL_PROCESSOR', 'SHIELD_ENGINE'],
      '/hub/context-shield':   ['CONTEXT_ENGINE', 'SHIELD_ENGINE'],
    };

    const targetVertices = edgeRoutes[path];
    if (targetVertices && request.method === 'POST') {
      return this.routeEdgeMessage(path, await request.json(), targetVertices, env);
    }

    return new Response('Not found', { status: 404 });
  },

  // Route message to both vertices on an edge
  async routeEdgeMessage(
    edge: string,
    message: HubMessage & { agentId?: string },
    vertices: string[],
    env: any
  ): Promise<Response> {
    const results = [];
    
    for (const vertexBinding of vertices) {
      try {
        const stub = this.getVertexStub(vertexBinding, message.agentId || 'default', env);
        const response = await stub.fetch(`https://internal${edge}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        });
        results.push({
          vertex: vertexBinding,
          status: response.status,
          ok: response.ok,
        });
      } catch (error) {
        results.push({
          vertex: vertexBinding,
          status: 500,
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return Response.json({
      success: results.every(r => r.ok),
      edge,
      timestamp: Date.now(),
      results,
    });
  },

  // Broadcast message to all four vertices
  async broadcastMessage(message: HubMessage & { agentId?: string }, env: any): Promise<Response> {
    const allVertices = ['OPERATOR_STATE', 'SIGNAL_PROCESSOR', 'CONTEXT_ENGINE', 'SHIELD_ENGINE'];
    const results = [];
    
    for (const vertexBinding of allVertices) {
      try {
        const stub = this.getVertexStub(vertexBinding, message.agentId || 'default', env);
        const response = await stub.fetch('https://internal/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        });
        results.push({
          vertex: vertexBinding,
          status: response.status,
          ok: response.ok,
        });
      } catch (error) {
        results.push({
          vertex: vertexBinding,
          status: 500,
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return Response.json({
      success: results.every(r => r.ok),
      broadcast: true,
      timestamp: Date.now(),
      results,
    });
  },

  // Calculate Q-Factor (Fisher-Escolà coherence score)
  async getQFactor(env: any): Promise<Response> {
    const agentId = 'default';
    
    try {
      // Get health from all four vertices in parallel
      const [aHealth, bHealth, cHealth, dHealth] = await Promise.allSettled([
        this.getVertexStub('OPERATOR_STATE', agentId, env).fetch('https://internal/health'),
        this.getVertexStub('SIGNAL_PROCESSOR', agentId, env).fetch('https://internal/health'),
        this.getVertexStub('CONTEXT_ENGINE', agentId, env).fetch('https://internal/health'),
        this.getVertexStub('SHIELD_ENGINE', agentId, env).fetch('https://internal/health'),
      ]);

      // Extract vertex states
      const vertexStates = {
        A: { energy: { trend: 'stable' as const, spoons: 10, max: 10, lastUpdate: Date.now() }, bio: [] },
        B: { queueDepth: 0, fawnScore: 0 },
        C: { criticalDeadlines: 0, totalDeadlines: 0 },
        D: { lastSynthesis: Date.now(), synthesisCount: 0 },
      };

      // Parse responses if available
      if (aHealth.status === 'fulfilled') {
        try {
          const data = await aHealth.value.json() as any;
          vertexStates.A.energy = data.energy || vertexStates.A.energy;
        } catch {}
      }
      
      if (bHealth.status === 'fulfilled') {
        try {
          const data = await bHealth.value.json() as any;
          vertexStates.B.queueDepth = data.queueDepth || 0;
        } catch {}
      }
      
      if (cHealth.status === 'fulfilled') {
        try {
          const data = await cHealth.value.json() as any;
          vertexStates.C.criticalDeadlines = data.criticalDeadlines || 0;
          vertexStates.C.totalDeadlines = data.totalDeadlines || 0;
        } catch {}
      }
      
      if (dHealth.status === 'fulfilled') {
        try {
          const data = await dHealth.value.json() as any;
          vertexStates.D.lastSynthesis = data.lastSynthesis || Date.now();
        } catch {}
      }

      // Calculate Q-Factor
      const qFactor = calculateQFactor(vertexStates);

      return Response.json({
        ...qFactor,
        source: 'k4-hubs',
      });
    } catch (error) {
      return Response.json({
        score: 0.5,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }, { status: 500 });
    }
  },

  // Get Durable Object stub for a vertex using service binding
  getVertexStub(bindingName: string, agentId: string, env: any): Fetcher {
    const service = env[bindingName];
    const url = `https://k4-personal/agent/${agentId}${bindingName === 'OPERATOR_STATE' ? '/energy' : 
                                     bindingName === 'SIGNAL_PROCESSOR' ? '/queue' : 
                                     bindingName === 'CONTEXT_ENGINE' ? '/context' : '/chat'}`;
    
    // Return fetcher that proxies to the service with correct path
    return {
      fetch: (req: RequestInfo, options?: RequestInit) => {
        // Override URL to route through service binding
        if (typeof req === 'string') {
          // For internal hub calls, route directly to the vertex
          const path = req.replace('https://internal', '');
          return service.fetch(`https://k4-personal/agent/${agentId}${path}`, options);
        }
        return service.fetch(req, options);
      }
    };
  },
};
