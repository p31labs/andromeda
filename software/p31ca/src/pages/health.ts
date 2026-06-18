import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const startTime = performance.now();

  // Get service metrics
  const cpuUsage = process.cpuUsage();
  const memoryUsage = process.memoryUsage();

  // Calculate CPU percentage (rough approximation)
  // Note: This is a simplified calculation - in production you'd want to sample over time
  const cpuPercent = Math.round((cpuUsage.user + cpuUsage.system) / 10000); // Convert to centiseconds, approximate as %

  const healthData = {
    ok: true,
    service: 'p31ca',
    ts: new Date().toISOString(),
    note: 'Static Astro build — liveness confirmed. Worker probes live on command-center.',
    // Service Multimeter metrics
    cpu_pct: Math.min(cpuPercent, 100), // Cap at 100%
    rss_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    // Disk I/O is harder to get accurately in Node.js - using placeholder for now
    // In a real implementation, you might use fs.stats or external monitoring
    disk_iops: 0, // Placeholder - would need implementation
    // Latency/Jitter Gauge - measuring this endpoint's response time
    latency_p99_ms: 0, // For a single measurement, p99 is the same as the value
    latency_jitter_ms: 0, // For a single measurement, jitter is 0
  };

  const endTime = performance.now();
  const latencyMs = Math.round(endTime - startTime);

  // Update latency metrics (for a single request, p99 = latency, jitter = 0)
  healthData.latency_p99_ms = latencyMs;
  healthData.latency_jitter_ms = 0;

  return new Response(
    JSON.stringify(healthData),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  );
};
