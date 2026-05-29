/*
 * Simple in-memory fallback for PGLiteDatabaseContract.
 * This allows the application to run even if @electric-sql/pglite fails to load.
 */

export interface PGLiteDatabaseContract {
  query<T = any>(queryText: string, params?: any[]): Promise<{ rows: T[] }>;
  exec(queryText: string): Promise<any>;
  listen(channel: string, callback: () => void): Promise<() => Promise<void>>;
  close(): Promise<void>;
}

const inMemoryStore: { [key: string]: any[] } = {
  resin_ledger: [],
  resin_wallets: []
};

const listeners: { [channel: string]: (() => void)[] } = {};

export class PGLiteFallback implements PGLiteDatabaseContract {
  private notifyListeners(channel: string) {
    if (listeners[channel]) {
      listeners[channel].forEach(cb => cb());
    }
  }

  async query<T = any>(queryText: string, params?: any[]): Promise<{ rows: T[] }> {
    const normalized = queryText.toLowerCase().trim();
    console.warn(`[PGLiteFallback] Query: ${normalized.substring(0, 100)}...`);

    // Handle Resin Balance Aggregation
    if (normalized.includes('sum(case when transaction_type') && normalized.includes('from resin_ledger')) {
      const franchiseId = params?.[0];
      const ledger = inMemoryStore['resin_ledger'] || [];
      const balance = ledger
        .filter(r => r.franchise_id === franchiseId)
        .reduce((acc, r) => {
          return acc + (r.transaction_type === 'CREDIT' ? r.amount : -r.amount);
        }, 100); // Default balance is 100

      return { rows: [{ current_balance: balance }] as any };
    }

    // Handle Ledger History
    if (normalized.startsWith('select') && normalized.includes('from resin_ledger')) {
      const franchiseId = params?.[0];
      const rows = (inMemoryStore['resin_ledger'] || [])
        .filter(r => r.franchise_id === franchiseId)
        .slice(-10)
        .reverse();
      return { rows: rows as T[] };
    }

    // Handle Ledger Insert
    if (normalized.startsWith('insert into resin_ledger')) {
      const [id, franchise_id, game_id, transaction_type, amount, reason] = params || [];
      const newRow = { id, franchise_id, game_id, transaction_type, amount, reason, created_at: new Date().toISOString() };
      inMemoryStore['resin_ledger'].push(newRow);
      this.notifyListeners('resin_ledger_changes');
      return { rows: [newRow as any] };
    }

    // Handle Wallet Upsert (Silent success for fallback)
    if (normalized.startsWith('insert into resin_wallets')) {
      return { rows: [] };
    }

    return { rows: [] };
  }

  async exec(queryText: string): Promise<any> {
    console.warn(`[PGLiteFallback] Executing Multi-Statement: ${queryText.substring(0, 50)}...`);
    // Basic split for schema initialization
    const statements = queryText.split(';').filter(s => s.trim().length > 0);
    for (const statement of statements) {
      await this.query(statement);
    }
    return [];
  }

  async listen(channel: string, callback: () => void): Promise<() => Promise<void>> {
    console.log(`PGLite Fallback: Listening on channel: ${channel}`);
    if (!listeners[channel]) {
      listeners[channel] = [];
    }
    listeners[channel].push(callback);
    return async () => {
      listeners[channel] = listeners[channel].filter(cb => cb !== callback);
    };
  }

  async close(): Promise<void> {
    console.log("PGLite Fallback: Database closed.");
  }
}