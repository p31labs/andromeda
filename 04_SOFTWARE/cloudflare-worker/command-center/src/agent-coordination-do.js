// Agent Coordination Durable Object
// Implements CRDT-backed Saga pattern for multi-agent workflows
export class AgentCoordinationDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.coordinationId = state.id.toString();
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/internal/coordinate' && request.method === 'POST') {
      return this.handleCoordination(request);
    }

    if (url.pathname === '/internal/saga/start' && request.method === 'POST') {
      return this.startSaga(request);
    }

    if (url.pathname === '/internal/saga/status' && request.method === 'GET') {
      return this.getSagaStatus(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  async handleCoordination(request) {
    const body = await request.json();
    const { saga_id, from_agent, to_agent, action, payload, ttl } = body;

    // Write coordination event to CRDT mesh state
    const coordinationKey = `agent_coordination:${saga_id}`;
    const event = {
      saga_id,
      from: from_agent,
      to: to_agent,
      action,
      payload,
      timestamp: Date.now(),
      ttl: ttl || 300000, // 5 min default
      status: 'pending'
    };

    await this.env.EPCP_DB.prepare(
      `INSERT OR REPLACE INTO mesh_state (key, value, updated_at, vector_clock)
       VALUES (?, ?, ?, ?)`
    ).bind(
      coordinationKey,
      JSON.stringify(event),
      Date.now(),
      JSON.stringify({ [saga_id]: Date.now() })
    ).run();

    // Broadcast to target agent via mesh
    await this.broadcastToAgent(to_agent, event);

    return new Response(JSON.stringify({
      success: true,
      coordination_id: coordinationKey,
      event
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  async startSaga(request) {
    const body = await request.json();
    const { saga_type, trigger_agent, steps, context } = body;
    
    const saga_id = `saga_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    
    const saga = {
      saga_id,
      saga_type,
      trigger_agent,
      steps,
      context,
      current_step: 0,
      status: 'running',
      started_at: Date.now(),
      completed_steps: [],
      failed_steps: []
    };

    // Store saga state in coordination space
    await this.env.EPCP_DB.prepare(
      `INSERT OR REPLACE INTO mesh_state (key, value, updated_at)
       VALUES (?, ?, ?)`
    ).bind(
      `saga:${saga_id}`,
      JSON.stringify(saga),
      Date.now()
    ).run();

    // Trigger first step
    const firstStep = steps[0];
    await this.triggerStep(saga_id, firstStep, 0);

    return new Response(JSON.stringify({
      success: true,
      saga_id,
      status: 'running',
      current_step: 0
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  async triggerStep(saga_id, step, stepIndex) {
    const stepEvent = {
      saga_id,
      step_index: stepIndex,
      agent: step.agent,
      action: step.action,
      payload: step.payload,
      dependencies: step.dependencies || [],
      timeout: step.timeout || 30000
    };

    // Write step to coordination key
    await this.env.EPCP_DB.prepare(
      `INSERT OR REPLACE INTO mesh_state (key, value, updated_at)
       VALUES (?, ?, ?)`
    ).bind(
      `saga:${saga_id}:step:${stepIndex}`,
      JSON.stringify(stepEvent),
      Date.now()
    ).run();

    // Notify target agent
    await this.broadcastToAgent(step.agent, stepEvent);
  }

  async getSagaStatus(request) {
    const url = new URL(request.url);
    const saga_id = url.searchParams.get('saga_id');

    if (!saga_id) {
      return new Response(JSON.stringify({ error: 'saga_id required' }), { status: 400 });
    }

    const saga = await this.env.EPCP_DB.prepare(
      `SELECT value FROM mesh_state WHERE key = ?`
    ).bind(`saga:${saga_id}`).first();

    if (!saga) {
      return new Response(JSON.stringify({ error: 'Saga not found' }), { status: 404 });
    }

    const steps = await this.env.EPCP_DB.prepare(
      `SELECT key, value FROM mesh_state WHERE key LIKE ? ORDER BY updated_at`
    ).bind(`saga:${saga_id}:step:%`).all();

    return new Response(JSON.stringify({
      saga: JSON.parse(saga.value),
      steps: steps.results.map(s => ({ key: s.key, ...JSON.parse(s.value) }))
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  async broadcastToAgent(agentId, event) {
    // Store in agent-specific coordination queue
    const queueKey = `agent_queue:${agentId}`;
    
    await this.env.EPCP_DB.prepare(
      `INSERT INTO crdt_queue (operation, target, priority, status, created_at)
       VALUES (?, ?, ?, 'pending', ?)`
    ).bind(
      JSON.stringify(event),
      'coordination',
      event.priority || 5,
      Date.now()
    ).run();
  }

  async completeStep(saga_id, stepIndex, result) {
    const saga = await this.env.EPCP_DB.prepare(
      `SELECT value FROM mesh_state WHERE key = ?`
    ).bind(`saga:${saga_id}`).first();

    if (!saga) return;

    const sagaData = JSON.parse(saga.value);
    sagaData.completed_steps.push({ step_index: stepIndex, result });
    sagaData.current_step = stepIndex + 1;

    // Check if saga is complete
    if (stepIndex >= sagaData.steps.length - 1) {
      sagaData.status = 'completed';
      sagaData.completed_at = Date.now();
    }

    await this.env.EPCP_DB.prepare(
      `UPDATE mesh_state SET value = ?, updated_at = ? WHERE key = ?`
    ).bind(
      JSON.stringify(sagaData),
      Date.now(),
      `saga:${saga_id}`
    ).run();

    // Trigger next step if exists
    if (sagaData.status === 'running' && sagaData.current_step < sagaData.steps.length) {
      await this.triggerStep(saga_id, sagaData.steps[sagaData.current_step], sagaData.current_step);
    }
  }

  async failStep(saga_id, stepIndex, error) {
    const saga = await this.env.EPCP_DB.prepare(
      `SELECT value FROM mesh_state WHERE key = ?`
    ).bind(`saga:${saga_id}`).first();

    if (!saga) return;

    const sagaData = JSON.parse(saga.value);
    sagaData.failed_steps.push({ step_index: stepIndex, error });

    // Determine if saga should retry or abort
    const currentStep = sagaData.steps[stepIndex];
    if (currentStep.retry_count < (currentStep.max_retries || 3)) {
      // Retry
      currentStep.retry_count = (currentStep.retry_count || 0) + 1;
      await this.triggerStep(saga_id, currentStep, stepIndex);
    } else {
      // Abort saga
      sagaData.status = 'failed';
      sagaData.failed_at = Date.now();
      await this.env.EPCP_DB.prepare(
        `UPDATE mesh_state SET value = ?, updated_at = ? WHERE key = ?`
      ).bind(
        JSON.stringify(sagaData),
        Date.now(),
        `saga:${saga_id}`
      ).run();
    }
  }
}
