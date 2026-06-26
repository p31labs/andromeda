    if (path === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'spin-logistics',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
