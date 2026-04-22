// ═══════════════════════════════════════════════════════════
// k4-personal: Main Router
//
// Routes requests to the appropriate vertex Durable Object
// based on path prefix. Phase 1 implementation — routing only.
// ═══════════════════════════════════════════════════════════

import OperatorStateDO from './operator-state-do';
import SignalProcessorDO from './signal-processor-do';
import ContextEngineDO from './context-engine-do';
import ShieldEngineDO from './shield-engine-do';

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Extract agent ID from path
    const match = path.match(/^\/agent\/([^/]+)(\/.*)?$/);
    if (!match) {
      if (path === '/health') {
        return Response.json({ status: 'healthy', vertices: 4 });
      }
      return new Response('Not found', { status: 404 });
    }

    const agentId = match[1];
    const subPath = match[2] || '';

    // Route to appropriate vertex DO based on path
    let doNamespace: DurableObjectNamespace;
    let doId: DurableObjectId;

    // Route based on subpath prefix
    if (subPath.startsWith('/energy') || subPath.startsWith('/bio') || subPath.startsWith('/reminders') || subPath.startsWith('/voltage')) {
      // Vertex A: OperatorState
      doNamespace = env.OPERATOR_STATE;
      doId = doNamespace.idFromName(agentId);
    } else if (subPath.startsWith('/message') || subPath.startsWith('/queue') || subPath.startsWith('/draft') || subPath.startsWith('/fawn') || subPath.startsWith('/fortress')) {
      // Vertex B: SignalProcessor
      doNamespace = env.SIGNAL_PROCESSOR;
      doId = doNamespace.idFromName(agentId);
    } else if (subPath.startsWith('/state') || subPath.startsWith('/timeline') || subPath.startsWith('/deadlines') || subPath.startsWith('/context')) {
      // Vertex C: ContextEngine
      doNamespace = env.CONTEXT_ENGINE;
      doId = doNamespace.idFromName(agentId);
    } else if (subPath.startsWith('/chat') || subPath.startsWith('/synthesis') || subPath.startsWith('/shield') || subPath.startsWith('/synthesize')) {
      // Vertex D: ShieldEngine
      doNamespace = env.SHIELD_ENGINE;
      doId = doNamespace.idFromName(agentId);
    } else {
      return new Response('Invalid endpoint', { status: 404 });
    }

    // Forward request directly to Durable Object - DOs receive full original path
    const stub = doNamespace.get(doId);
    return stub.fetch(request);
  },
};

// Export all four Durable Object classes
export { OperatorStateDO, SignalProcessorDO, ContextEngineDO, ShieldEngineDO };
