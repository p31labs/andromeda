import { useState, useEffect, useCallback, useRef } from 'react';
import * as v from 'valibot';

export const EquilibriumSchema = v.object({
  spoon: v.fallback(v.pipe(v.number(), v.minValue(0), v.maxValue(20)), 4),
  calcium: v.fallback(v.pipe(v.number(), v.minValue(0), v.maxValue(15)), 8.2),
  entropy: v.fallback(v.pipe(v.number(), v.minValue(0), v.maxValue(5)), 1.0),
  fidelity: v.fallback(v.pipe(v.number(), v.minValue(0), v.maxValue(100)), 62.4),
  stage: v.fallback(v.picklist(['VOID','SEED','SPROUT','SAPLING','BLOOM','FRUIT']), 'SAPLING'),
  serverTruth: v.fallback(v.boolean(), true),
  forceServerStage: v.fallback(v.boolean(), true),
});

export type EquilibriumState = v.InferOutput<typeof EquilibriumSchema>;

interface EquilibriumServerResponse {
  mandatory?: {
    calcium_mg_dL?: number;
    spoons?: number;
  };
  stage?: string;
  entropy?: number;
  fidelity?: number;
}

interface LocalOverride {
  serum_calcium_mg_dL?: number;
  level?: number;
  mandatory?: {
    calcium_mg_dL?: number;
    spoons?: number;
  };
  stage?: string;
  entropy?: number;
}

export function useEquilibrium(pollingInterval = 30000) {
  const [equilibrium, setEquilibrium] = useState<EquilibriumState>({
    spoon: 4,
    calcium: 8.2,
    entropy: 1.0,
    fidelity: 62.4,
    stage: 'SAPLING',
    serverTruth: true,
    forceServerStage: true
  });

  const isFetching = useRef(false);

  const fetchState = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      let serverEq: EquilibriumServerResponse = {};
      try {
        const basePath = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${basePath}equilibrium.json`);
        if (res.ok) serverEq = (await res.json()) as EquilibriumServerResponse;
      } catch (e) {
        // Silent fallback
      }

      const serverCa = serverEq?.mandatory?.calcium_mg_dL ?? 8.2;
      const serverSpoon = serverEq?.mandatory?.spoons ?? 4;
      const serverStage = serverEq?.stage ?? 'SAPLING';
      const serverEntropy = serverEq?.entropy ?? 1.0;
      const serverFidelity = serverEq?.fidelity ?? 62.4;

      const localMed: LocalOverride | null = JSON.parse(localStorage.getItem('p31_medical_override') || 'null');
      const localSpoon: LocalOverride | null = JSON.parse(localStorage.getItem('p31_spoon_override') || 'null');
      const localEq: LocalOverride | null = JSON.parse(localStorage.getItem('p31_equilibrium_override') || 'null');
      const forceServerStage = localStorage.getItem('p31_force_server_stage') !== 'false';

      const hasOverrides = !!(localMed || localSpoon || localEq);

      const currentCa = localMed?.serum_calcium_mg_dL ?? localEq?.mandatory?.calcium_mg_dL ?? serverCa;
      const currentSpoon = localSpoon?.level ?? localEq?.mandatory?.spoons ?? serverSpoon;
      const baseStage = localEq?.stage ?? serverStage;

      let dynamicEntropy = localEq?.entropy ?? serverEntropy;
      let dynamicStage = baseStage;

      if (!forceServerStage) {
        if (currentCa <= 7.8) {
          dynamicStage = 'BLOOM';
          dynamicEntropy = 2.5;
        } else if (currentSpoon <= 2) {
          dynamicStage = 'SAPLING';
          dynamicEntropy = 0.3;
        }
      }

      const merged = {
        spoon: currentSpoon,
        calcium: currentCa,
        entropy: dynamicEntropy,
        fidelity: serverFidelity,
        stage: dynamicStage,
        serverTruth: !hasOverrides,
        forceServerStage,
      };
      const validated = v.parse(EquilibriumSchema, merged);
      setEquilibrium(validated);
    } catch (e) {
      console.error("Equilibrium sync fatal error:", e);
    } finally {
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, pollingInterval);

    const handleStorage = () => fetchState();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('equilibrium_override', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('equilibrium_override', handleStorage);
    };
  }, [fetchState, pollingInterval]);

  return { equilibrium };
}
