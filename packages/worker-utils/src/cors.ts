/**
 * P31 Worker CORS Utilities
 *
 * Standard CORS headers for P31 Cloudflare Workers.
 * One source for CORS configuration across the worker fleet.
 *
 * @module @p31/worker-utils/cors
 */

/**
 * Standard P31 CORS headers (open for cross-origin mesh access)
 */
export const P31_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-P31-Client, X-P31-Session",
  "Access-Control-Max-Age": "86400",
};

/**
 * Restricted CORS headers for sensitive endpoints
 * (e.g., authentication, payments)
 */
export const P31_CORS_RESTRICTED: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

/**
 * Create CORS headers with a specific allowed origin
 */
export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    ...P31_CORS_HEADERS,
    "Access-Control-Allow-Origin": origin || "*",
    Vary: "Origin",
  };
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflight(origin: string | null): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

/**
 * Check if a request needs CORS handling
 */
export function isCorsPreflight(request: Request): boolean {
  return request.method === "OPTIONS";
}
