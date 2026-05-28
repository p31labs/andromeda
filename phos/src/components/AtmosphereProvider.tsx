import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { SurfaceKey, AtmospherePreset } from '../lib/atmosphere';
import { resolveAtmosphere, detectGrayRock } from '../lib/atmosphere';
import { phosAPI, type AtmosphereResponse, PHOSAPIError, type StreamConnection } from '../lib/phos-api';
import { logSpokenStateChanged } from '../lib/EventLogger';

export interface AtmosphereContextValue {
  currentSurface: SurfaceKey;
  preset: AtmospherePreset;
  grayRock: boolean;
  setSurface: (surface: SurfaceKey) => void;
  setGrayRock: (active: boolean) => void;
  loading: boolean;
  error: string | null;
  spoons: number;
  setSpoons: (level: number) => void;
}

const AtmosphereContext = createContext<AtmosphereContextValue | null>(null);

export function useAtmosphere(): AtmosphereContextValue {
  const ctx = useContext(AtmosphereContext);
  if (!ctx) {
    throw new Error('useAtmosphere must be used within an <AtmosphereProvider>');
  }
  return ctx;
}

export interface AtmosphereProviderProps {
  initialSurface?: SurfaceKey;
  children?: ReactNode;
  remoteEnabled?: boolean;
  initialSpoons?: number;
}

export const AtmosphereProvider: React.FC<AtmosphereProviderProps> = ({
  initialSurface = 'GREETING',
  children,
  remoteEnabled = true,
  initialSpoons = 3,
}) => {
  // Parse URL params synchronously before first render to avoid hydration flash
  const urlParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  const urlSpoons = urlParams.has('spoons')
    ? Math.max(0, Math.min(5, parseInt(urlParams.get('spoons') || '3', 10)))
    : null;

  const urlSurface = urlParams.has('surface')
    ? urlParams.get('surface')!.toUpperCase() as SurfaceKey
    : null;

  const [currentSurface, setCurrentSurface] = useState<SurfaceKey>(
    urlSurface || initialSurface
  );
  const [grayRock, setGrayRockState] = useState<boolean>(() =>
    detectGrayRock(
      typeof window !== 'undefined' ? window.location.search : '',
      undefined
    )
  );
  const [spoons, setSpoonsState] = useState<number>(() => {
    // URL param takes highest priority, then localStorage, then prop default
    if (urlSpoons !== null) return urlSpoons;
    if (typeof window === 'undefined') return initialSpoons;
    try {
      const stored = localStorage.getItem('phos_spoons');
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 5) return parsed;
      }
    } catch { /* localStorage unavailable */ }
    return initialSpoons;
  });
  const [preset, setPreset] = useState<AtmospherePreset>(() =>
    resolveAtmosphere(
      urlSurface || initialSurface,
      detectGrayRock(
        typeof window !== 'undefined' ? window.location.search : '',
        undefined
      )
    )
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ---- Refs for current values (clean access in callbacks) ----
  const currentSurfaceRef = useRef(currentSurface);
  currentSurfaceRef.current = currentSurface;
  const spoonsRef = useRef(spoons);
  spoonsRef.current = spoons;
  const grayRockRef = useRef(grayRock);
  grayRockRef.current = grayRock;

  // ---- Synaptic Web: WebSocket state sync ----
  const applyingRemoteUpdate = useRef(false);
  const streamRef = useRef<StreamConnection | null>(null);

  // Handle incoming remote state syncs
  const handleRemoteSync = useCallback((payload: { spoons?: number; surface?: string; grayRock?: boolean }) => {
    applyingRemoteUpdate.current = true;

    if (payload.spoons !== undefined) {
      const level = Math.max(0, Math.min(5, payload.spoons));
      setSpoonsState(() => {
        try { localStorage.setItem('phos_spoons', String(level)); } catch { /* ignore */ }
        return level;
      });
      if (level <= 1) {
        setGrayRockState(true);
      } else if (payload.grayRock === false) {
        setGrayRockState(false);
      }
    }

    if (payload.surface !== undefined) {
      const surf = payload.surface.toUpperCase() as SurfaceKey;
      if (surf !== currentSurfaceRef.current) {
        setCurrentSurface(surf);
      }
    }

    if (payload.grayRock !== undefined && payload.spoons === undefined) {
      setGrayRockState(payload.grayRock);
    }

    applyingRemoteUpdate.current = false;
  }, []);

  // Connect WebSocket on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const connection = phosAPI.connectStream(handleRemoteSync);
    streamRef.current = connection;

    return () => {
      connection.disconnect();
      streamRef.current = null;
    };
  }, [handleRemoteSync]);

  // ---- setGrayRock ----
  const setGrayRock = useCallback((active: boolean) => {
    setGrayRockState(active);
  }, []);

  // ---- setSpoons ----
  const setSpoons = useCallback(
    (level: number) => {
      setSpoonsState((prev) => {
        try { localStorage.setItem('phos_spoons', String(level)); } catch { /* ignore */ }
        if (prev !== level) {
          logSpokenStateChanged(prev, level);
        }
        return level;
      });

      if (level <= 1) {
        setGrayRockState(true);
      } else {
        const params = new URLSearchParams(
          typeof window !== 'undefined' ? window.location.search : ''
        );
        if (!params.has('urgent') && !params.has('grayrock') && !params.has('crisis')) {
          setGrayRockState(false);
        }
      }

      // Broadcast to mesh (only if this is a local change, not a remote echo)
      if (!applyingRemoteUpdate.current) {
        streamRef.current?.send({
          spoons: level,
          surface: currentSurfaceRef.current,
          grayRock: level <= 1 || grayRockRef.current,
        });
      }
    },
    []
  );

  // ---- setSurface ----
  const setSurface = useCallback((surface: SurfaceKey) => {
    setCurrentSurface(surface);
    setError(null);

    // Broadcast to mesh
    if (!applyingRemoteUpdate.current) {
      streamRef.current?.send({
        spoons: spoonsRef.current,
        surface,
        grayRock: grayRockRef.current,
      });
    }
  }, []);

  // ---- Resolve preset whenever surface or grayRock changes ----
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    if (grayRock) {
      setPreset(resolveAtmosphere(currentSurface, true));
      setLoading(false);
      setError(null);
      return;
    }

    const localPreset = resolveAtmosphere(currentSurface, false);
    setPreset(localPreset);
    setLoading(true);
    setError(null);

    if (!remoteEnabled) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    phosAPI
      .getAtmosphere(currentSurface, grayRock)
      .then((remote: AtmosphereResponse) => {
        if (controller.signal.aborted) return;
        const p = remote.preset;
        setPreset({
          starfield: p.starfield,
          palette: p.palette,
          motion: p.motion,
          tracking: p.tracking,
          voice: p.voice,
        });
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const msg =
          err instanceof PHOSAPIError
            ? err.message
            : 'Failed to fetch atmosphere preset';
        setError(msg);
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [currentSurface, grayRock, remoteEnabled]);

  const value: AtmosphereContextValue = {
    currentSurface,
    preset,
    grayRock,
    setSurface,
    setGrayRock,
    loading,
    error,
    spoons,
    setSpoons,
  };

  return (
    <AtmosphereContext.Provider value={value}>
      {children}
    </AtmosphereContext.Provider>
  );
};

export default AtmosphereProvider;
