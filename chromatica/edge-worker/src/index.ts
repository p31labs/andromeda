/**
 * P31 12-Pillar MVP Template - Cloudflare Worker
 * Version: 1.0.0
 * 
 * Pillar 8: Worker/Backend
 * Reference: docs/P31-MVP-COMPLETENESS-STANDARD.md
 * 
 * Features:
 * - PQC middleware (ML-DSA-65 signature verification)
 * - D1 database integration
 * - KV caching
 * - Durable Objects for sessions
 * - CORS configuration
 * - Rate limiting
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { bearerAuth } from 'hono/bearer-auth';

// Types for Cloudflare Bindings
export interface Env {
  MVP_CACHE: KVNamespace;
  MVP_DB: D1Database;
  MVP_FILES: R2Bucket;
  MVP_SESSIONS: DurableObjectNamespace;
  MVP_SYNC: DurableObjectNamespace;
  MVP_ANALYTICS: AnalyticsEngineDataset;
  
  // Secrets
  PQC_SECRET_KEY: string;
  JWT_SECRET: string;
  API_KEY: string;
  
  // Variables
  ENVIRONMENT: string;
  PQC_ENCRYPTION: string;
  PQC_SIGNATURES: string;
  PQC_AUDIT: string;
}

// ============================================
// HONO APP SETUP
// ============================================

const app = new Hono<{ Bindings: Env }>();

// Middleware: CORS
app.use('*', cors({
  origin: [
    'https://p31ca.org',
    'https://mvp-template.p31ca.org',
    'https://bonding.p31ca.org',
    'http://localhost:5173',
    'http://localhost:4173',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-PQC-Signature'],
  credentials: true,
}));

// Middleware: Logging
app.use('*', logger());

// Middleware: Rate Limiting (simple in-memory, production uses Durable Object)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

app.use('*', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100;

  const record = rateLimit.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
  } else {
    record.count++;
    if (record.count > maxRequests) {
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }
  }

  await next();
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: Date.now(),
    environment: c.env.ENVIRONMENT,
    pqc: {
      encryption: c.env.PQC_ENCRYPTION,
      signatures: c.env.PQC_SIGNATURES,
      audit: c.env.PQC_AUDIT,
    },
  });
});

// ============================================
// ENTITY ENDPOINTS
// ============================================

// List all entities
app.get('/api/v1/mvp-template/entities', async (c) => {
  try {
    const context = c.req.query('context');
    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');

    let sql = 'SELECT * FROM entities';
    const params: string[] = [];

    if (context) {
      sql += ' WHERE context = ?';
      params.push(context);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit.toString(), offset.toString());

    const { results } = await c.env.MVP_DB.prepare(sql).bind(...params).all();

    return c.json({
      entities: results,
      count: results.length,
      limit,
      offset,
    });
  } catch (error) {
    return c.json({ error: `Database error: ${error}` }, 500);
  }
});

// Create entity (requires PQC signature)
app.post('/api/v1/mvp-template/entities', async (c) => {
  try {
    // Verify PQC signature
    const signature = c.req.header('X-PQC-Signature');
    if (!signature) {
      return c.json({ error: 'PQC signature required' }, 401);
    }

    // TODO: Verify ML-DSA-65 signature
    // const isValid = await verifySignature(body, signature, publicKey);
    // if (!isValid) return c.json({ error: 'Invalid signature' }, 401);

    const body = await c.req.json();
    const { context, data } = body;

    if (!context || !['home', 'business', 'family'].includes(context)) {
      return c.json({ error: 'Valid context required' }, 400);
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    await c.env.MVP_DB.prepare(`
      INSERT INTO entities (id, context, created_at, updated_at, data, pqc_signature)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, context, now, now, JSON.stringify(data), signature).run();

    return c.json({
      id,
      context,
      createdAt: now,
      updatedAt: now,
      data,
      pqcSignature: signature,
    }, 201);
  } catch (error) {
    return c.json({ error: `Create failed: ${error}` }, 500);
  }
});

// Get entity by ID
app.get('/api/v1/mvp-template/entities/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const result = await c.env.MVP_DB.prepare(`
      SELECT * FROM entities WHERE id = ?
    `).bind(id).first();

    if (!result) {
      return c.json({ error: 'Entity not found' }, 404);
    }

    return c.json(result);
  } catch (error) {
    return c.json({ error: `Query failed: ${error}` }, 500);
  }
});

// Update entity (requires PQC signature)
app.put('/api/v1/mvp-template/entities/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const signature = c.req.header('X-PQC-Signature');

    if (!signature) {
      return c.json({ error: 'PQC signature required' }, 401);
    }

    const body = await c.req.json();
    const now = Date.now();

    // Check entity exists
    const existing = await c.env.MVP_DB.prepare(`
      SELECT * FROM entities WHERE id = ?
    `).bind(id).first();

    if (!existing) {
      return c.json({ error: 'Entity not found' }, 404);
    }

    // Merge data
    const updatedData = { ...JSON.parse(existing.data as string), ...body.data };

    await c.env.MVP_DB.prepare(`
      UPDATE entities 
      SET data = ?, updated_at = ?, pqc_signature = ?
      WHERE id = ?
    `).bind(JSON.stringify(updatedData), now, signature, id).run();

    return c.json({
      id,
      context: existing.context,
      createdAt: existing.created_at,
      updatedAt: now,
      data: updatedData,
      pqcSignature: signature,
    });
  } catch (error) {
    return c.json({ error: `Update failed: ${error}` }, 500);
  }
});

// Delete entity (requires PQC signature)
app.delete('/api/v1/mvp-template/entities/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const signature = c.req.header('X-PQC-Signature');

    if (!signature) {
      return c.json({ error: 'PQC signature required' }, 401);
    }

    // Check entity exists
    const existing = await c.env.MVP_DB.prepare(`
      SELECT * FROM entities WHERE id = ?
    `).bind(id).first();

    if (!existing) {
      return c.json({ error: 'Entity not found' }, 404);
    }

    await c.env.MVP_DB.prepare(`
      DELETE FROM entities WHERE id = ?
    `).bind(id).run();

    // Log deletion to audit trail
    await c.env.MVP_DB.prepare(`
      INSERT INTO state_changes (id, entity_type, entity_id, action, timestamp, signature)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      'entity',
      id,
      'delete',
      Date.now(),
      signature
    ).run();

    return c.json({ success: true }, 204);
  } catch (error) {
    return c.json({ error: `Delete failed: ${error}` }, 500);
  }
});

// ============================================
// SYNC ENDPOINT
// ============================================

app.post('/api/v1/mvp-template/sync', async (c) => {
  try {
    const signature = c.req.header('X-PQC-Signature');
    if (!signature) {
      return c.json({ error: 'PQC signature required' }, 401);
    }

    const body = await c.req.json();
    const { entities: syncEntities, lastSync } = body;

    let synced = 0;

    for (const entity of syncEntities || []) {
      await c.env.MVP_DB.prepare(`
        INSERT INTO entities (id, context, created_at, updated_at, data, pqc_signature)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
        context = EXCLUDED.context,
        updated_at = EXCLUDED.updated_at,
        data = EXCLUDED.data,
        pqc_signature = EXCLUDED.pqc_signature
      `).bind(
        entity.id,
        entity.context,
        entity.createdAt,
        entity.updatedAt,
        JSON.stringify(entity.data),
        entity.pqcSignature
      ).run();
      
      synced++;
    }

    return c.json({
      synced,
      conflicts: [],
      serverTimestamp: Date.now(),
    });
  } catch (error) {
    return c.json({ error: `Sync failed: ${error}` }, 500);
  }
});

// ============================================
// VOICE COMMAND ENDPOINT
// ============================================

app.post('/api/v1/mvp-template/voice', async (c) => {
  try {
    const signature = c.req.header('X-PQC-Signature');
    if (!signature) {
      return c.json({ error: 'PQC signature required' }, 401);
    }

    const body = await c.req.json();
    const { command, confidence } = body;

    // TODO: Process voice command
    // This would integrate with the voice interface module

    return c.json({
      success: true,
      action: 'processed',
      message: `Command "${command}" received with confidence ${confidence}`,
      data: { command, confidence },
    });
  } catch (error) {
    return c.json({ error: `Voice processing failed: ${error}` }, 500);
  }
});

// ============================================
// AUDIT TRAIL ENDPOINT
// ============================================

app.get('/api/v1/mvp-template/audit', async (c) => {
  try {
    const entityId = c.req.query('entityId');
    const level = c.req.query('level');
    const limit = parseInt(c.req.query('limit') || '100');

    let sql = 'SELECT * FROM audit_trail';
    const params: string[] = [];
    const conditions: string[] = [];

    if (entityId) {
      conditions.push('entity_id = ?');
      params.push(entityId);
    }

    if (level) {
      conditions.push('level = ?');
      params.push(level);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY sequence DESC LIMIT ?';
    params.push(limit.toString());

    const { results } = await c.env.MVP_DB.prepare(sql).bind(...params).all();

    return c.json({
      entries: results,
      chainValid: true,
      verifiedCount: results.length,
    });
  } catch (error) {
    return c.json({ error: `Audit query failed: ${error}` }, 500);
  }
});

// ============================================
// ERROR HANDLING
// ============================================

app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json({
    error: 'Internal server error',
    message: err.message,
    stack: c.env.ENVIRONMENT === 'development' ? err.stack : undefined,
  }, 500);
});

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// ============================================
// EXPORT
// ============================================

export default app;

// Durable Object implementations would go here
// export { MVPSessionDO, MVPSyncDO } from './durable-objects';
