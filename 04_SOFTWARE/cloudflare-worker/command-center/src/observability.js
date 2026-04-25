// Real-time observability hooks for Social Media Engine
export function setupObservability(env) {
  const metrics = {
    social_worker_health: 0,
    platform_auth_failures: 0,
    rate_limit_hits: 0,
    broadcast_success: 0,
    broadcast_failures: 0,
    last_execution: null
  };

  // Monitor worker status
  async function checkWorkerHealth() {
    try {
      const response = await fetch('https://social.p31ca.org/status');
      const data = await response.json();
      
      // Check platform auth
      const platforms = data.platforms || {};
      const failures = Object.values(platforms).filter(p => !p).length;
      
      metrics.social_worker_health = response.ok ? 1 : 0;
      metrics.platform_auth_failures = failures;
      metrics.last_execution = new Date().toISOString();
      
      // Log to KV for persistence
      if (env.STATUS_KV) {
        await env.STATUS_KV.put('social_worker_health', JSON.stringify(metrics));
      }
      
      return metrics;
    } catch (error) {
      metrics.social_worker_health = 0;
      metrics.last_execution = new Date().toISOString();
      return metrics;
    }
  }

  // Track broadcast results
  function trackBroadcast(result) {
    if (result.status === 'broadcast_complete') {
      metrics.broadcast_success++;
    } else {
      metrics.broadcast_failures++;
    }
    
    // Check for rate limit indicators
    if (result.platforms) {
      Object.values(result.platforms).forEach(platform => {
        if (platform.error && platform.error.includes('rate limit')) {
          metrics.rate_limit_hits++;
        }
      });
    }
  }

  return {
    checkWorkerHealth,
    trackBroadcast,
    getMetrics: () => metrics
  };
}
