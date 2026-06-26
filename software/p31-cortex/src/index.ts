    // Health check
    if (path === "/health" && request.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "ok",
          worker: "p31-cortex",
          version: "0.1.0",
          agents: AGENT_BINDINGS.map(a => a.key),
          timestamp: new Date().toISOString()
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

