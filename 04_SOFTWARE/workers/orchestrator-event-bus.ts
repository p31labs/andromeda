/**
 * P31 Orchestrator Event Bus
 * Durable Object singleton message queue with guardrail integration
 * 
 * This is the central nervous system of the P31 automation ecosystem.
 * All triggers pass through this DO, are evaluated against guardrails,
 * and dispatched to actions with exponential time dilation.
 */

import type { D1Database, DurableObjectState, DurableObject } from './types';
import { evaluateGuardrails, isFawnGuardActive, calculateCurrentLevel } from '../../src/guardrails.js';
import { getActionHandler } from './action-registry.ts';

export interface Env {
  ORCHESTRATOR_DO: DurableObjectNamespace;
  ORCHESTRATOR_D1: D1Database;
  SPOONS_KV: KVNamespace;
}

export interface TriggerEvent {
  id: string;
  type: 'cron' | 'webhook' | 'state_change' | 'threshold' | 'external' | 'manual';
  source: string;
  action: string;
  priority: number;
  safetyLevel: number;
  baseDelayMs: number;
  payload: Record<string, unknown>;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  triggerId: string;
  eventType: string;
  action: string;
  spoonsAtEvaluation: number;
  guardrailLevel: number;
  approved: boolean;
  delayMs: number;
  requiresManual: boolean;
  reason: string;
  executedAt?: number;
  created_at: number;
}

export interface QueuedAction {
  id: string;
  triggerId: string;
  action: string;
  payload: Record<string, unknown>;
  scheduledAt: number;
  priority: number;
  attempts: number;
}

// D1 Schema
/*
CREATE TABLE orchestrator_audit_log (
  id TEXT PRIMARY KEY,
  trigger_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  action TEXT NOT NULL,
  spoons_at_evaluation INTEGER NOT NULL,
  guardrail_level INTEGER NOT NULL,
  approved BOOLEAN NOT NULL,
  delay_ms INTEGER NOT NULL,
  requires_manual BOOLEAN NOT NULL,
  reason TEXT NOT NULL,
  executed_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE orchestrator_queue (
  id TEXT PRIMARY KEY,
  trigger_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload TEXT NOT NULL,
  scheduled_at INTEGER NOT NULL,
  priority INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_orchestrator_audit_trigger ON orchestrator_audit_log(trigger_id);
CREATE INDEX idx_orchestrator_audit_created ON orchestrator_audit_log(created_at DESC);
CREATE INDEX idx_orchestrator_queue_scheduled ON orchestrator_queue(scheduled_at);
CREATE INDEX idx_orchestrator_queue_priority ON orchestrator_queue(priority DESC);
*/

export class EventBusDO implements DurableObject {
  state: DurableObjectState;
  env: Env;
  currentGuardrailLevel: number;
  lastSpoonCheck: number;
  alarmScheduled: boolean;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.currentGuardrailLevel = 4;
    this.lastSpoonCheck = 0;
    this.alarmScheduled = false;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Route: POST /api/orchestrator/trigger
    if (pathParts[0] === 'api' && pathParts[1] === 'orchestrator' && pathParts[2] === 'trigger') {
      if (request.method === 'POST') {
        const event = await request.json() as TriggerEvent;
        return this.handleTrigger(event);
      }
    }

