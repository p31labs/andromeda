    // Health check
    if (pathParts.length === 0 || (pathParts[0] === 'health' && pathParts.length === 1)) {
      return json({
        status: 'ok',
        service: 'love-ledger',
        version: '1.3.0',
        timestamp: new Date().toISOString(),
      });
    }

