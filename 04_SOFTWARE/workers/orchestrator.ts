/**
 * P31 Orchestrator Worker Entry Point
 * 
 * This worker exposes the Event Bus Durable Object HTTP API
 * and handles cron triggers for scheduled tasks.
 */

import { EventBusDO } from './orchestrator-event-bus.ts';

export { EventBusDO };

export interface Env {
  ORCHESTRATOR_DO: DurableObjectNamespace;
  ORCHESTRATOR_D1: D1Database;
  SPOONS_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Health check
    if (pathParts.length === 0) {
      return new Response(JSON.stringify({
        status: 'online',
        service: 'p31-orchestrator',
        timestamp: Date.now()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Route all /api/orchestrator requests to the singleton DO
    if (pathParts[0] === 'api' && pathParts[1] === 'orchestrator') {
      const id = env.ORCHESTRATOR_DO.idFromName('singleton');
      const stub = env.ORCHESTRATOR_DO.get(id);
      return stub.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Cron trigger handler - forward all scheduled events to Event Bus
    const id = env.ORCHESTRATOR_DO.idFromName('singleton');
    const stub = env.ORCHESTRATOR_DO.get(id);
    
    ctx.waitUntil(stub.fetch(new Request('http://localhost/api/orchestrator/trigger', {
      method: 'POST',
      body: JSON.stringify({
        id: crypto.randomUUID(),
        type: 'cron',
        source: 'scheduled-event',
        action: 'cron:heartbeat',
        priority: 1,
        safetyLevel: 1,
        baseDelayMs: 0,
        payload: { cron: event.cron },
        timestamp: Date.now()
      })
    })));
  }
};
