/**
 * WebSocket broadcast event builders — pure functions, no Cloudflare deps.
 * Used by hub-base._broadcast() and testable from Node.
 */

export const WS_EVENT_SCHEMA = "p31.k4HubStream/1.0.0";

/**
 * Build a typed broadcast event envelope.
 * kind: "hello" | "pong" | "dock" | "call" | "fanout"
 */
export function buildBroadcastEvent(kind, payload = {}) {
  return {
    schema: WS_EVENT_SCHEMA,
    kind,
    ts: Date.now(),
    ...payload,
  };
}

export function buildDockEvent(hubId, clientId, sessionId) {
  return buildBroadcastEvent("dock", { hub: hubId, clientId, sessionId });
}

export function buildCallEvent(hubId, skillId, sessionId, dispatcher) {
  return buildBroadcastEvent("call", { hub: hubId, skillId, sessionId, dispatcher });
}
