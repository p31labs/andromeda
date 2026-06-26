    // Health check — no auth required
    if (path === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'p31-sync',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

