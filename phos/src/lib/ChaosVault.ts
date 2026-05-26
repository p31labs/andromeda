export interface ChaosEntry {
  id: string;
  chaos: string;
  spoons: number;
  timestamp: number;
  chaos_hash: string;
}

let vaultInstance: any = null;
let initPromise: Promise<any> | null = null;

function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export async function getChaosVault(): Promise<any> {
  if (vaultInstance) return vaultInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (typeof window === 'undefined') return null;
    try {
      const { PGlite } = await import('@electric-sql/pglite');
      const db = new PGlite('idb://phos-chaos-vault');
      await db.exec(`
        CREATE TABLE IF NOT EXISTS chaos_log (
          id TEXT PRIMARY KEY,
          chaos TEXT,
          spoons INTEGER,
          timestamp INTEGER,
          chaos_hash TEXT
        );
      `);
      vaultInstance = db;
      return db;
    } catch {
      initPromise = null;
      vaultInstance = null;
      return null;
    }
  })();

  return initPromise;
}

export async function ingestChaos(text: string, spoons: number): Promise<void> {
  const db = await getChaosVault();
  if (!db) return;

  const trimmed = text.trim();
  if (!trimmed) return;

  try {
    const timestamp = Date.now();
    const id = `${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
    const hash = simpleHash(trimmed);

    await db.exec(
      `INSERT INTO chaos_log (id, chaos, spoons, timestamp, chaos_hash) VALUES ($1, $2, $3, $4, $5)`,
      { params: [id, trimmed, spoons, timestamp, hash] }
    );
  } catch {
    // DB unavailable — silently degrade
  }
}

export async function getChaosLog(): Promise<ChaosEntry[]> {
  const db = await getChaosVault();
  if (!db) return [];

  try {
    const result = await db.query(
      `SELECT id, chaos, spoons, timestamp, chaos_hash FROM chaos_log ORDER BY timestamp DESC LIMIT 50`
    );
    return result.rows;
  } catch {
    return [];
  }
}
