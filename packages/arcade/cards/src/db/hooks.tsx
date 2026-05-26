// P31 Card Table: React Hooks for Database
// PGLite integration with Electric SQL sync

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import type { PGlite } from '@electric-sql/pglite';
import type { MatchState, CrossGameIdentity } from '../types';
import { initDatabase, saveMatch, getMatch, getRecentMatches, updatePlayerStats, getDatabaseStats } from './schema';

// ============================================
// DATABASE CONTEXT
// ============================================

interface DatabaseContextType {
  db: PGlite | null;
  isReady: boolean;
  error: Error | null;
  stats: {
    matches: number;
    players: number;
    actions: number;
    achievements: number;
  } | null;
  refreshStats: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isReady: false,
  error: null,
  stats: null,
  refreshStats: async () => {},
});

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<PGlite | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState<DatabaseContextType['stats']>(null);
  
  useEffect(() => {
    let mounted = true;
    
    async function init() {
      try {
        const database = await initDatabase();
        if (mounted) {
          setDb(database);
          setIsReady(true);
          
          // Load initial stats
          const dbStats = await getDatabaseStats();
          setStats(dbStats);
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e : new Error('Failed to initialize database'));
        }
      }
    }
    
    init();
    
    return () => {
      mounted = false;
    };
  }, []);
  
  const refreshStats = useCallback(async () => {
    try {
      const dbStats = await getDatabaseStats();
      setStats(dbStats);
    } catch (e) {
      console.error('Failed to refresh stats:', e);
    }
  }, []);
  
  return (
    <DatabaseContext.Provider value={{ db, isReady, error, stats, refreshStats }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  return useContext(DatabaseContext);
}

// ============================================
// MATCH HOOKS
// ============================================

interface UseMatchResult {
  match: MatchState | null;
  isLoading: boolean;
  error: Error | null;
  save: (matchState: MatchState, winner?: string | null) => Promise<void>;
}

export function useMatch(matchId: string | null): UseMatchResult {
  const [match, setMatch] = useState<MatchState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isReady } = useDatabase();
  
  useEffect(() => {
    if (!matchId || !isReady) return;
    
    async function loadMatch() {
      setIsLoading(true);
      try {
        const data = await getMatch(matchId);
        if (data) {
          setMatch(data.match_state);
        }
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to load match'));
      } finally {
        setIsLoading(false);
      }
    }
    
    loadMatch();
  }, [matchId, isReady]);
  
  const save = useCallback(async (matchState: MatchState, winner?: string | null) => {
    if (!isReady) return;
    
    try {
      await saveMatch({
        id: matchState.matchId,
        gameId: matchState.gameId,
        matchState: matchState as any,
        winner: winner || undefined,
        finalScores: matchState.scores,
      });
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to save match'));
    }
  }, [isReady]);
  
  return { match, isLoading, error, save };
}

// ============================================
// RECENT MATCHES HOOK
// ============================================

interface UseRecentMatchesResult {
  matches: Array<{
    id: string;
    gameId: string;
    createdAt: string;
    winner?: string;
    finalScores?: Record<string, number>;
  }>;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useRecentMatches(limit: number = 10): UseRecentMatchesResult {
  const [matches, setMatches] = useState<UseRecentMatchesResult['matches']>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isReady } = useDatabase();
  
  const load = useCallback(async () => {
    if (!isReady) return;
    
    setIsLoading(true);
    try {
      const data = await getRecentMatches(limit);
      setMatches(data.map(row => ({
        id: row.id,
        gameId: row.game_id,
        createdAt: row.created_at,
        winner: row.winner,
        finalScores: row.final_scores,
      })));
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load matches'));
    } finally {
      setIsLoading(false);
    }
  }, [isReady, limit]);
  
  useEffect(() => {
    load();
  }, [load]);
  
  return { matches, isLoading, error, refresh: load };
}

// ============================================
// PLAYER STATS HOOK
// ============================================

interface UsePlayerStatsResult {
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalHandsPlayed: number;
    totalHandsWon: number;
    favoriteGame: string | null;
    totalXPEarned: number;
  } | null;
  isLoading: boolean;
  error: Error | null;
  update: (updates: {
    gamesPlayed?: number;
    gamesWon?: number;
    handsPlayed?: number;
    handsWon?: number;
    favoriteGame?: string;
    xpEarned?: number;
  }) => Promise<void>;
}

export function usePlayerStats(playerId: string, identityId: string): UsePlayerStatsResult {
  const [stats, setStats] = useState<UsePlayerStatsResult['stats']>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isReady } = useDatabase();
  
  const update = useCallback(async (updates: {
    gamesPlayed?: number;
    gamesWon?: number;
    handsPlayed?: number;
    handsWon?: number;
    favoriteGame?: string;
    xpEarned?: number;
  }) => {
    if (!isReady) return;
    
    try {
      await updatePlayerStats(playerId, identityId, updates);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to update stats'));
    }
  }, [isReady, playerId, identityId]);
  
  return { stats, isLoading, error, update };
}

// ============================================
// PERSISTENCE HOOK
// ============================================

interface UsePersistentMatchResult {
  matchState: MatchState | null;
  saveMatch: (state: MatchState) => Promise<void>;
  isLoading: boolean;
}

export function usePersistentMatch(
  matchId: string,
  identity: CrossGameIdentity
): UsePersistentMatchResult {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { db, isReady } = useDatabase();
  
  // Load match on mount
  useEffect(() => {
    if (!isReady) return;
    
    async function load() {
      setIsLoading(true);
      try {
        const data = await getMatch(matchId);
        if (data) {
          setMatchState(data.match_state);
        }
      } catch (e) {
        console.error('Failed to load match:', e);
      } finally {
        setIsLoading(false);
      }
    }
    
    load();
  }, [matchId, isReady]);
  
  // Save match with debounce
  const saveMatch = useCallback(async (state: MatchState) => {
    if (!isReady) return;
    
    try {
      await saveMatchDB({
        id: state.matchId,
        gameId: state.gameId,
        matchState: state as any,
      });
    } catch (e) {
      console.error('Failed to save match:', e);
    }
  }, [isReady]);
  
  return { matchState, saveMatch, isLoading };
}

// Helper function
async function saveMatchDB(match: {
  id: string;
  gameId: string;
  matchState: any;
  winner?: string;
  finalScores?: any;
}): Promise<string> {
  const { saveMatch: doSaveMatch } = await import('./schema');
  return doSaveMatch(match);
}

// ============================================
// SYNC HOOK
// ============================================

interface UseSyncResult {
  isSyncing: boolean;
  lastSync: Date | null;
  error: Error | null;
  sync: () => Promise<void>;
}

export function useSync(identity: CrossGameIdentity): UseSyncResult {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const sync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    
    try {
      // In a real implementation, this would sync with a remote server
      // For now, we just update the timestamp
      await new Promise(resolve => setTimeout(resolve, 500));
      setLastSync(new Date());
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Sync failed'));
    } finally {
      setIsSyncing(false);
    }
  }, []);
  
  return { isSyncing, lastSync, error, sync };
}
