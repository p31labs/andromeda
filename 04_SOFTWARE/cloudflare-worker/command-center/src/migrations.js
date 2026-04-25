/**
 * D1 Schema Migration Runner
 * Ensures database schema is up-to-date on deploy
 */

export const MIGRATIONS = [
  {
    version: 1,
    name: 'Create events table',
    sql: `CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      actor TEXT,
      action TEXT NOT NULL,
      target TEXT,
      diff_uri TEXT,
      req_uri TEXT,
      resp_uri TEXT,
      sig TEXT,
      legal_hold BOOLEAN DEFAULT 0
    );`,
  },
  {
    version: 2,
    name: 'Create indexes for events',
    sql: `CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
          CREATE INDEX IF NOT EXISTS idx_events_action ON events(action);
          CREATE INDEX IF NOT EXISTS idx_events_target ON events(target);`,
  },
  {
    version: 3,
    name: 'Create budgets table',
    sql: `CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      limit_usd REAL,
      limit_stablecoin REAL,
      spent_usd DEFAULT 0,
      spent_stablecoin REAL DEFAULT 0,
      alert_pct INTEGER DEFAULT 90,
      last_checked TEXT
    );`,
  },
  {
    version: 4,
    name: 'Create fleet_status table',
    sql: `CREATE TABLE IF NOT EXISTS fleet_status (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated TEXT NOT NULL
    );`,
  },
  {
     version: 5,
    name: 'Create forensic_artifacts table',
    sql: `CREATE TABLE IF NOT EXISTS forensic_artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      r2_uri TEXT NOT NULL,
      content_type TEXT,
      size_bytes INTEGER,
      hmac_sig TEXT,
      retention_cold TEXT,
      FOREIGN KEY (event_id) REFERENCES events(id)
    );`,
  },
  {
    version: 6,
    name: 'Create CRDT tables for mesh sync',
    sql: `CREATE TABLE crdt_log (
      op_id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL,
      op_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      vector_clock TEXT NOT NULL,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_crdt_log_ts ON crdt_log(ts);
    CREATE INDEX IF NOT EXISTS idx_crdt_log_node ON crdt_log(node_id);
    
    CREATE TABLE crdt_tombstones (
      entity_id TEXT PRIMARY KEY,
      deleted_by TEXT NOT NULL,
      deleted_at INTEGER NOT NULL,
      vector_clock TEXT NOT NULL
    );
    
    CREATE TABLE mesh_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      vector_clock TEXT
    );`,
  },
  {
    version: 7,
    name: 'Create G.O.D. unified operations tables',
    sql: `CREATE TABLE workers (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      version TEXT,
      deployed_at INTEGER,
      status TEXT CHECK(status IN ('active', 'inactive', 'error', 'deploying')), 
      last_health INTEGER,
      config TEXT,
      endpoint_url TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_workers_type ON workers(type);
    CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
    
    CREATE TABLE deployments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id TEXT NOT NULL,
      version TEXT NOT NULL,
      triggered_by TEXT,
      status TEXT CHECK(status IN ('pending', 'success', 'failed', 'rollback')) NOT NULL,
      logs_url TEXT,
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      FOREIGN KEY (worker_id) REFERENCES workers(id)
    );
    CREATE INDEX IF NOT EXISTS idx_deployments_worker ON deployments(worker_id);
    CREATE INDEX IF NOT EXISTS idx_deployments_created ON deployments(created_at);
    
    CREATE TABLE crdt_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation TEXT NOT NULL,
      target TEXT NOT NULL,
      priority INTEGER DEFAULT 5,
      status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')) NOT NULL,
      created_at INTEGER NOT NULL,
      processed_at INTEGER,
      retry_count INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_crdt_queue_status ON crdt_queue(status);
    CREATE INDEX IF NOT EXISTS idx_crdt_queue_priority ON crdt_queue(priority);`,
  },
  {
    version: 8,
    name: 'Create Mesh Analytics tables',
    sql: `CREATE TABLE IF NOT EXISTS mesh_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      node_id TEXT,
      metadata TEXT,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mesh_analytics_ts ON mesh_analytics(ts);
    CREATE INDEX IF NOT EXISTS idx_mesh_analytics_type ON mesh_analytics(event_type);
    
    CREATE TABLE IF NOT EXISTS node_health_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id TEXT NOT NULL,
      status TEXT,
      latency_ms INTEGER,
      error_rate REAL,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_node_health_ts ON node_health_history(ts);
    CREATE INDEX IF NOT EXISTS idx_node_health_node ON node_health_history(node_id);`,
  },
  {
    version: 9,
    name: 'Create Cost Tracking table',
    sql: `CREATE TABLE IF NOT EXISTS cost_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service TEXT NOT NULL,
      operation TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      estimated_cost REAL,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cost_tracking_ts ON cost_tracking(ts);
    CREATE INDEX IF NOT EXISTS idx_cost_tracking_service ON cost_tracking(service);`,
  },
  {
    version: 10,
    name: 'Add rollback fields to deployments',
    sql: `ALTER TABLE deployments ADD COLUMN previous_version TEXT;
          ALTER TABLE deployments ADD COLUMN rollback_status TEXT CHECK(rollback_status IN ('none', 'pending', 'success', 'failed'));
          ALTER TABLE workers ADD COLUMN current_version TEXT;
          ALTER TABLE workers ADD COLUMN previous_version TEXT;`,
  },
  {
    version: 11,
    name: 'Add room_id to mesh_state and workers',
    sql: `ALTER TABLE mesh_state ADD COLUMN room_id TEXT DEFAULT 'global';
          ALTER TABLE workers ADD COLUMN room_id TEXT DEFAULT 'global';
          CREATE INDEX IF NOT EXISTS idx_mesh_state_room ON mesh_state(room_id);
          CREATE INDEX IF NOT EXISTS idx_workers_room ON workers(room_id);`,
  },
  {
    version: 12,
    name: 'Add autonomous agent audit columns',
    sql: `ALTER TABLE events ADD COLUMN agent_id TEXT;
          ALTER TABLE events ADD COLUMN decision_rationale TEXT;
          ALTER TABLE events ADD COLUMN confidence_score REAL;
          ALTER TABLE events ADD COLUMN model_version TEXT;
          
          CREATE TABLE IF NOT EXISTS agent_sessions (
            id TEXT PRIMARY KEY,
            agent_type TEXT NOT NULL,
            parent_actor TEXT,
            started_at INTEGER NOT NULL,
            ended_at INTEGER,
            status TEXT CHECK(status IN ('active', 'completed', 'failed', 'killed')) NOT NULL,
            total_actions INTEGER DEFAULT 0,
            successful_actions INTEGER DEFAULT 0,
            decision_context TEXT
          );
          
          CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent_id);
          CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);
          
          ALTER TABLE crdt_queue ADD COLUMN agent_assigned TEXT;
          CREATE INDEX IF NOT EXISTS idx_crdt_queue_agent ON crdt_queue(agent_assigned);`
  },
];

export async function runMigrations(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT,
      applied_at TEXT
    );`
  ).run();

  const applied = await db.prepare('SELECT version FROM _migrations ORDER BY version').all();
  const appliedVersions = applied.results ? applied.results.map(r => r.version) : [];

  for (const migration of MIGRATIONS) {
    if (!appliedVersions.includes(migration.version)) {
      console.log(`[MIGRATION] Applying ${migration.version}: ${migration.name}`);
      await db.batch(
        migration.sql.split(';').filter(s => s.trim()).map(s => db.prepare(s))
      );
      await db.prepare(
        'INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)'
      ).bind(migration.version, migration.name, new Date().toISOString()).run();
      console.log(`[MIGRATION] Applied ${migration.version}`);
    }
  }
}
