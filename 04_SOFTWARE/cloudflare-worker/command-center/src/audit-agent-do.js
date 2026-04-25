// Autonomous Audit Agent Durable Object
// Monitors system health, detects anomalies, triggers alerts
class AuditAgentDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.agentId = state.id.toString();
    this.monitoring = false;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/internal/monitor' && request.method === 'POST') {
      return this.startMonitoring(request);
    }

    if (url.pathname === '/internal/analyze' && request.method === 'POST') {
      return this.analyzeAnomaly(request);
    }

    if (url.pathname === '/internal/status' && request.method === 'GET') {
      return new Response(JSON.stringify({
        agent_id: this.agentId,
        monitoring: this.monitoring,
        status: 'active'
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('Not Found', { status: 404 });
  }

  async startMonitoring(request) {
    const body = await request.json();
    this.monitoring = true;

    try {
      const anomalies = await this.detectAnomalies(body.scope);

      if (anomalies.length > 0) {
        // Trigger mechanic agent for critical issues
        await this.triggerRemediation(anomalies);
      }

      await this.logAgentAction({
        success: true,
        action: 'anomaly_detection',
        details: { anomalies_found: anomalies.length, scope: body.scope },
        rationale: `Detected ${anomalies.length} anomalies in ${body.scope}`,
        confidence: 0.90
      });

      return new Response(JSON.stringify({
        success: true,
        agent_id: this.agentId,
        anomalies,
        critical_count: anomalies.filter(a => a.severity === 'critical').length
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
      await this.logAgentAction({
        success: false,
        action: 'anomaly_detection',
        details: { error: error.message },
        rationale: 'Anomaly detection failed',
        confidence: 0.0
      });

      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  async analyzeAnomaly(request) {
    const body = await request.json();

    try {
      const analysis = await this.performDeepAnalysis(body);

      await this.logAgentAction({
        success: true,
        action: 'deep_analysis',
        details: { target: body.target, findings: analysis.findings.length },
        rationale: `Deep analysis of ${body.target} completed`,
        confidence: 0.85
      });

      return new Response(JSON.stringify({
        success: true,
        agent_id: this.agentId,
        analysis
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  async detectAnomalies(scope = 'all') {
    const anomalies = [];

    // Check worker health
    if (scope === 'all' || scope === 'workers') {
      const workers = await this.env.EPCP_DB.prepare(
        `SELECT * FROM workers WHERE status != 'quarantined'`
      ).all();

      for (const worker of workers.results || []) {
        // Check for stale health updates (> 5 minutes)
        const lastHealthAge = Date.now() - (worker.last_health || 0);
        if (lastHealthAge > 300000) {
          anomalies.push({
            type: 'stale_health',
            severity: 'high',
            target: worker.id,
            details: `No health update for ${Math.round(lastHealthAge / 60000)} minutes`,
            detected_at: Date.now()
          });
        }

        // Check for error status
        if (worker.status === 'error') {
          anomalies.push({
            type: 'worker_error',
            severity: 'critical',
            target: worker.id,
            details: 'Worker in error state',
            detected_at: Date.now()
          });
        }
      }
    }

    // Check deployment failures
    if (scope === 'all' || scope === 'deployments') {
      const failedDeployments = await this.env.EPCP_DB.prepare(
        `SELECT * FROM deployments 
         WHERE status = 'failed' 
         AND created_at > ?
         ORDER BY created_at DESC LIMIT 10`
      ).bind(Date.now() - 3600000).all(); // Last hour

      for (const dep of failedDeployments.results || []) {
        anomalies.push({
          type: 'deployment_failure',
          severity: 'high',
          target: dep.worker_id,
          details: `Deployment ${dep.version} failed at ${new Date(dep.created_at).toISOString()}`,
          detected_at: Date.now()
        });
      }
    }

    // Check queue backlog
    if (scope === 'all' || scope === 'queue') {
      const queueStats = await this.env.EPCP_DB.prepare(
        `SELECT status, COUNT(*) as count 
         FROM crdt_queue 
         WHERE created_at > ?
         GROUP BY status`
      ).bind(Date.now() - 900000).all(); // Last 15 minutes

      const pendingCount = queueStats.results?.find(r => r.status === 'pending')?.count || 0;
      const processingCount = queueStats.results?.find(r => r.status === 'processing')?.count || 0;

      if (pendingCount > 10) {
        anomalies.push({
          type: 'queue_backlog',
          severity: 'medium',
          target: 'crdt_queue',
          details: `${pendingCount} pending operations in queue`,
          detected_at: Date.now()
        });
      }

      if (processingCount > 5) {
        anomalies.push({
          type: 'queue_stuck',
          severity: 'high',
          target: 'crdt_queue',
          details: `${processingCount} operations stuck in processing state`,
          detected_at: Date.now()
        });
      }
    }

    // Check mesh connectivity
    if (scope === 'all' || scope === 'mesh') {
      const meshState = await this.env.EPCP_DB.prepare(
        `SELECT * FROM mesh_state 
         WHERE updated_at < ?`
      ).bind(Date.now() - 60000).all(); // Not updated in 1 minute

      for (const state of meshState.results || []) {
        anomalies.push({
          type: 'mesh_stale',
          severity: 'medium',
          target: state.key,
          details: `Mesh state not updated for ${Math.round((Date.now() - state.updated_at) / 1000)}s`,
          detected_at: Date.now()
        });
      }
    }

    return anomalies;
  }

  async performDeepAnalysis(target) {
    const findings = [];

    // Analyze worker-specific issues
    if (target.startsWith('worker:')) {
      const workerId = target.replace('worker:', '');
      const worker = await this.env.EPCP_DB.prepare(
        `SELECT * FROM workers WHERE id = ?`
      ).bind(workerId).first();

      if (worker) {
        const recentDeployments = await this.env.EPCP_DB.prepare(
          `SELECT * FROM deployments 
           WHERE worker_id = ? 
           ORDER BY created_at DESC LIMIT 5`
        ).bind(workerId).all();

        const failureRate = recentDeployments.results?.filter(d => d.status === 'failed').length / 
                           (recentDeployments.results?.length || 1);

        findings.push({
          category: 'deployment_reliability',
          metric: 'failure_rate',
          value: failureRate,
          assessment: failureRate > 0.5 ? 'poor' : 'acceptable'
        });

        // Check health history
        const healthHistory = await this.env.EPCP_DB.prepare(
          `SELECT * FROM node_health_history 
           WHERE node_id = ? 
           ORDER BY ts DESC LIMIT 20`
        ).bind(workerId).all();

        if (healthHistory.results?.length > 0) {
          const avgLatency = healthHistory.results.reduce((sum, h) => sum + (h.latency_ms || 0), 0) / 
                           healthHistory.results.length;
          const errorRate = healthHistory.results.reduce((sum, h) => sum + (h.error_rate || 0), 0) / 
                          healthHistory.results.length;

          findings.push({
            category: 'performance',
            metric: 'avg_latency_ms',
            value: avgLatency,
            assessment: avgLatency > 1000 ? 'degraded' : 'healthy'
          });

          findings.push({
            category: 'reliability',
            metric: 'error_rate',
            value: errorRate,
            assessment: errorRate > 0.1 ? 'unreliable' : 'stable'
          });
        }
      }
    }

    // Analyze queue patterns
    if (target === 'crdt_queue') {
      const queueTrends = await this.env.EPCP_DB.prepare(
        `SELECT status, COUNT(*) as count, AVG(processed_at - created_at) as avg_processing_time
         FROM crdt_queue 
         WHERE created_at > ?
         GROUP BY status`
      ).bind(Date.now() - 3600000).all();

      findings.push({
        category: 'queue_health',
        metric: 'hourly_stats',
        value: queueTrends.results,
        assessment: 'trending'
      });
    }

    return {
      target,
      timestamp: Date.now(),
      findings,
      summary: this.generateSummary(findings)
    };
  }

  generateSummary(findings) {
    const critical = findings.filter(f => f.assessment === 'poor' || f.assessment === 'degraded' || f.assessment === 'unreliable');
    const warning = findings.filter(f => f.assessment === 'acceptable' || f.assessment === 'trending');

    if (critical.length > 0) {
      return `Critical issues detected: ${critical.map(f => f.metric).join(', ')}`;
    } else if (warning.length > 0) {
      return `Warning: ${warning.map(f => f.metric).join(', ')} need attention`;
    }
    return 'All systems healthy';
  }

  async triggerRemediation(anomalies) {
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');

    for (const anomaly of criticalAnomalies) {
      if (anomaly.type === 'worker_error' || anomaly.type === 'deployment_failure') {
        // Spawn mechanic agent for remediation
        const mechanicId = this.env.MECHANIC_AGENT_DO.newUniqueId();
        const mechanic = this.env.MECHANIC_AGENT_DO.get(mechanicId);

        await mechanic.executeTask({
          operation: {
            type: 'health_remediation',
            worker_id: anomaly.target
          },
          target: 'worker'
        });
      }
    }
  }

  async logAgentAction(result) {
    if (!this.env.EPCP_DB) return;

    await this.env.EPCP_DB.prepare(
      `INSERT INTO events 
       (ts, actor, action, target, agent_id, decision_rationale, confidence_score, model_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      new Date().toISOString(),
      'agent:audit',
      result.action,
      result.details?.target || 'system',
      this.agentId,
      result.rationale,
      result.confidence,
      '1.0.0'
    ).run();
  }
}

module.exports = { AuditAgentDO };
