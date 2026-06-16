import { useState, useEffect } from 'react';

export interface EquilibriumState {
  timestamp: string;
  mandatory: {
    G0: string;
    G1: string;
    G2: string;
    hardcoded?: number;
    redefinitions?: number;
    projects_checked?: number;
    calcium_mg_dL?: number;
    spoons?: number;
  };
  warnings: string[];
  stage: 'VOID' | 'SEED' | 'SPROUT' | 'SAPLING' | 'BLOOM' | 'FRUIT';
  entropy: number;
}

export interface EquilibriumResult {
  equilibrium: EquilibriumState | null;
  stage: EquilibriumState['stage'];
  entropy: number;
  lastUpdated: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEquilibrium(pollIntervalMs = 30000): EquilibriumResult {
  const [equilibrium, setEquilibrium] = useState<EquilibriumState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/equilibrium.json');
      if (!res.ok) throw new Error(`equilibrium endpoint ${res.status}`);
      const data = (await res.json()) as EquilibriumState;
      setEquilibrium(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'equilibrium fetch failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, pollIntervalMs);
    return () => clearInterval(id);
  }, [load, pollIntervalMs]);

  return {
    equilibrium,
    stage: equilibrium?.stage ?? 'VOID',
    entropy: equilibrium?.entropy ?? 0,
    lastUpdated: equilibrium?.timestamp ?? null,
    loading,
    error,
    refresh: load,
  };
}
