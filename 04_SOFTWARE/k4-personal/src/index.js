/**
 * k4-personal — Entry point for PersonalAgent DOs
 *
 * Routes /agent/:userId/* to PersonalAgent instances
 */

import { PersonalAgent } from './personal-agent.js';
export { PersonalAgent };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Route /agent/:userId/* to PersonalAgent DO
    const agentMatch = url.pathname.match(/^\/agent\/([^/]+)(\/.*)?$/);
    if (agentMatch) {
      const userId = agentMatch[1];
      const subPath = agentMatch[2] || "/health";
      const id = env.PERSONAL_AGENT.idFromName(userId);
      const stub = env.PERSONAL_AGENT.get(id);
      return stub.fetch(new Request(new URL(subPath, request.url), request));
    }

    // Health check
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", service: "k4-personal" });
    }

    return new Response("k4-personal alive", { status: 200 });
  }
};