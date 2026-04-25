// Server-Sent Events Stream for G.O.D. Dashboard
// Provides real-time updates: worker health, queue changes, mesh state
export async function handleSseStream(request, env) {
  // SSE headers for streaming
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  };
  
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  
  // Send initial handshake
  writer.write(encoder.encode(`: connected\n`));
  writer.write(encoder.encode(`event: hello\ndata: ${JSON.stringify({ ts: Date.now(), status: 'connected' })}\n\n`));
  
  // Start polling loop
  let lastWorkerHash = '';
  let lastQueueHash = '';
  let lastMeshHash = '';
  
  const pollInterval = setInterval(async () => {
    try {
      // 1. Poll worker health from D1
      if (env.EPCP_DB) {
        const workersResult = await env.EPCP_DB.prepare(
          'SELECT * FROM workers ORDER BY last_health DESC LIMIT 50'
        ).all();
        const workers = workersResult.results || [];
        
        // Only send if changed
        const workersHash = JSON.stringify(workers.map(w => [w.id, w.status, w.last_health]));
        if (workersHash !== lastWorkerHash) {
          writer.write(encoder.encode(`event: workers\ndata: ${JSON.stringify({ workers })}\n\n`));
          lastWorkerHash = workersHash;
        }
      }
      
      // 2. Poll CRDT queue
      if (env.EPCP_DB) {
        const queueResult = await env.EPCP_DB.prepare(
          'SELECT * FROM crdt_queue ORDER BY priority DESC, created_at ASC LIMIT 100'
        ).all();
        const queue = queueResult.results || [];
        
        const queueHash = JSON.stringify(queue.map(q => [q.id, q.status, q.priority]));
        if (queueHash !== lastQueueHash) {
          writer.write(encoder.encode(`event: queue\ndata: ${JSON.stringify({ queue })}\n\n`));
          lastQueueHash = queueHash;
        }
      }
      
      // 3. Poll mesh state (vertices, edges)
      if (env.EPCP_DB) {
        const meshResult = await env.EPCP_DB.prepare(
          "SELECT * FROM mesh_state WHERE key LIKE 'vertex:%' OR key LIKE 'edge:%' OR key = 'total:love'"
        ).all();
        const meshState = meshResult.results || [];
        
        const meshHash = JSON.stringify(meshState.map(m => [m.key, m.updated_at]));
        if (meshHash !== lastMeshHash) {
          writer.write(encoder.encode(`event: mesh\ndata: ${JSON.stringify({ state: meshState })}\n\n`));
          lastMeshHash = meshHash;
        }
      }
      
      // Heartbeat every 30s
      writer.write(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
      
    } catch (error) {
      writer.write(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`));
    }
  }, 1000); // Poll every second (low-latency updates)
  
  // Cleanup on client disconnect
  request.signal.addEventListener('abort', () => {
    clearInterval(pollInterval);
    writer.close();
  });
  
  return new Response(stream.readable, { headers });
}
