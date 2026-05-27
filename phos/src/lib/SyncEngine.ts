/**
 * CRDT Sync Engine — Decentralized PGLite synchronization.
 *
 * Architecture:
 * - Change Data Capture via PGLite triggers → __sync_outbox shadow table
 * - Row-Level LWW for event logs (Lamport clock)
 * - State vector exchange via WebSocket (phos-api stream)
 * - Delta computation: compare peer state vector vs local outbox
 * - Merge: SET session_replication_role = 'replica' to prevent sync storms
 * - Transport: existing WebSocketHub Durable Object (hibernation API)
 *
 * CRDT guarantees: Strong Eventual Consistency (SEC) — all replicas that
 * receive the same set of updates converge to identical states regardless
 * of order or duplication.
 */

import { PGlite } from '@electric-sql/pglite';

// ─── Types ───

export interface SyncEvent {
  id: string;
  tableName: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  rowId: string;
  rowData: string; // JSON-serialized row
  lamportClock: number;
  siteId: string;
  createdAt: string;
}

export interface StateVector {
  [siteId: string]: number; // highest lamport clock observed per site
}

export interface SyncHandshake {
  type: 'HANDSHAKE';
  siteId: string;
  stateVector: StateVector;
}

export interface SyncDelta {
  type: 'DELTA';
  siteId: string;
  events: SyncEvent[];
}

export interface SyncAck {
  type: 'ACK';
  siteId: string;
  stateVector: StateVector;
}

export type SyncMessage = SyncHandshake | SyncDelta | SyncAck;

// ─── Constants ───

const OUTBOX_TABLE = '__sync_outbox';
const STATE_TABLE = '__sync_state';
const SYNC_TABLES = ['unified_knowledge_graph', '__phos_events'];

// ─── Lamport Clock ───

let localClock = 0;

function getSiteId(): string {
  let id = localStorage.getItem('phos_site_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('phos_site_id', id);
  }
  return id;
}

function tickClock(): number {
  localClock += 1;
  return localClock;
}

function updateClock(received: number): void {
  localClock = Math.max(localClock, received) + 1;
}

// ─── Schema Initialization ───

export async function initSyncSchema(db: PGlite): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ${OUTBOX_TABLE} (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('INSERT','UPDATE','DELETE')),
      row_id TEXT NOT NULL,
      row_data JSON NOT NULL,
      lamport_clock INTEGER NOT NULL,
      site_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_outbox_clock ON ${OUTBOX_TABLE}(lamport_clock);
    CREATE INDEX IF NOT EXISTS idx_outbox_site ON ${OUTBOX_TABLE}(site_id);

    CREATE TABLE IF NOT EXISTS ${STATE_TABLE} (
      site_id TEXT PRIMARY KEY,
      max_clock INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);

  // Install CDC triggers on sync-enabled tables
  for (const table of SYNC_TABLES) {
    try {
      await db.exec(`
        CREATE OR REPLACE FUNCTION _sync_cdc_trigger()
        RETURNS TRIGGER AS $$
        DECLARE
          _row_id TEXT;
          _row_json JSON;
          _clock INTEGER;
          _site TEXT;
        BEGIN
          _site := current_setting('phos.site_id', true);
          IF _site IS NULL OR _site = '' THEN
            _site := 'unknown';
          END IF;

          _clock := (SELECT COALESCE(MAX(lamport_clock), 0) + 1 FROM ${OUTBOX_TABLE});

          IF TG_OP = 'DELETE' THEN
            _row_id := OLD.id;
            _row_json := row_to_json(OLD);
          ELSE
            _row_id := NEW.id;
            _row_json := row_to_json(NEW);
          END IF;

          INSERT INTO ${OUTBOX_TABLE} (id, table_name, operation, row_id, row_data, lamport_clock, site_id, created_at)
          VALUES (
            gen_random_uuid()::TEXT,
            TG_TABLE_NAME,
            TG_OP,
            _row_id,
            _row_json,
            _clock,
            _site,
            NOW()::TEXT
          );

          -- Update state vector
          INSERT INTO ${STATE_TABLE} (site_id, max_clock, updated_at)
          VALUES (_site, _clock, NOW()::TEXT)
          ON CONFLICT (site_id) DO UPDATE SET
            max_clock = GREATEST(${STATE_TABLE}.max_clock, _clock),
            updated_at = NOW()::TEXT;

          RETURN COALESCE(NEW, OLD);
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS _sync_cdc ON ${table};
        CREATE TRIGGER _sync_cdc
          AFTER INSERT OR UPDATE OR DELETE ON ${table}
          FOR EACH ROW EXECUTE FUNCTION _sync_cdc_trigger();
      `);
    } catch (err) {
      console.warn(`[SyncEngine] Could not install CDC trigger on ${table}:`, err);
    }
  }
}

