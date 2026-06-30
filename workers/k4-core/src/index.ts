export interface Env {
  CAPITAL_DB: D1Database;
  CAPITAL_KV: KVNamespace;
  EVENTS_QUEUE: Queue;
  GOVERNANCE_DB: D1Database;
  GOVERNANCE_KV: KVNamespace;
  GOVERNANCE_ENGINE_DO: DurableObjectNamespace;
  LOVE_D1: D1Database;
  LOVE_KV: KVNamespace;
  LOVE_TRANSACTION: DurableObjectNamespace;
  PASSPORT_DB: D1Database;
  PASSPORT_KV: KVNamespace;
  PASSPORT_API?: string;
  PQC_COMPLIANT?: string;
  PQC_ALGORITHMS?: string;
  PQC_STANDARD?: string;
  GOVERNANCE_MAJORITY?: string;
  GOVERNANCE_QUORUM?: string;
  GOVERNANCE_VOTING_DAYS?: string;
  GOVERNANCE_VETO_WINDOW_MS?: string;
  ENVIRONMENT: string;
}

import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({ origin: '*' }));

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'k4-core', environment: c.env.ENVIRONMENT, timestamp: new Date().toISOString() });
});

import careRoutes from './routes/care';
import loveRoutes from './routes/love';
import governanceRoutes from './routes/governance';
import passportRoutes from './routes/passport';
import meshRoutes from './routes/mesh';
import disputeRoutes from './routes/dispute';
import settlementRoutes from './routes/settlement';

app.route('/care', careRoutes);
app.route('/love', loveRoutes);
app.route('/governance', governanceRoutes);
app.route('/passport', passportRoutes);
app.route('/mesh', meshRoutes);
app.route('/dispute', disputeRoutes);
app.route('/settlement', settlementRoutes);

export default app;

export { GovernanceEngineDO, LoveTransactionDO } from './dos';
