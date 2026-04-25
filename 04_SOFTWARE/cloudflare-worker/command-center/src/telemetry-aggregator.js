// Telemetry Aggregator for G.O.D. Dashboard
// Centralized health monitoring for all workers and mesh services

export class TelemetryAggregator {
  constructor(env) {
    this.env = env;
    this.workerEndpoints = [
      {
        name: 'command-center',
        url: 'https://command-center.trimtab-signal.workers.dev/api/health',
        type: 'command-center'
      },
      {
        name: 'bouncer',
        url: 'https://p31-bouncer.trimtab-signal.workers.dev/health',
        type: 'bouncer'
      },
      {
        name: 'social-drop-automation',
        url: 'https://social.p31ca.org/health',
        type: 'social-worker'
      },
      {
        name: 'k4-cage',
        url: 'https://k4-cage.trimtab-signal.workers.dev/api/health',
        type: 'mesh-service'
      },
      {
        name: 'k4-personal',
        url: 'https://k4-personal.trimtab-signal.workers.dev/api/health',
        type: 'mesh-service'
      },
      {
        name: 'k4-hubs',
        url: 'https://k4-hubs.trimtab-signal.workers.dev/api/health',
        type: 'mesh-service'
      }
    ];
  }

  async collectAll() {
    const timestamp = Date.now();
    const results = await Promise.allSettled(
      this.workerEndpoints.map((ep) => this.checkEndpoint(ep))
    );

    const workerStates = results.map((result, i) => {
      const endpoint = this.workerEndpoints[i];
      if (result.status === 'fulfilled') {
        return { ...endpoint, ...result.value, timestamp };
      }
      return {
        ...endpoint,
        ok: false,
        status: 'offline',
        error: result.reason?.message || 'Connection failed',
        timestamp
      };
    });

    await this.storeInD1(workerStates);
    await this.updateKV(workerStates);
    
    return workerStates;
  }

  async checkEndpoint(endpoint) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(endpoint.url, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      const data = await response.json();
      return {
        ok: response.ok,
        status: 'active',
        response_time: Date.now() - new Date(response.headers.get('date') || Date.now()),
        features: data.features || [],
        checks: data.checks || {},
        uptime: data.uptime || data.ok ? 100 : 0
      };
    } catch (error) {
      return {
        ok: false,
        status: 'error',
        error: error.message,
        response_time: null,
        uptime: 0
      };
    }
  }

  async storeInD1(states) {
    if (!this.env.EPCP_DB) return;

    for (const state of states) {
      await this.env.EPCP_DB.prepare(
        `INSERT OR REPLACE INTO workers 
         (id, name, type, version, deployed_at, status, last_health, config, endpoint_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        state.name,
        state.name,
        state.type,
        state.version || '1.0.0',
        state.timestamp,
        state.status,
        state.timestamp,
        JSON.stringify({ ok: state.ok, features: state.features || [] }),
        state.url
      ).run();
    }
  }

  async updateKV(states) {
    if (!this.env.STATUS_KV) return;

    const current = await this.env.STATUS_KV.get('worker_health');
    const currentData = current ? JSON.parse(current) : {};
    
    const healthData = {};
    for (const state of states) {
      healthData[state.name] = {
        status: state.status,
        ok: state.ok,
        last_check: state.timestamp,
        response_time: state.response_time,
        uptime: state.uptime
      };
    }

    await this.env.STATUS_KV.put('worker_health', JSON.stringify({
      ...currentData,
      ...healthData,
      last_updated: Date.now()
    }));
  }

  async getHealth() {
    // Try KV first (faster)
    if (this.env.STATUS_KV) {
      const cached = await this.env.STATUS_KV.get('worker_health');
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Fallback to D1
    if (this.env.EPCP_DB) {
      const workers = await this.env.EPCP_DB.prepare(
        'SELECT * FROM workers ORDER BY last_health DESC'
      ).all();
      return workers.results || [];
    }

    return { error: 'No storage available' };
  }
}

export async function runTelemetryCollection(env) {
  const aggregator = new TelemetryAggregator(env);
  try {
    const results = await aggregator.collectAll();
    return {
      ok: true,
      timestamp: Date.now(),
      workers: results
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}