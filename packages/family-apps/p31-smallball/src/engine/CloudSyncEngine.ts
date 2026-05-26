// P31 Smallball: Cloud Sync Engine
// Local-First incremental sync with Cloudflare D1
// Cursor-based: sends only state since last_synced_at

const getEnv = (key: string, fallback: string): string => {
  try {
    return (import.meta as any).env?.[key] || fallback;
  } catch {
    return fallback;
  }
};

const SYNC_ENDPOINT = getEnv('VITE_SYNC_ENDPOINT', 'https://p31-sync-edge.trimtab-signal.workers.dev');
const SYNC_API_KEY = getEnv('VITE_SYNC_API_KEY', 'p31-sync-dev-key');

export interface SyncPayload {
  franchiseId: string;
  tables: {
    players?: any[];
    training_facilities?: any[];
    training_events?: any[];
    stat_mutations?: any[];
    player_energy?: any[];
    scheduled_training?: any[];
  };
}

export interface SyncResult {
  success: boolean;
  syncedAt?: number;
  error?: string;
}

export interface CloudState {
  franchiseId: string;
  tables: {
    players: any[];
    training_facilities: any[];
    player_energy: any[];
    scheduled_training: any[];
    lastSyncedAt: string | null;
  };
}

const STORAGE_KEY = 'p31_smallball_last_synced';

export class CloudSyncEngine {
  private endpoint: string;
  private apiKey: string;

  constructor(endpoint?: string, apiKey?: string) {
    this.endpoint = endpoint || SYNC_ENDPOINT;
    this.apiKey = apiKey || SYNC_API_KEY;
  }

  getLastSyncedAt(): number {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  setLastSyncedAt(timestamp: number): void {
    localStorage.setItem(STORAGE_KEY, String(timestamp));
  }

  async pushToCloud(payload: SyncPayload): Promise<SyncResult> {
    try {
      const response = await fetch(`${this.endpoint}/api/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${text}` };
      }

      const result = await response.json();
      if (result.syncedAt) {
        this.setLastSyncedAt(result.syncedAt);
      }
      return { success: true, syncedAt: result.syncedAt };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async pullFromCloud(franchiseId: string): Promise<CloudState | null> {
    try {
      const response = await fetch(
        `${this.endpoint}/api/sync/pull?franchiseId=${encodeURIComponent(franchiseId)}`,
        {
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
        }
      );

      if (!response.ok) {
        console.error('[Sync] Pull failed:', response.status);
        return null;
      }

      return await response.json();
    } catch (err) {
      console.error('[Sync] Pull error:', err);
      return null;
    }
  }

  async extractLocalState(db: any, franchiseId: string): Promise<SyncPayload> {
    const lastSynced = this.getLastSyncedAt();

    const [players, facilities, events, mutations, energy, schedules] = await Promise.all([
      db.query('SELECT * FROM players WHERE franchise_id = $1', [franchiseId]),
      db.query('SELECT * FROM training_facilities WHERE franchise_id = $1', [franchiseId]),
      db.query(
        'SELECT * FROM training_events WHERE franchise_id = $1 AND performed_at > to_timestamp($2::double precision / 1000)',
        [franchiseId, lastSynced / 1000]
      ),
      db.query(
        `SELECT m.* FROM player_stat_mutations m
         JOIN players p ON m.player_id = p.id
         WHERE p.franchise_id = $1 AND m.applied_at > to_timestamp($2::double precision / 1000)`,
        [franchiseId, lastSynced / 1000]
      ),
      db.query(
        `SELECT pe.* FROM player_energy pe
         JOIN players p ON pe.player_id = p.id
         WHERE p.franchise_id = $1`,
        [franchiseId]
      ),
      db.query('SELECT * FROM scheduled_training WHERE franchise_id = $1', [franchiseId]),
    ]);

    return {
      franchiseId,
      tables: {
        players: players.rows?.length ? players.rows : undefined,
        training_facilities: facilities.rows?.length ? facilities.rows : undefined,
        training_events: events.rows?.length ? events.rows : undefined,
        stat_mutations: mutations.rows?.length ? mutations.rows : undefined,
        player_energy: energy.rows?.length ? energy.rows : undefined,
        scheduled_training: schedules.rows?.length ? schedules.rows : undefined,
      },
    };
  }

  async syncAll(db: any, franchiseId: string): Promise<SyncResult> {
    const payload = await this.extractLocalState(db, franchiseId);
    return this.pushToCloud(payload);
  }
}

export const createSyncEngine = () => new CloudSyncEngine();
