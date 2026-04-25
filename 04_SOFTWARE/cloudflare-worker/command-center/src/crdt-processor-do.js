// CRDT Queue Processor Durable Object
// Processes operations in strict order with conflict detection
class CrdtQueueProcessor {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.processing = false;
    this.lastProcessed = null;
    // Schedule first alarm in 5 seconds
    state.storage.setAlarm(Date.now() + 5000);
  }

  alarm() {
    // Wake up and drain the queue
    this.processQueueBatch().finally(() => {
      // Reschedule for 5 seconds from now
      this.state.storage.setAlarm(Date.now() + 5000);
    });
  }

  requiresSpecializedAgent(op) {
    const highPriorityOps = ['deployment_failure', 'rollback_required', 'node_quarantine', 'health_critical'];
    const highPriorityTargets = ['deployment', 'worker', 'mesh'];
    
    return (
      highPriorityOps.includes(op.type) ||
      (op.priority >= 8 && op.retry_count > 2) ||
      (op.target === 'deployment' && op.action === 'rollback') ||
      (op.target === 'worker' && op.action === 'quarantine')
    );
  }

  async fetch(request) {
    const url = new URL(request.url);
    
    if (url.pathname === '/process' && request.method === 'POST') {
      return this.processOne(); // HTTP trigger for manual processing
    }
    
    if (url.pathname === '/status' && request.method === 'GET') {
      const queueCount = await this.env.EPCP_DB.prepare(
        'SELECT COUNT(*) as count FROM crdt_queue WHERE status IN ("pending", "processing")'
      ).first();
      return new Response(JSON.stringify({
        queue_length: queueCount?.count || 0,
        processing: this.processing,
        last_processed: this.lastProcessed?.toString()
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    return new Response('OK', { status: 200 });
  }

  async processQueueBatch() {
    if (this.processing) return;
    this.processing = true;

    try {
      // Process up to 10 operations per batch to avoid long-running alarms
      for (let i = 0; i < 10; i++) {
        const result = await this.processOne();
        if (!result) break; // No more items
      }
    } finally {
      this.processing = false;
    }
  }

  async processOne() {
    try {
      // Fetch next pending operation (priority + FIFO)
      const result = await this.env.EPCP_DB.prepare(`
        SELECT * FROM crdt_queue 
        WHERE status = 'pending' 
        ORDER BY priority DESC, created_at ASC 
        LIMIT 1
      `).all();
      
      if (!result.results?.length) {
        return null;
      }
      
      const op = result.results[0];

      // Check if this operation requires a specialized autonomous agent
      if (this.requiresSpecializedAgent(op)) {
        return await this.spawnMechanicAgent(op);
      }

      // Mark as processing (optimistic lock)
      await this.env.EPCP_DB.prepare(`
        UPDATE crdt_queue SET status = 'processing' WHERE id = ?
      `).bind(op.id).run();

      // Process based on target type
      const opResult = await this.applyOperation(op);

      // Mark completed
      await this.env.EPCP_DB.prepare(`
        UPDATE crdt_queue 
        SET status = 'completed', processed_at = ? 
        WHERE id = ?
      `).bind(Date.now(), op.id).run();

      this.lastProcessed = Date.now();

      // Broadcast completion via KV for SSE updates
      await this.broadcastUpdate(op, 'completed');

      return { ok: true, op_id: op.id, result: opResult };
    } catch (error) {
      console.error('Queue processor error:', error);
      return { error: error.message };
    }
  }

  async spawnMechanicAgent(op) {
    try {
      // Create unique agent ID
      const agentId = this.env.MECHANIC_AGENT_DO.newUniqueId();
      const agent = this.env.MECHANIC_AGENT_DO.get(agentId);

      // Mark queue item as assigned to this agent (prevent double-processing)
      await this.env.EPCP_DB.prepare(`
        UPDATE crdt_queue 
        SET status = 'processing', agent_assigned = ? 
        WHERE id = ?
      `).bind(agentId.toString(), op.id).run();

      // Log agent session start
      await this.env.EPCP_DB.prepare(
        `INSERT INTO agent_sessions 
         (id, agent_type, parent_actor, started_at, status, decision_context)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        agentId.toString(),
        'mechanic',
        'crdt-queue-processor',
        Date.now(),
        'active',
        JSON.stringify({
          operation: op.operation,
          target: op.target,
          priority: op.priority,
          retry_count: op.retry_count,
          vector_clock: op.vector_clock
        })
      ).run();

      // Parse operation
      const operation = JSON.parse(op.operation);

      // Fire-and-forget: delegate to isolated agent DO
      // This allows the queue processor to continue processing other items
      ctx.waitUntil(
        agent.executeTask({
          operation: operation,
          target: op.target,
          parentOpId: op.id,
          queueId: op.id
        }).then(async (result) => {
          // Agent completed - update queue and audit trail
          await this.finalizeAgentTask(agentId.toString(), op.id, result);
        }).catch(async (error) => {
          // Agent failed
          await this.finalizeAgentTask(agentId.toString(), op.id, {
            success: false,
            action: operation.type || 'unknown',
            details: { error: error.message },
            rationale: 'Agent execution failed',
            confidence: 0.0
          });
        })
      );

      return { 
        ok: true, 
        delegated: true, 
        agent_id: agentId.toString(),
        op_id: op.id 
      };

    } catch (error) {
      console.error('Failed to spawn mechanic agent:', error);
      
      // Mark as failed
      await this.env.EPCP_DB.prepare(`
        UPDATE crdt_queue 
        SET status = 'failed', processed_at = ? 
        WHERE id = ?
      `).bind(Date.now(), op.id).run();

      return { 
        ok: false, 
        error: 'Failed to spawn agent',
        details: error.message 
      };
    }
  }

  async finalizeAgentTask(agentId, queueId, result) {
    try {
      // Update queue status
      await this.env.EPCP_DB.prepare(`
        UPDATE crdt_queue 
        SET status = ?, processed_at = ?, agent_assigned = ?
        WHERE id = ?
      `).bind(
        result.success ? 'completed' : 'failed',
        Date.now(),
        agentId,
        queueId
      ).run();

      // Update agent session
      await this.env.EPCP_DB.prepare(
        `UPDATE agent_sessions 
         SET ended_at = ?, status = ?, total_actions = total_actions + 1, 
             successful_actions = successful_actions + ?
         WHERE id = ?`
      ).bind(
        Date.now(),
        result.success ? 'completed' : 'failed',
        result.success ? 1 : 0,
        agentId
      ).run();

      // Log to audit trail
      if (this.env.EPCP_DB) {
        await this.env.EPCP_DB.prepare(
          `INSERT INTO events 
           (ts, actor, action, target, agent_id, decision_rationale, confidence_score, model_version)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          new Date().toISOString(),
          'agent:mechanic',
          result.action || 'task_execution',
          result.details?.worker || result.details?.node_id || queueId,
          agentId,
          result.rationale || '',
          result.confidence || 0.0,
          '1.0.0'
        ).run();
      }

      // Broadcast update
      await this.broadcastUpdate({ id: queueId }, result.success ? 'completed' : 'failed');

    } catch (error) {
      console.error('Failed to finalize agent task:', error);
    }
  }

  async applyOperation(op) {
    const operation = JSON.parse(op.operation);
    const target = op.target;
    
    switch (target) {
      case 'mesh': return this.applyMeshOperation(operation);
      case 'worker': return this.applyWorkerOperation(operation);
      case 'social': return this.applySocialOperation(operation);
      default: throw new Error(`Unknown target: ${target}`);
    }
  }
  
  async applyMeshOperation(op) {
    const { key, value, vector_clock } = op;
    
    // Check for conflicts
    const existing = await this.env.EPCP_DB.prepare(
      'SELECT vector_clock FROM mesh_state WHERE key = ?'
    ).bind(key).first();
    
    if (existing && this.isOlderVector(vector_clock, existing.vector_clock)) {
      await this.env.EPCP_DB.prepare(`
        UPDATE crdt_queue SET status = 'failed' WHERE id = ?
      `).bind(op.id).run();
      return { error: 'conflict', reason: 'outdated vector clock' };
    }
    
    await this.env.EPCP_DB.prepare(`
      INSERT OR REPLACE INTO mesh_state (key, value, updated_at, vector_clock)
      VALUES (?, ?, ?, ?)
    `).bind(key, JSON.stringify(value), Date.now(), vector_clock).run();
    
    if (this.env.STATUS_KV) {
      await this.env.STATUS_KV.put(`mesh:${key}`, JSON.stringify({
        ...value,
        ts: Date.now(),
        vc: vector_clock
      }));
    }
    
    return { applied: true, key };
  }
  
  async applyWorkerOperation(op) {
    const { action, worker_id, config } = op;
    
    if (action === 'deploy') {
      await this.env.STATUS_KV.put(`deploy:request:${worker_id}:latest`, JSON.stringify({
        worker: worker_id,
        version: config.version,
        requestedAt: new Date().toISOString(),
        action: 'deploy',
        status: 'pending',
        source: 'crdt-queue'
      }));
      return { queued: true, worker: worker_id };
    }
    
    if (action === 'health_check') {
      await this.env.EPCP_DB.prepare(`
        UPDATE workers SET last_health = ?, status = ? WHERE id = ?
      `).bind(Date.now(), config.status || 'active', worker_id).run();
      return { updated: true, worker: worker_id };
    }
    
    return { ignored: true };
  }
  
  async applySocialOperation(op) {
    const { wave, platforms, content } = op;
    const triggerKey = `social:wave:${wave}`;
    
    await this.env.STATUS_KV.put(triggerKey, JSON.stringify({
      wave,
      platforms,
      content,
      triggeredAt: Date.now(),
      source: 'crdt-queue'
    }));
    
    return { queued: true, wave };
  }
  
  isOlderVector(incoming, existing) {
    try {
      const inc = JSON.parse(incoming);
      const ext = JSON.parse(existing);
      return (inc.ts || 0) < (ext.ts || 0);
    } catch {
      return false;
    }
  }
  
  async broadcastUpdate(op, status) {
    if (this.env.STATUS_KV) {
      const key = `queue:update:${op.id}`;
      await this.env.STATUS_KV.put(key, JSON.stringify({
        op_id: op.id,
        status,
        ts: Date.now()
      }), { expirationTtl: 300 });
    }
  }
}

module.exports = { CrdtQueueProcessor };
