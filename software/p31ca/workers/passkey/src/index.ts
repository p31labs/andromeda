    // Health check
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({
        status: 'ok',
        service: 'p31-passkey',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
      });
    }

