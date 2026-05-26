import { useState, useEffect, useCallback } from 'react';

export interface VaultItem {
  id: string;
  text: string;
  timestamp: number;
  signature: string;
  _crdt_clock: number;
  _crdt_node_id: string;
  _crdt_hash: string;
}

// Node ID for CRDT - should be unique per device
const NODE_ID = typeof window !== 'undefined'
  ? crypto.randomUUID()
  : 'server';

// Worker connection for sub-8.5ms read / 1.2ms write SLAs
let worker: SharedWorker | null = null;

function getPGLiteWorker(): SharedWorker {
  if (worker) return worker;

  // Create shared worker for multi-tab safety
  worker = new SharedWorker(
    new URL('../workers/pglite-worker.ts', import.meta.url),
    { type: 'module', name: 'p31-pglite-sovereign' }
  );

  return worker;
}

export function useSovereignData() {
  const [data, setData] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const timer = setTimeout(async () => {
      try {
        const worker = getPGLiteWorker();
        const db = worker.port;

        // Load initial data with CRDT fields
        db.addEventListener('message', (event: MessageEvent) => {
          if (event.data?.type === 'QUERY_RESULT' && event.data?.query?.startsWith('SELECT')) {
            // Map content to text for consistent interface
            const rows = event.data.rows.map((row: any) => ({
              ...row,
              text: row.content || row.text,
            }));
            setData(prev => [...prev, ...rows]);
          }
        });

        // Query initial state
        db.postMessage({
          type: 'query',
          query: 'SELECT * FROM sovereign_ledger ORDER BY _crdt_clock DESC LIMIT 100',
        });

      } catch (e) {
        setError('Failed to initialize Sovereign Data Layer.');
      } finally {
        setIsLoading(false);
      }
    }, 300); // Reduced from 600ms for faster startup

    return () => clearTimeout(timer);
  }, []);

  const initializeVault = useCallback(async (publicKey: string) => {
    if (typeof window === 'undefined') return;

    try {
      const worker = getPGLiteWorker();
      worker.port.start();

      // Initialize vault with the public key stored in metadata table
      await new Promise<void>((resolve) => {
        worker.port.postMessage({
          type: 'exec',
          query: `INSERT OR REPLACE INTO vault_metadata (key, value) VALUES ('public_key', ?)`,
          params: [publicKey],
        });
        setTimeout(resolve, 100);
      });

      setData([]);
      setError(null);
    } catch (e) {
      setError('Failed to initialize vault.');
    }
  }, []);

  const addVaultItem = useCallback(async (payload: string) => {
    if (typeof window === 'undefined') return;

    const newItem: VaultItem = {
      id: crypto.randomUUID(),
      text: payload,
      timestamp: Date.now(),
      signature: 'mock-signature-' + Math.random().toString(36).substring(2, 15),
      _crdt_clock: Date.now(),
      _crdt_node_id: NODE_ID,
      _crdt_hash: crypto.randomUUID(),
    };

    const worker = getPGLiteWorker();
    
    worker.port.postMessage({
      type: 'exec',
      query: `INSERT INTO sovereign_ledger (id, content, timestamp, signature, _crdt_clock, _crdt_node_id, _crdt_hash) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params: [
        newItem.id,
        newItem.text,
        newItem.timestamp,
        newItem.signature,
        newItem._crdt_clock,
        newItem._crdt_node_id,
        newItem._crdt_hash,
      ],
    });

    setData(prev => [newItem, ...prev]);
  }, []);

  const deleteVaultItem = useCallback(async (id: string) => {
    if (typeof window === 'undefined') return;

    const worker = getPGLiteWorker();
    
    worker.port.postMessage({
      type: 'exec',
      query: 'DELETE FROM sovereign_ledger WHERE id = ?',
      params: [id],
    });

    setData(prev => prev.filter(item => item.id !== id));
  }, []);

  // Live query for real-time CRDT updates
  const subscribeToChanges = useCallback((callback: (item: VaultItem) => void) => {
    if (typeof window === 'undefined') return () => {};

    const worker = getPGLiteWorker();
    
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'INSERT' && event.data?.table === 'sovereign_ledger') {
        callback(event.data.row);
      }
    };

    worker.port.addEventListener('message', handler);
    worker.port.start();

    return () => {
      worker.port.removeEventListener('message', handler);
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    addVaultItem,
    deleteVaultItem,
    subscribeToChanges,
    initializeVault
  };
}

// Cryptographic hash function for CRDT ground truth
export function generateCRDTHash(payload: string, previousHash: string = '00000000'): string {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${previousHash}:${payload}`))
    .then(hash => {
      const arr = new Uint8Array(hash);
      return Array.from(arr.slice(0, 8))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, 16);
    });
}