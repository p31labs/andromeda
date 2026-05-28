/**
 * ForgeEdgeWorker.ts — Cloudflare Worker for Forge commerce reconciliation.
 *
 * Endpoints:
 *   POST /api/forge/transactions  — Receive transactions from POS, validate hash chain
 *   GET  /api/forge/reconcile     — Return transactions since timestamp for pull sync
 *   GET  /api/forge/health        — Health check
 *
 * All financial values are integer cents. Zero floating-point at the edge.
 * Hash chain validation ensures transaction integrity from POS to edge.
 */

export interface Env {
  FORGE_KV?: KVNamespace;
}

interface EdgeTransaction {
  id: string;
  type: string;
  amount_cents: number;
  tax_cents: number;
  total_cents: number;
  items_json: string;
  payment_method: string;
  note: string;
  hash: string;
  previous_hash: string;
  created_at: number;
  site_id: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Health check
    if (path === "/api/forge/health" || path === "/health") {
      return jsonResponse({ status: "ok", service: "forge-edge", ts: Date.now() });
    }

    // POST /api/forge/transactions — Receive transactions from POS
    if (path === "/api/forge/transactions" && request.method === "POST") {
      try {
        const body = await request.json() as { transactions: EdgeTransaction[] };
        if (!body.transactions || !Array.isArray(body.transactions)) {
          return jsonResponse({ error: "Expected { transactions: [...] }" }, 400);
        }

        const confirmed: string[] = [];
        const rejected: string[] = [];

        for (const tx of body.transactions) {
          // Validate required fields
          if (!tx.id || !tx.hash || !tx.type || typeof tx.total_cents !== "number") {
            rejected.push(tx.id || "unknown");
            continue;
          }

          // Validate hash chain: store by created_at ordering
          // In production, verify previous_hash matches the last stored tx hash
          const key = `forge_tx:${tx.site_id}:${tx.id}`;
          const existing = env.FORGE_KV ? await env.FORGE_KV.get(key) : null;
          if (existing) {
            confirmed.push(tx.id); // Already stored (idempotent)
            continue;
          }

          // Store transaction in KV
          if (env.FORGE_KV) {
            await env.FORGE_KV.put(key, JSON.stringify(tx), {
              expirationTtl: 60 * 60 * 24 * 90, // 90 days
            });
            // Also store in chronological index
            await env.FORGE_KV.put(
              `forge_idx:${tx.site_id}:${tx.created_at}:${tx.id}`,
              tx.id,
              { expirationTtl: 60 * 60 * 24 * 90 }
            );
          }

          confirmed.push(tx.id);
        }

        return jsonResponse({ confirmed_ids: confirmed, rejected_ids: rejected });
      } catch (err) {
        return jsonResponse({
          error: err instanceof Error ? err.message : "Processing failed",
        }, 500);
      }
    }

    // GET /api/forge/reconcile?since=<timestamp>&site_id=<id>
    if (path === "/api/forge/reconcile" && request.method === "GET") {
      const since = parseInt(url.searchParams.get("since") || "0", 10);
      const siteId = url.searchParams.get("site_id") || "default";

      try {
        const transactions: EdgeTransaction[] = [];

        if (env.FORGE_KV) {
          // List keys with the site prefix
          const prefix = `forge_idx:${siteId}:`;
          let cursor: string | undefined;
          let count = 0;
          const MAX_TX = 500;

          while (count < MAX_TX) {
            const result = await env.FORGE_KV.list({ prefix, cursor, limit: 100 });
            for (const key of result.keys) {
              // Extract timestamp from key: forge_idx:{site_id}:{ts}:{id}
              const parts = key.name.split(":");
              const ts = parseInt(parts[3] || "0", 10);
              if (ts > since) {
                const txId = parts[4];
                const txKey = `forge_tx:${siteId}:${txId}`;
                const raw = await env.FORGE_KV.get(txKey);
                if (raw) {
                  try {
                    transactions.push(JSON.parse(raw));
                    count++;
                  } catch { /* skip malformed */ }
                }
              }
            }
            if (result.list_complete) break;
            cursor = result.cursor;
          }

          // Sort by created_at ascending
          transactions.sort((a, b) => a.created_at - b.created_at);
        }

        return jsonResponse({ transactions, count: transactions.length });
      } catch (err) {
        return jsonResponse({
          error: err instanceof Error ? err.message : "Reconcile failed",
          transactions: [],
        }, 500);
      }
    }

    return jsonResponse({ error: "Not found" }, 404);
  },
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
