// Autonomous Mechanic Agent Durable Object
// Handles deployment rollbacks, node quarantine, and failure remediation
class MechanicAgentDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.agentId = state.id.toString();
    this.task = null;
    this.startTime = Date.now();
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/internal/execute' && request.method === 'POST') {
      return this.executeTask(request);
    }

    if (url.pathname === '/internal/status' && request.method === 'GET') {
      return new Response(JSON.stringify({
        agent_id: this.agentId,
        task: this.task,
        uptime: Date.now() - this.startTime,
        status: 'active'
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('Not Found', { status: 404 });
  }

  async executeTask(request) {
    const body = await request.json();
    this.task = body;

    try {
      let result;
      switch (body.operation.type) {
        case 'deployment_rollback':
          result = await this.handleRollback(body.operation);
          break;
        case 'node_quarantine':
          result = await this.handleQuarantine(body.operation);
          break;
        case 'dependency_update':
          result = await this.handleDependencyUpdate(body.operation);
          break;
        case 'health_remediation':
          result = await this.handleHealthRemediation(body.operation);
          break;
        default:
          throw new Error(`Unknown operation type: ${body.operation.type}`);
      }

      // Log successful agent action to audit trail
      await this.logAgentAction(result);

      return new Response(JSON.stringify({
        success: true,
        agent_id: this.agentId,
        action: result.action,
        details: result.details,
        rationale: result.rationale,
        confidence: result.confidence
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
      // Log failed agent action
      await this.logAgentAction({
        success: false,
        action: body.operation?.type || 'unknown',
        details: { error: error.message },
        rationale: 'Agent execution failed',
        confidence: 0.0
      });

      return new Response(JSON.stringify({
        success: false,
        agent_id: this.agentId,
        error: error.message
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  async handleRollback(op) {
    // Fetch deployment history for this worker
    const deployments = await this.env.EPCP_DB.prepare(
      `SELECT * FROM deployments 
       WHERE worker_id = ? AND status = 'success'
       ORDER BY created_at DESC LIMIT 2`
    ).bind(op.worker_id).all();

    if (!deployments.results?.[1]) {
      return {
        success: false,
        action: 'rollback',
        details: { worker: op.worker_id, error: 'No previous successful deployment found' },
        rationale: 'Cannot rollback without a known good previous version',
        confidence: 0.0
      };
    }

    const previousVersion = deployments.results[1];
    const currentVersion = deployments.results[0];

    // Queue rollback deployment via KV (picked up by CI/CD)
    await this.env.STATUS_KV.put(
      `deploy:request:${op.worker_id}:rollback`,
      JSON.stringify({
        worker: op.worker_id,
        version: previousVersion.version,
        previous_version: currentVersion.version,
        rollback: true,
        triggeredAt: new Date().toISOString(),
        source: 'mechanic-agent',
        reason: op.reason || 'automatic_rollback'
      }),
      { expirationTtl: 3600 }
    );

    // Record deployment attempt
    await this.env.EPCP_DB.prepare(
      `INSERT INTO deployments 
       (worker_id, version, triggered_by, status, created_at, previous_version, rollback_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      op.worker_id,
      previousVersion.version,
      'mechanic-agent',
      'pending',
      Date.now(),
      currentVersion.version,
      'pending'
    ).run();

    return {
      success: true,
      action: 'rollback',
      details: {
        worker: op.worker_id,
        from_version: currentVersion.version,
        to_version: previousVersion.version,
        rollback_id: `${op.worker_id}:rollback:${Date.now()}`
      },
      rationale: `Rollback triggered from ${currentVersion.version} to ${previousVersion.version} due to ${op.reason || 'deployment failure'}`,
      confidence: 0.95
    };
  }

  async handleQuarantine(op) {
    // Mark node as quarantined in workers table
    await this.env.EPCP_DB.prepare(
      `UPDATE workers 
       SET status = 'quarantined', 
           config = json_set(COALESCE(config, '{}'), '$.quarantined_at', ?,
                                          '$.quarantine_reason', ?)
       WHERE id = ?`
    ).bind(Date.now(), op.reason, op.node_id).run();

    // Remove from active mesh routing
    await this.env.STATUS_KV.delete(`mesh:node:${op.node_id}`);
    await this.env.STATUS_KV.delete(`mesh:presence:${op.node_id}`);

    // Broadcast quarantine event to mesh
    await this.env.STATUS_KV.put(
      `quarantine:${op.node_id}`,
      JSON.stringify({
        node_id: op.node_id,
        reason: op.reason,
        quarantined_at: Date.now(),
        agent_id: this.agentId,
        severity: op.severity || 'high'
      }),
      { expirationTtl: 86400 }
    );

    // Log to forensic artifacts
    await this.env.EPCP_DB.prepare(
      `INSERT INTO forensic_artifacts (event_id, r2_uri, content_type, size_bytes, hmac_sig, retention_cold)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      op.event_id || 0,
      `r2://p31-epcp-forensics-hot/quarantine/${op.node_id}/${Date.now()}.json`,
      'application/json',
      JSON.stringify(op).length,
      this.generateHmac(op),
      '7d'
    ).run();

    return {
      success: true,
      action: 'quarantine',
      details: {
        node_id: op.node_id,
        reason: op.reason,
        severity: op.severity || 'high',
        mesh_removed: true
      },
      rationale: `Node ${op.node_id} quarantined due to ${op.reason}. Removed from mesh routing.`,
      confidence: 0.88
    };
  }

  async handleDependencyUpdate(op) {
    // Check current version
    const worker = await this.env.EPCP_DB.prepare(
      `SELECT version, config FROM workers WHERE id = ?`
    ).bind(op.worker_id).first();

    if (!worker) {
      return {
        success: false,
        action: 'dependency_update',
        details: { error: 'Worker not found' },
        rationale: 'Cannot update dependencies for non-existent worker',
        confidence: 0.0
      };
    }

    // Check for available updates (simplified - would integrate with npm/GitHub API)
    const updates = await this.checkForUpdates(op.package_name);

    if (updates.length === 0 || updates[0].version === op.current_version) {
      return {
        success: true,
        action: 'dependency_update',
        details: { package: op.package_name, status: 'already_latest' },
        rationale: `Package ${op.package_name} is already at latest version`,
        confidence: 1.0
      };
    }

    const latestVersion = updates[0].version;

    // Create deployment request for updated version
    await this.env.STATUS_KV.put(
      `deploy:request:${op.worker_id}:update`,
      JSON.stringify({
        worker: op.worker_id,
        version: latestVersion,
        package: op.package_name,
        previous_version: op.current_version,
        triggeredAt: new Date().toISOString(),
        source: 'mechanic-agent',
        type: 'dependency_update'
      }),
      { expirationTtl: 3600 }
    );

    return {
      success: true,
      action: 'dependency_update',
      details: {
        worker: op.worker_id,
        package: op.package_name,
        from_version: op.current_version,
        to_version: latestVersion,
        pr_url: updates[0].pr_url || null
      },
      rationale: `Dependency update queued: ${op.package_name} ${op.current_version} → ${latestVersion}`,
      confidence: 0.92
    };
  }

  async handleHealthRemediation(op) {
    const worker = await this.env.EPCP_DB.prepare(
      `SELECT * FROM workers WHERE id = ?`
    ).bind(op.worker_id).first();

    if (!worker) {
      return {
        success: false,
        action: 'health_remediation',
        details: { error: 'Worker not found' },
        rationale: 'Cannot remediate unknown worker',
        confidence: 0.0
      };
    }

    const actions = [];

    // Check if worker needs restart
    if (op.health_status === 'unhealthy' && op.metrics?.restarts < 3) {
      await this.env.STATUS_KV.put(
        `restart:request:${op.worker_id}`,
        JSON.stringify({
          worker: op.worker_id,
          action: 'restart',
          reason: 'automatic_health_remediation',
          triggeredAt: Date.now(),
          source: 'mechanic-agent'
        }),
        { expirationTtl: 300 }
      );
      actions.push('restart_requested');
    }

    // Check if worker needs rollback
    if (op.health_status === 'degraded' && op.metrics?.error_rate > 0.5) {
      const deployments = await this.env.EPCP_DB.prepare(
        `SELECT version FROM deployments 
         WHERE worker_id = ? AND status = 'success'
         ORDER BY created_at DESC LIMIT 2`
      ).bind(op.worker_id).all();

      if (deployments.results?.[1]) {
        await this.env.STATUS_KV.put(
          `deploy:request:${op.worker_id}:rollback`,
          JSON.stringify({
            worker: op.worker_id,
            version: deployments.results[1].version,
            rollback: true,
            reason: 'high_error_rate',
            triggeredAt: Date.now(),
            source: 'mechanic-agent'
          })
        );
        actions.push('rollback_requested');
      }
    }

    // Update worker health status
    await this.env.EPCP_DB.prepare(
      `UPDATE workers 
       SET last_health = ?, status = ?
       WHERE id = ?`
    ).bind(Date.now(), op.health_status, op.worker_id).run();

    return {
      success: true,
      action: 'health_remediation',
      details: {
        worker: op.worker_id,
        health_status: op.health_status,
        actions_taken: actions,
        metrics: op.metrics
      },
      rationale: `Health remediation completed: ${actions.join(', ') || 'monitoring_only'}`,
      confidence: 0.85
    };
  }

  async checkForUpdates(packageName) {
    try {
      const res = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
      if (!res.ok) return [];
      const data = await res.json();
      return [{
        version: data.version,
        changelog: data.changelog || 'See release notes',
        pr_url: null
      }];
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return [];
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
      'agent:mechanic',
      result.action,
      result.details?.worker || result.details?.node_id || 'unknown',
      this.agentId,
      result.rationale,
      result.confidence,
      '1.0.0'
    ).run();
  }

  generateHmac(data) {
    // Simplified HMAC generation (in production, use proper crypto)
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

module.exports = { MechanicAgentDO };
