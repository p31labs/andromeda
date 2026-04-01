/* kenosis-mesh: Complete 7-node serverless SIC-POVM topology */

// Utility sleep for lightweight waits
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Resolve the correct Durable Object binding for a given target
function bindingNameFor(target) {
  switch (target) {
    case 'R': return 'R_NODE';
    case 'A': return 'ANODE';
    case 'B': return 'BNODE';
    case 'C': return 'CNODE';
    case 'D': return 'DNODE';
    case 'E': return 'ENODE';
    case 'F': return 'FNODE';
    default: throw new Error(`Unknown target node: ${target}`);
  }
}

// Forward an envelope to a target DO
async function forwardTo(env, targetName, envelope) {
  const bindingName = bindingNameFor(targetName);
  const binding = env[bindingName];
  if (!binding) throw new Error(`Missing binding: ${bindingName}`);
  const id = binding.idFromName(targetName);
  const obj = binding.get(id);
  const resp = await obj.fetch('/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope),
  });
  try { return await resp.json(); } catch { return resp; }
}

// ------------------- Root Node: RNode (The Apex) -------------------
export class RNode {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/message') {
      const envelope = await request.json();

      // Public root is protected by a Bearer token
      const auth = request.headers.get('Authorization');
      if (this.env.ROOT_BEARER_TOKEN && auth !== `Bearer ${this.env.ROOT_BEARER_TOKEN}`) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 403 });
      }

      if (envelope.to !== 'R') {
        return new Response(JSON.stringify({ error: 'not-for-R' }), { status: 400 });
      }

      if (envelope.type === 'init') {
        // reset leaf aggregation state
        await this.state.storage.put('leaf_results', {});
        const ts = envelope.timestamp ?? Date.now();

        // Forward to A, B, C in parallel
        await Promise.all(['A', 'B', 'C'].map((node) =>
          forwardTo(this.env, node, {
            id: envelope.id,
            from: 'R',
            to: node,
            type: 'init',
            payload: envelope.payload,
            timestamp: ts
          })
        ));

        return new Response(JSON.stringify({ ack: true, session: envelope.id }), { status: 200 });
      }

      if (envelope.type === 'leaf') {
        // Capture leaf results from D/E/F
        const leafResults = (await this.state.storage.get('leaf_results')) || {};
        const leaf = envelope.payload?.leaf;
        const data = envelope.payload?.data;
        if (leaf) leafResults[leaf] = data;
        await this.state.storage.put('leaf_results', leafResults);

        // If all leaves reported, publish final
        if (leafResults.D && leafResults.E && leafResults.F) {
          const final = leafResults;
          await this.state.storage.put('final', final);
          return new Response(JSON.stringify({ done: true, final }), { status: 200 });
        }

        return new Response(JSON.stringify({ ack: true }), { status: 200 });
      }
    }

    // Basic health for root
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({ node: 'R', status: 'healthy' }), { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
  }

  // helper: not strictly required but handy
  _sendTo(target, envelope) {
    return forwardTo(this.env, target, envelope);
  }
}

// ------------------- Inner Trinity: ANODE, BNODE, CNODE -------------------
export class ANODE {
  constructor(state, env) { this.state = state; this.env = env; }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/message') {
      const envelope = await request.json();
      if (envelope.to !== 'A') return new Response(JSON.stringify({ error: 'not-for-A' }), { status: 400 });

      const ts = Date.now();
      await Promise.all(['D','E'].map((node) =>
        forwardTo(this.env, node, {
          id: envelope.id,
          from: 'A',
          to: node,
          type: envelope.type || 'init',
          payload: envelope.payload,
          timestamp: ts
        })
      ));
      return new Response(JSON.stringify({ ack: true }), { status: 200 });
    }
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({ node: 'A', status: 'healthy' }), { status: 200 });
    }
    return new Response('Not Found', { status: 404 });
  }
}

export class BNODE {
  constructor(state, env) { this.state = state; this.env = env; }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/message') {
      const envelope = await request.json();
      if (envelope.to !== 'B') return new Response(JSON.stringify({ error: 'not-for-B' }), { status: 400 });

