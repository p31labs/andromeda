/**
 * Shared live telemetry + perf flags for Sovereign Cockpit surfaces (/dome + hub).
 */

export const TELEMETRY_URLS = {
  qFactor: "https://k4-hubs.trimtab-signal.workers.dev/hub/q-factor",
  love: "https://p31-workers.trimtab-signal.workers.dev/api/love/balance/will-001",
  spoons: "https://k4-personal.trimtab-signal.workers.dev/agent/will/energy",
} as const;

export function readDomePerfLite(): boolean {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(location.search);
  if (q.get("perf") === "lite") return true;
  try {
    return localStorage.getItem("p31:dome:perf") === "lite";
  } catch {
    return false;
  }
}

/** Trim-tab readout: sub-kHz uses Hz; at/above 1 kHz uses "k Hz". */
export function formatTrimHz(hz: number): string {
  if (hz >= 1000) return `${(hz / 1000).toFixed(2)}k Hz`;
  return `${Math.round(hz)}Hz`;
}

export async function fetchWithCache<T extends object>(
  url: string,
  cacheKey: string,
  fallback: T
): Promise<T> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Network error");
    const data = (await response.json()) as T;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch {
      /* quota / private mode */
    }
    return data;
  } catch {
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? (JSON.parse(cached) as T) : fallback;
    } catch {
      return fallback;
    }
  }
}
