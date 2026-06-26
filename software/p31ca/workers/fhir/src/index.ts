    // Health check — no auth required
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({
        status: 'ok',
        service: 'p31-fhir',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
      });
    }

