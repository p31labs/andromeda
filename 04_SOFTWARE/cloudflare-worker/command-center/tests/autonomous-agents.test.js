/**
 * Autonomous Agents Test Suite
 */

const { MechanicAgentDO } = require('../src/mechanic-agent-do.js');
const { AuditAgentDO } = require('../src/audit-agent-do.js');
const { PullRequestAgentDO } = require('../src/pr-agent-do.js');
const { CrdtQueueProcessor } = require('../src/crdt-processor-do.js');

describe('Autonomous Maintenance Agents', () => {
  let env;
  let mechanicAgent;
  let auditAgent;
  let prAgent;

  beforeEach(() => {
    const state = {
      id: { toString: () => 'test-agent-id' },
      storage: {
        setAlarm: jest.fn(),
        get: jest.fn(),
        put: jest.fn(),
        delete: jest.fn()
      }
    };

    env = {
      AI: { run: jest.fn() },
      VECTORIZE_INDEX: { query: jest.fn(), upsert: jest.fn() },
      EPCP_DB: {
        prepare: jest.fn((sql) => {
          const mockResults = {
            'SELECT * FROM deployments': [
              { version: '2.0.0', status: 'success', created_at: Date.now() },
              { version: '1.9.0', status: 'success', created_at: Date.now() - 3600000 }
            ],
            'SELECT * FROM workers': [
              { id: 'worker-1', status: 'active', last_health: Date.now() - 600000 }
            ],
            'SELECT * FROM deployments WHERE status': [
              { worker_id: 'worker-1', version: '2.0.0', status: 'failed', created_at: Date.now() - 1800000 }
            ],
            'SELECT status, COUNT': [
              { status: 'pending', count: 15 },
              { status: 'processing', count: 3 }
            ],
            'SELECT * FROM workers WHERE id': [
              { id: 'worker-1', version: '1.0.0', status: 'active' }
            ],
            'SELECT version FROM deployments': [
              { version: '2.0.0' },
              { version: '1.9.0' }
            ],
            'SELECT * FROM node_health_history': [
              { latency_ms: 100, error_rate: 0.05 },
              { latency_ms: 200, error_rate: 0.1 }
            ]
          };
          const key = Object.keys(mockResults).find(k => sql.includes(k));
          const results = key ? mockResults[key] : [];
          return {
            bind: () => ({
              run: () => Promise.resolve({ success: true }),
              all: () => Promise.resolve({ results }),
              first: () => Promise.resolve(results[0] || null)
            }),
            all: () => Promise.resolve({ results }),
            first: () => Promise.resolve(results[0] || null),
            run: () => Promise.resolve({ success: true })
          };
        }),
        batch: jest.fn(() => Promise.resolve())
      },
      STATUS_KV: {
        get: jest.fn(),
        put: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve())
      },
      MECHANIC_AGENT_DO: {
        newUniqueId: () => ({ id: 123, toString: () => 'mechanic-123' }),
        get: jest.fn(() => ({
          executeTask: jest.fn(() => Promise.resolve({ success: true }))
        }))
      },
      AUDIT_AGENT_DO: {
        newUniqueId: () => ({ id: 456, toString: () => 'audit-456' }),
        get: jest.fn(() => ({
          executeTask: jest.fn(() => Promise.resolve({ success: true }))
        }))
      },
      PR_AGENT_DO: {
        newUniqueId: () => ({ id: 789, toString: () => 'pr-789' }),
        get: jest.fn(() => ({
          executeTask: jest.fn(() => Promise.resolve({ success: true }))
        }))
      },
      GITHUB_TOKEN: 'test-github-token',
      GITHUB_REPO: 'p31labs/test-repo'
    };

    mechanicAgent = new MechanicAgentDO(state, env);
    auditAgent = new AuditAgentDO(state, env);
    prAgent = new PullRequestAgentDO(state, env);
  });

  describe('MechanicAgentDO', () => {
    test('should handle deployment rollback', async () => {
      const result = await mechanicAgent.handleRollback({
        worker_id: 'test-worker',
        reason: 'deployment failure'
      });
      expect(result.success).toBe(true);
      expect(result.action).toBe('rollback');
      expect(result.details.to_version).toBe('1.9.0');
      expect(result.confidence).toBe(0.95);
    });

    test('should handle node quarantine', async () => {
      const result = await mechanicAgent.handleQuarantine({
        node_id: 'test-node',
        reason: 'security breach',
        severity: 'critical',
        event_id: 123
      });
      expect(result.success).toBe(true);
      expect(result.action).toBe('quarantine');
      expect(result.details.node_id).toBe('test-node');
      expect(result.details.severity).toBe('critical');
      expect(result.confidence).toBe(0.88);
    });

    test('should handle health remediation - restart', async () => {
      const result = await mechanicAgent.handleHealthRemediation({
        worker_id: 'test-worker',
        health_status: 'unhealthy',
        metrics: { restarts: 1, error_rate: 0.1 }
      });
      expect(result.success).toBe(true);
      expect(result.action).toBe('health_remediation');
      expect(result.details.actions_taken).toContain('restart_requested');
    });

    test('should handle health remediation - rollback', async () => {
      const result = await mechanicAgent.handleHealthRemediation({
        worker_id: 'test-worker',
        health_status: 'degraded',
        metrics: { error_rate: 0.6 }
      });
      expect(result.success).toBe(true);
      expect(result.details.actions_taken).toContain('rollback_requested');
    });

    test('should fail rollback when no previous version exists', async () => {
      env.EPCP_DB.prepare = jest.fn(() => ({
        bind: () => ({ all: () => Promise.resolve({ results: [] }) })
      }));
      const result = await mechanicAgent.handleRollback({
        worker_id: 'test-worker',
        reason: 'deployment failure'
      });
      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0.0);
    });
  });

  describe('AuditAgentDO', () => {
    test('should detect stale worker health', async () => {
      const anomalies = await auditAgent.detectAnomalies('workers');
      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].type).toBe('stale_health');
      expect(anomalies[0].severity).toBe('high');
    });

    test('should detect worker in error state', async () => {
      env.EPCP_DB.prepare = jest.fn(() => ({
        all: () => Promise.resolve({
          results: [{ id: 'worker-1', status: 'error', last_health: Date.now() }]
        })
      }));
      const anomalies = await auditAgent.detectAnomalies('workers');
      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].type).toBe('worker_error');
      expect(anomalies[0].severity).toBe('critical');
    });

    test('should detect deployment failures', async () => {
      env.EPCP_DB.prepare = jest.fn((sql) => {
        if (sql.includes('SELECT * FROM deployments')) {
          return {
            bind: () => ({
              all: () => Promise.resolve({
                results: [{
                  worker_id: 'worker-1',
                  version: '2.0.0',
                  status: 'failed',
                  created_at: Date.now() - 1800000
                }]
              })
            })
          };
        }
        return { bind: () => ({ all: () => Promise.resolve({ results: [] }) }) };
      });
      const anomalies = await auditAgent.detectAnomalies('deployments');
      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].type).toBe('deployment_failure');
      expect(anomalies[0].severity).toBe('high');
    });

    test('should detect queue backlog', async () => {
      env.EPCP_DB.prepare = jest.fn((sql) => {
        if (sql.includes('SELECT status, COUNT')) {
          return {
            bind: () => ({
              all: () => Promise.resolve({
                results: [
                  { status: 'pending', count: 15 },
                  { status: 'processing', count: 3 }
                ]
              })
            })
          };
        }
        return { bind: () => ({ all: () => Promise.resolve({ results: [] }) }) };
      });
      const anomalies = await auditAgent.detectAnomalies('queue');
      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].type).toBe('queue_backlog');
      expect(anomalies[0].severity).toBe('medium');
    });

    test('should perform deep analysis on worker', async () => {
      const analysis = await auditAgent.performDeepAnalysis('worker:worker-1');
      expect(analysis.target).toBe('worker:worker-1');
      expect(analysis.findings).toHaveLength(3);
      expect(analysis.summary).toBeDefined();
    });
  });

  describe('PullRequestAgentDO', () => {
    test('should check for package updates', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            version: '2.0.0',
            time: { '2.0.0': '2024-01-01' }
          })
        })
      );
      const result = await prAgent.checkAndUpdatePackage('test-package', '1.0.0');
      expect(result.needsUpdate).toBe(true);
      expect(result.latest_version).toBe('2.0.0');
    });

    test('should compare versions correctly', () => {
      expect(prAgent.compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(prAgent.compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(prAgent.compareVersions('1.0.0', '1.0.0')).toBe(0);
    });

    test('should generate PR body', () => {
      const updates = [{
        package: 'lodash',
        current_version: '1.0.0',
        latest_version: '2.0.0',
        changelog: []
      }];
      const body = prAgent.generatePRBody(updates);
      expect(body).toContain('Automated Dependency Update');
      expect(body).toContain('lodash');
    });
  });

  describe('CrdtQueueProcessor Integration', () => {
    test('should detect operations requiring specialized agent', () => {
      const processor = new CrdtQueueProcessor({ storage: { setAlarm: jest.fn() } }, {});
      expect(processor.requiresSpecializedAgent({
        type: 'deployment_failure',
        priority: 5,
        retry_count: 0
      })).toBe(true);
      expect(processor.requiresSpecializedAgent({
        type: 'normal',
        priority: 9,
        retry_count: 3
      })).toBe(true);
      expect(processor.requiresSpecializedAgent({
        type: 'normal',
        priority: 5,
        retry_count: 0
      })).toBe(false);
    });
  });
});
