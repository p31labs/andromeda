    if (url.pathname === "/health" && request.method === "GET") {
      const pkg = typeof env.WORKER_VERSION === "string" && env.WORKER_VERSION.trim() ? env.WORKER_VERSION.trim() : "0.2.2";
      return Response.json({
        status: "ok",
        service: "geodesic-room",
        version: pkg,
        wireSchema: GEODESIC_ROOM_WIRE_SCHEMA,
        timestamp: new Date().toISOString(),
      });
    }
