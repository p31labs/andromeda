/**
 * P31 Worker Response Utilities
 *
 * Standard JSON response helpers for P31 Cloudflare Workers.
 * One source for response patterns across the worker fleet.
 *
 * @module @p31/worker-utils/response
 */

import { corsHeaders } from "./cors.js";

export interface JsonResponseOptions {
  status?: number;
  origin?: string | null;
  cache?: string;
  headers?: Record<string, string>;
}

/**
 * Create a JSON response with standard P31 headers
 */
export function json(
  body: unknown,
  options: JsonResponseOptions = {}
): Response {
  const {
    status = 200,
    origin = "*",
    cache = "no-cache",
    headers = {},
  } = options;

  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": cache,
      ...corsHeaders(origin),
      ...headers,
    },
  });
}

/**
 * Create an error response
 */
export function error(
  message: string,
  status = 400,
  origin: string | null = "*"
): Response {
  return json({ error: message }, { status, origin });
}

/**
 * Create a not found response
 */
export function notFound(
  path?: string,
  origin: string | null = "*"
): Response {
  return error(
    path ? `Not found: ${path}` : "Not found",
    404,
    origin
  );
}

/**
 * Create a health check response
 */
export interface HealthStatus {
  service: string;
  version: string;
  status: "ok" | "degraded" | "down";
  timestamp: string;
  [key: string]: unknown;
}

export function health(
  status: HealthStatus,
  origin: string | null = "*"
): Response {
  return json(
    {
      ...status,
      timestamp: status.timestamp || new Date().toISOString(),
    },
    {
      status: status.status === "ok" ? 200 : status.status === "degraded" ? 200 : 503,
      origin,
      cache: "no-cache",
    }
  );
}

/**
 * Create a success response
 */
export function success(
  data: Record<string, unknown>,
  origin: string | null = "*"
): Response {
  return json({ ok: true, ...data }, { origin });
}

/**
 * Standard API index/discovery response
 */
export function apiIndex(
  name: string,
  version: string,
  endpoints: string[],
  origin: string | null = "*"
): Response {
  return json(
    {
      name,
      version,
      endpoints,
      timestamp: new Date().toISOString(),
    },
    { origin }
  );
}