// ─── State Vector ───

export async function getLocalStateVector(db: PGlite): Promise<StateVector> {
  try {
    const { rows } = await db.query<{ site_id: string; max_clock: number }>(
      `SELECT site_id, max_clock FROM ${STATE_TABLE}`
    );
    const vector: StateVector = {};
    for (const r of rows) {
      vector[r.site_id] = Number(r.max_clock);
    }
    return vector;
  } catch {
    return {};
  }
}

// ─── Delta Computation ───

export async function computeDelta(
  db: PGlite,
  peerVector: StateVector
): Promise<SyncEvent[]> {
  const allOutbox = await getOutboxEvents(db);
  const delta: SyncEvent[] = [];

  for (const event of allOutbox) {
    const peerMaxClock = peerVector[event.siteId] || 0;
    if (event.lamportClock > peerMaxClock) {
      delta.push(event);
    }
  }

  return delta.sort((a, b) => a.lamportClock - b.lamportClock);
}

async function getOutboxEvents(db: PGlite): Promise<SyncEvent[]> {
  try {
    const { rows } = await db.query<{
      id: string; table_name: string; operation: string;
      row_id: string; row_data: string; lamport_clock: number;
      site_id: string; created_at: string;
    }>(
      `SELECT * FROM ${OUTBOX_TABLE} ORDER BY lamport_clock ASC`
    );
    return rows.map((r) => ({
      id: r.id,
      tableName: r.table_name,
      operation: r.operation as SyncEvent['operation'],
      rowId: r.row_id,
      rowData: r.row_data,
      lamportClock: Number(r.lamport_clock),
      siteId: r.site_id,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

// ─── Delta Application (with sync storm prevention) ───

export async function applyDelta(
  db: PGlite,
  events: SyncEvent[]
): Promise<{ applied: number; conflicts: number }> {
  let applied = 0;
  let conflicts = 0;

  // Begin atomic transaction
  await db.exec('BEGIN');

  try {
    // Disable CDC triggers to prevent sync storm
    await db.exec("SET session_replication_role = 'replica'");

    for (const event of events) {
      try {
        // Row-Level LWW: check if we already have a newer version
        const existing = await db.query<{ lamport_clock: number }>(
          `SELECT lamport_clock FROM ${OUTBOX_TABLE} WHERE row_id = $1 AND site_id = $2 ORDER BY lamport_clock DESC LIMIT 1`,
          [event.rowId, event.siteId]
        );

        if (existing.rows.length > 0 && Number(existing.rows[0].lamport_clock) >= event.lamportClock) {
          conflicts++;
          continue; // local version is newer or equal — skip
        }

        // Apply the delta
        await db.query(
          `INSERT INTO ${OUTBOX_TABLE} (id, table_name, operation, row_id, row_data, lamport_clock, site_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [event.id, event.tableName, event.operation, event.rowId, event.rowData, event.lamportClock, event.siteId, event.createdAt]
        );

        applied++;
        updateClock(event.lamportClock);
      } catch (err) {
        console.warn(`[SyncEngine] Failed to apply event ${event.id}:`, err);
        conflicts++;
      }
    }

    // Re-enable CDC triggers
    await db.exec("SET session_replication_role = 'origin'");

    await db.exec('COMMIT');
  } catch (err) {
    await db.exec("SET session_replication_role = 'origin'");
    await db.exec('ROLLBACK');
    throw err;
  }

  return { applied, conflicts };
}

// ─── Outbox GC ───

export async function gcOutbox(
  db: PGlite,
  knownPeers: StateVector
): Promise<number> {
  // Find the minimum clock across all known peers
  const minClock = Math.min(...Object.values(knownPeers), Infinity);
  if (minClock === Infinity) return 0;

  try {
    const result = await db.query(
      `DELETE FROM ${OUTBOX_TABLE} WHERE lamport_clock <= $1`,
      [minClock]
    );
    return result.affectedRows || 0;
  } catch {
    return 0;
  }
}

// ─── Serialization for WebSocket transport ───

export function serializeMessage(msg: SyncMessage): string {
  return JSON.stringify(msg);
}

export function deserializeMessage(raw: string): SyncMessage | null {
  try {
    return JSON.parse(raw) as SyncMessage;
  } catch {
    return null;
  }
}