    // Route: GET /api/orchestrator/status
    if (pathParts[0] === 'api' && pathParts[1] === 'orchestrator' && pathParts[2] === 'status') {
      const currentSpoons = await this.getCurrentSpoonCount();
      
      return new Response(JSON.stringify({
        guardrailLevel: this.currentGuardrailLevel,
        lastSpoonCheck: this.lastSpoonCheck,
        fawnGuardActive: isFawnGuardActive(this.currentGuardrailLevel),
        currentSpoons,
        timestamp: Date.now()
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Route: GET /api/orchestrator/queue
    if (pathParts[0] === 'api' && pathParts[1] === 'orchestrator' && pathParts[2] === 'queue') {
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const queue = await this.env.ORCHESTRATOR_D1.prepare(`
        SELECT id, trigger_id, action, scheduled_at, priority, attempts, created_at
        FROM orchestrator_queue 
        ORDER BY priority DESC, scheduled_at ASC
        LIMIT ?
      `).bind(limit).all();

      return new Response(JSON.stringify({
        count: queue.results?.length || 0,
        items: queue.results || []
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Route: GET /api/orchestrator/audit-log
    if (pathParts[0] === 'api' && pathParts[1] === 'orchestrator' && pathParts[2] === 'audit-log') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const logs = await this.env.ORCHESTRATOR_D1.prepare(`
        SELECT * FROM orchestrator_audit_log 
        ORDER BY created_at DESC
        LIMIT ?
      `).bind(limit).all();

      return new Response(JSON.stringify({
        count: logs.results?.length || 0,
        items: logs.results || []
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Route: GET /api/orchestrator/manual-review
    if (pathParts[0] === 'api' && pathParts[1] === 'orchestrator' && pathParts[2] === 'manual-review') {
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const pending = await this.env.ORCHESTRATOR_D1.prepare(`
        SELECT * FROM orchestrator_audit_log 
        WHERE requires_manual = true AND executed_at IS NULL
        ORDER BY created_at DESC
        LIMIT ?
      `).bind(limit).all();

      return new Response(JSON.stringify({
        count: pending.results?.length || 0,
        items: pending.results || []
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Route: POST /api/orchestrator/approve/:id
    if (pathParts[0] === 'api' && pathParts[1] === 'orchestrator' && pathParts[2] === 'approve' && pathParts[3]) {
      if (request.method === 'POST') {
        const auditId = pathParts[3];
        
        // Get original trigger from audit log
        const auditEntry = await this.env.ORCHESTRATOR_D1.prepare(`
          SELECT trigger_id, event_type, action, spoons_at_evaluation, reason
          FROM orchestrator_audit_log WHERE id = ?
        `).bind(auditId).first();

        if (!auditEntry) {
          return new Response(JSON.stringify({ error: 'Audit entry not found' }), { status: 404 });
        }

        // Mark as approved
        await this.env.ORCHESTRATOR_D1.prepare(`
          UPDATE orchestrator_audit_log 
          SET executed_at = ?, requires_manual = false, reason = ? || ' - MANUALLY APPROVED'
          WHERE id = ?
        `).bind(Date.now(), auditEntry.reason, auditId).run();

        // Bypass guardrails and execute immediately
        await this.executeAction({
          id: crypto.randomUUID(),
          triggerId: auditEntry.trigger_id,
          action: auditEntry.action,
          payload: { manualApproval: true },
          scheduledAt: Date.now(),
          priority: 10,
          attempts: 0
        });

        return new Response(JSON.stringify({ success: true, approved: auditId }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not found', { status: 404 });
  }

  async alarm() {
    this.alarmScheduled = false;
    await this.processQueue();
    
    // Reschedule alarm if there are more items
    const nextItem = await this.env.ORCHESTRATOR_D1.prepare(`
      SELECT scheduled_at FROM orchestrator_queue 
      ORDER BY scheduled_at ASC LIMIT 1
    `).first<{ scheduled_at: number }>();

    if (nextItem) {
      const delay = Math.max(0, nextItem.scheduled_at - Date.now());
      this.state.setAlarm(Date.now() + Math.min(delay, 300000)); // Max 5 minutes
      this.alarmScheduled = true;
    }
  }

  async handleTrigger(event: TriggerEvent): Promise<Response> {
    // 1. Get current spoon count
    const currentSpoons = await this.getCurrentSpoonCount();
    
    // 2. Update guardrail level with hysteresis
    this.currentGuardrailLevel = calculateCurrentLevel(currentSpoons, this.currentGuardrailLevel);
    this.lastSpoonCheck = Date.now();

    // 3. Evaluate against guardrails
    const evaluation = evaluateGuardrails({
      safetyLevel: event.safetyLevel,
      priority: event.priority,
      baseDelayMs: event.baseDelayMs
    }, { spoons: currentSpoons });

    // 4. Log to immutable audit trail
    const auditEntry: AuditLogEntry = {
      id: crypto.randomUUID(),
      triggerId: event.id,
      eventType: event.type,
      action: event.action,
      spoonsAtEvaluation: currentSpoons,
      guardrailLevel: this.currentGuardrailLevel,
      approved: evaluation.approved,
      delayMs: evaluation.delayMs,
      requiresManual: evaluation.requiresManual,
      reason: evaluation.reason,
      created_at: Date.now()
    };

    await this.logAuditEntry(auditEntry);

    // 5. If approved, queue for execution
    if (evaluation.approved && !evaluation.requiresManual) {
      const scheduledAt = Date.now() + evaluation.delayMs;
      
      await this.queueAction({
        id: crypto.randomUUID(),
        triggerId: event.id,
        action: event.action,
        payload: event.payload,
        scheduledAt,
        priority: event.priority,
        attempts: 0
      });

      // Schedule alarm if not already scheduled
      if (!this.alarmScheduled) {
        const delay = Math.min(evaluation.delayMs, 300000); // Max 5 minutes
        this.state.setAlarm(Date.now() + delay);
        this.alarmScheduled = true;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      eventId: event.id,
      auditId: auditEntry.id,
      evaluation,
      currentLevel: this.currentGuardrailLevel,
      currentSpoons
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getCurrentSpoonCount(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const key = `spoons:will:${today}`;
    
    const eventsJson = await this.env.SPOONS_KV.get(key);
    
    if (!eventsJson) {
      return 12; // Default baseline if no data
    }

    const events = JSON.parse(eventsJson);
    const totalSpent = events
      .filter((e: any) => e.amount < 0)
      .reduce((sum: number, e: any) => sum + Math.abs(e.amount), 0);
    const totalEarned = events
      .filter((e: any) => e.amount > 0)
      .reduce((sum: number, e: any) => sum + e.amount, 0);

    return Math.max(0, Math.min(20, 12 + totalEarned - totalSpent));
  }

  async logAuditEntry(entry: AuditLogEntry): Promise<void> {
    await this.env.ORCHESTRATOR_D1.prepare(`
      INSERT INTO orchestrator_audit_log (
        id, trigger_id, event_type, action, spoons_at_evaluation,
        guardrail_level, approved, delay_ms, requires_manual,
        reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      entry.id,
      entry.triggerId,
      entry.eventType,
      entry.action,
      entry.spoonsAtEvaluation,
      entry.guardrailLevel,
      entry.approved,
      entry.delayMs,
      entry.requiresManual,
      entry.reason,
      entry.created_at
    ).run();
  }

  async queueAction(action: QueuedAction): Promise<void> {
    await this.env.ORCHESTRATOR_D1.prepare(`
      INSERT INTO orchestrator_queue (
        id, trigger_id, action, payload, scheduled_at,
        priority, attempts, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      action.id,
      action.triggerId,
      action.action,
      JSON.stringify(action.payload),
      action.scheduledAt,
      action.priority,
      action.attempts,
      Date.now()
    ).run();
  }

  async processQueue(): Promise<void> {
    const now = Date.now();
    
    // Get all due actions sorted by priority
    const actions = await this.env.ORCHESTRATOR_D1.prepare(`
      SELECT * FROM orchestrator_queue 
      WHERE scheduled_at <= ? 
      ORDER BY priority DESC, scheduled_at ASC
      LIMIT 10
    `).bind(now).all<QueuedAction & { payload: string }>();

    if (!actions.results || actions.results.length === 0) {
      return;
    }

    for (const action of actions.results) {
      try {
        // Execute action
        await this.executeAction({
          ...action,
          payload: JSON.parse(action.payload)
        });

        // Mark as executed in audit log
        await this.env.ORCHESTRATOR_D1.prepare(`
          UPDATE orchestrator_audit_log 
          SET executed_at = ? 
          WHERE trigger_id = ?
        `).bind(now, action.triggerId).run();

        // Remove from queue
        await this.env.ORCHESTRATOR_D1.prepare(`
          DELETE FROM orchestrator_queue WHERE id = ?
        `).bind(action.id).run();

      } catch (error) {
        // Retry logic - exponential backoff
        const newAttempts = action.attempts + 1;
        const backoffMs = Math.min(300000, 1000 * Math.pow(2, newAttempts));
        
        if (newAttempts < 5) {
          await this.env.ORCHESTRATOR_D1.prepare(`
            UPDATE orchestrator_queue 
            SET scheduled_at = ?, attempts = ?
            WHERE id = ?
          `).bind(Date.now() + backoffMs, newAttempts, action.id).run();
        } else {
          // Max retries reached - dead letter
          await this.env.ORCHESTRATOR_D1.prepare(`
            DELETE FROM orchestrator_queue WHERE id = ?
          `).bind(action.id).run();
        }
      }
    }
  }

  async executeAction(action: QueuedAction): Promise<void> {
    const handler = getActionHandler(action.action);
    
    if (!handler) {
      console.log(`Unknown action type: ${action.action}`);
      return;
    }

    await handler.execute({
      env: this.env,
      triggerId: action.triggerId,
      payload: action.payload
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    if (pathParts[0] === 'api' && pathParts[1] === 'orchestrator') {
      // Route to Durable Object singleton
      const id = env.ORCHESTRATOR_DO.idFromName('singleton');
      const stub = env.ORCHESTRATOR_DO.get(id);
      return stub.fetch(request);
    }

    return new Response('P31 Orchestrator Event Bus', { status: 200 });
  }
};
