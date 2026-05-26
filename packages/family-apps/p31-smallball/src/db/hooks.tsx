// React Hooks for PGLite Live Queries
// Reactive database subscriptions

import { useEffect, useState, useCallback } from 'react';
import { PGlite } from '@electric-sql/pglite';
import { getDatabase } from './pglite';

// Hook for single row queries
export function useLiveQuery<T>(
  query: string,
  params?: unknown[],
  deps?: React.DependencyList
): { data: T | null; loading: boolean; error: Error | null; refresh: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const db = getDatabase();
      const result = await db.query<T>(query, params);
      setData(result.rows[0] ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [query, JSON.stringify(params)]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupLiveQuery = async () => {
      try {
        const db: any = getDatabase();
        // PGLite live extension returns an async iterable
        if (!db.live) {
          refresh();
          return;
        }
        
        const liveQuery = db.live.query(query, params);
        
        // Subscribe to changes
        const stream = liveQuery.subscribe();
        const reader = stream.getReader();

        const processStream = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            setData(value.rows[0] ?? null);
            setLoading(false);
          }
        };

        processStream().catch((err: any) => {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        });

        unsubscribe = () => reader.releaseLock();
      } catch (err) {
        // Fallback to regular query if live not available
        refresh();
      }
    };

    setupLiveQuery();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, deps || []);

  return { data, loading, error, refresh };
}

// Hook for list queries with incremental updates
export function useLiveIncrementalQuery<T>(
  query: string,
  params?: unknown[],
  keyField?: keyof T,
  deps?: React.DependencyList
): { data: T[]; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupIncrementalQuery = async () => {
      try {
        const db: any = getDatabase();
        if (!db.live) {
          const result = await db.query(query, params);
          setData(result.rows as T[]);
          setLoading(false);
          return;
        }
        
        const liveQuery = db.live.incrementalQuery(query, params, keyField as string);
        
        const stream = liveQuery.subscribe();
        const reader = stream.getReader();

        const processStream = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            setData(value.rows);
            setLoading(false);
          }
        };

        processStream().catch((err: any) => {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        });

        unsubscribe = () => reader.releaseLock();
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    };

    setupIncrementalQuery();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, deps || []);

  return { data, loading, error };
}

// Hook for database mutations
export function useMutation<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (
    query: string,
    params?: unknown[]
  ): Promise<T | null> => {
    setLoading(true);
    try {
      const db = getDatabase();
      const result = await db.query<T>(query, params);
      setError(null);
      return result.rows[0] ?? null;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}

// Database context for React
import { createContext, useContext, ReactNode } from 'react';

interface DatabaseContextType {
  db: PGlite | null;
  initialized: boolean;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  initialized: false
});

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [db, setDb] = useState<PGlite | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { initDatabase } = await import('./pglite');
        const database = await initDatabase();
        setDb(database);
        setInitialized(true);
      } catch (err) {
        console.error('Database init failed:', err);
        setInitialized(true); // Continue anyway
      }
    };
    init();
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, initialized }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  return useContext(DatabaseContext);
}
