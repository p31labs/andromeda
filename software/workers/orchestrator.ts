    // Health check — supports both / and /health
    if (pathParts.length === 0 || (pathParts[0] === 'health' && pathParts.length === 1)) {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'p31-orchestrator',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
