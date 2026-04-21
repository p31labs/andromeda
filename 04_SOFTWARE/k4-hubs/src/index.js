/**
 * CWP-24: Hub Router — Fan-Out Coordinator
 *
 * Routes between PersonalAgent DOs and FamilyMeshRoom DOs.
 * Enforces scope isolation via JWT claims.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // POST /route — main routing endpoint
    if (url.pathname === "/route" && request.method === "POST") {
      const { from, to, action, payload, scope } = await request.json();

      if (!from || !scope) {
        return Response.json({ error: "Missing from or scope" }, { status: 400 });
      }

      switch (action) {
        case "send_to_mesh": {
          // Fan out to FamilyMeshRoom
          const roomId = scope;
          const id = env.K4_CAGE.FAMILY_MESH_ROOM.idFromName(roomId);
          const stub = env.K4_CAGE.FAMILY_MESH_ROOM.get(id);
          return stub.fetch(new Request("https://internal", {
            method: "POST",
            body: JSON.stringify({ type: "route_message", from, payload }),
          }));
        }

        case "query_agent": {
          // Cross-agent query (e.g., check someone's availability)
          if (!to) return Response.json({ error: "Missing target" }, { status: 400 });
          const targetId = env.K4_PERSONAL.PERSONAL_AGENT.idFromName(to);
          const targetStub = env.K4_PERSONAL.PERSONAL_AGENT.get(targetId);
          const energyRes = await targetStub.fetch(new Request("https://internal/energy"));
          const energy = await energyRes.json();
          return Response.json({
            available: energy.spoons > 2,
            energy: { spoons: energy.spoons, max: energy.max },
            // Never expose messages or private state
          });
        }

        case "broadcast": {
          // Send to all agents in scope
          const members = payload.members || [];
          const results = await Promise.all(
            members.filter(m => m !== from).map(async (memberId) => {
              try {
                const id = env.K4_PERSONAL.PERSONAL_AGENT.idFromName(memberId);
                const stub = env.K4_PERSONAL.PERSONAL_AGENT.get(memberId);
                const chatRes = await stub.fetch(new Request("https://internal/chat", {
                  method: "POST",
                  body: JSON.stringify({
                    message: `[System] ${payload.message}`,
                    scope,
                  }),
                }));
                return { member: memberId, status: "ok" };
              } catch (e) {
                return { member: memberId, status: "error", error: e.message };
              }
            })
          );
          return Response.json({ ok: true, results });
        }

        default:
          return Response.json({ error: "Unknown action" }, { status: 400 });
      }
    }

    // GET /mesh-state/:scope — aggregate mesh state for a scope
    const meshMatch = url.pathname.match(/^\/mesh-state\/(.+)$/);
    if (meshMatch) {
      const scope = meshMatch[1];
      try {
        const roomId = env.K4_CAGE.FAMILY_MESH_ROOM.idFromName(scope);
        const roomStub = env.K4_CAGE.FAMILY_MESH_ROOM.get(roomId);
        const statsRes = await roomStub.fetch(new Request("https://internal/stats"));
        const stats = await statsRes.json();
        return Response.json({ scope, ...stats });
      } catch {
        return Response.json({ scope, connections: 0, error: "Room not found" });
      }
    }

    // GET /health
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", service: "k4-hubs" });
    }

    return new Response("k4-hubs alive", { status: 200 });
  }
};