      await Promise.all(['E','F'].map((node) =>
        forwardTo(this.env, node, {
          id: envelope.id,
          from: 'B',
          to: node,
          type: envelope.type || 'init',
          payload: envelope.payload,
          timestamp: Date.now()
        })
      ));
      return new Response(JSON.stringify({ ack: true }), { status: 200 });
    }
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({ node: 'B', status: 'healthy' }), { status: 200 });
    }
    return new Response('Not Found', { status: 404 });
  }
}

export class CNODE {
  constructor(state, env) { this.state = state; this.env = env; }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/message') {
      const envelope = await request.json();
      if (envelope.to !== 'C') return new Response(JSON.stringify({ error: 'not-for-C' }), { status: 400 });

      await Promise.all(['D','F'].map((node) =>
        forwardTo(this.env, node, {
          id: envelope.id,
          from: 'C',
          to: node,
          type: envelope.type || 'init',
          payload: envelope.payload,
          timestamp: Date.now()
        })
      ));
      return new Response(JSON.stringify({ ack: true }), { status: 200 });
    }
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({ node: 'C', status: 'healthy' }), { status: 200 });
    }
    return new Response('Not Found', { status: 404 });
  }
}

// ------------------- Leaves (D, E, F) -------------------
export class DNODE {
  constructor(state, env) { this.state = state; this.env = env; }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/message') {
      const envelope = await request.json();
      if (envelope.to !== 'D') return new Response(JSON.stringify({ error: 'not-for-D' }), { status: 400 });

      // Idempotence
      const seen = await this.state.storage.get(`seen_${envelope.id}`);
      if (seen) return new Response(JSON.stringify({ ack: true, cached: true }), { status: 200 });
      await this.state.storage.put(`seen_${envelope.id}`, true);

      // Report leaf result back to R
      const root = this.env.R_NODE.get(this.env.R_NODE.idFromName('R'));
      await root.fetch('/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: envelope.id, from: 'D', to: 'R', type: 'leaf', payload: { leaf: 'D', data: `D_proc:${Date.now()}` } })
      });

      return new Response(JSON.stringify({ ack: true }), { status: 200 });
    }
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({ node: 'D', status: 'healthy' }), { status: 200 });
    }
    return new Response('Not Found', { status: 404 });
  }
}

export class ENODE extends DNODE {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/message') {
      const envelope = await request.json();
      if (envelope.to !== 'E') return new Response(JSON.stringify({ error: 'not-for-E' }), { status: 400 });

      const seen = await this.state.storage.get(`seen_${envelope.id}`);
      if (seen) return new Response(JSON.stringify({ ack: true, cached: true }), { status: 200 });
      await this.state.storage.put(`seen_${envelope.id}`, true);

      const root = this.env.R_NODE.get(this.env.R_NODE.idFromName('R'));
      await root.fetch('/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: envelope.id, from: 'E', to: 'R', type: 'leaf', payload: { leaf: 'E', data: `E_proc:${Date.now()}` } })
      });
      return new Response(JSON.stringify({ ack: true }), { status: 200 });
    }
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({ node: 'E', status: 'healthy' }), { status: 200 });
    }
    return new Response('Not Found', { status: 404 });
  }
}

export class FNODE extends ENODE {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/message') {
      const envelope = await request.json();
      if (envelope.to !== 'F') return new Response(JSON.stringify({ error: 'not-for-F' }), { status: 400 });

      const seen = await this.state.storage.get(`seen_${envelope.id}`);
      if (seen) return new Response(JSON.stringify({ ack: true, cached: true }), { status: 200 });
      await this.state.storage.put(`seen_${envelope.id}`, true);

      const root = this.env.R_NODE.get(this.env.R_NODE.idFromName('R'));
      await root.fetch('/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: envelope.id, from: 'F', to: 'R', type: 'leaf', payload: { leaf: 'F', data: `F_proc:${Date.now()}` } })
      });
      return new Response(JSON.stringify({ ack: true }), { status: 200 });
    }
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({ node: 'F', status: 'healthy' }), { status: 200 });
    }
    return new Response('Not Found', { status: 404 });
  }
}

// ------------------- Public Router -------------------
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Global health probe
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'kenosis-mesh-edge-healthy' }), { status: 200 });
    }

    // Route all message POSTs to RNode for distribution
    if (request.method === 'POST' && url.pathname === '/message') {
      const root = env.R_NODE.get(env.R_NODE.idFromName('R'));
      return root.fetch('/message', request);
    }

    return new Response('Not Found', { status: 404 });
  }
}