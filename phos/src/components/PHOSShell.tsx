import PHOSOrb from './PHOSOrb';
import TheGuardian from './TheGuardian';
import { SurfaceContent } from './SurfaceContent';
import { SurfaceErrorBoundary } from './SurfaceErrorBoundary';
import { DemoController } from './DemoController';
import { GrantNarrativeOverlay } from './GrantNarrativeOverlay';

export { getBiologicalTheme };

const VALID_SURFACES = new Set([
  'GREETING', 'IGNITION', 'BONDING', 'THE_BUFFER', 'VAULT', 'GRID',
  'NODE_ZERO', 'LEDGER', 'LOVE', 'HEARTH', 'ARCADE', 'ARCHIVE',
]);

function hydrateFromURL(): { spoons: number; surface: string } {
  try {
    const params = new URLSearchParams(window.location.search);
    const spoonsParam = params.get('spoons');
    const surfaceParam = params.get('surface');
    const spoons = spoonsParam !== null
      ? Math.max(0, Math.min(5, parseInt(spoonsParam, 10) || 0))
      : 3;
    const surface = surfaceParam !== null && VALID_SURFACES.has(surfaceParam.toUpperCase())
      ? surfaceParam.toUpperCase()
      : 'GREETING';
    return { spoons, surface };
  } catch {
    return { spoons: 3, surface: 'GREETING' };
  }
}

/* v8 ignore start */
function PHOSShellInner({ skipLoading = false }: { skipLoading?: boolean }) {
  const { spoons, setSpoons, grayRock, currentSurface, setSurface } = useAtmosphere();

  useEffect(() => {
    if (skipLoading) return;
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [skipLoading]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setHudOpen(false);
      if (spoons === 0) setSpoons(3);
    }
    if (e.key === 'h' || e.key === 'H') {
      if (!e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setHudOpen(prev => !prev);
      }
    }
    if (e.key === '0') {
      e.preventDefault();
      setSpoons(0);
    }
  }, [spoons, setSpoons]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (spoons === 0 || grayRock) {
    return <TheGuardian />;
  }

  const surfaceNames: Record<string, string> = {
    GREETING: 'Greeting', IGNITION: 'Ignition', BONDING: 'Bonding', THE_BUFFER: 'Buffer',
    VAULT: 'Vault', GRID: 'Grid', NODE_ZERO: 'Node Zero', LEDGER: 'Ledger', LOVE: 'Love',
    HEARTH: 'Hearth', ARCADE: 'Arcade', ARCHIVE: 'Archive', COMPASS: 'Compass', SETTINGS: 'Settings',
  };

      <GrantNarrativeOverlay />

      <EscapeHatch
        theme={theme}
        hudOpen={hudOpen}
        currentSurface={currentSurface}
        spoons={spoons}
        surfaceNames={surfaceNames}
        onToggleHud={() => setHudOpen(!hudOpen)}
        onSetSpoons={(s) => { setSpoons(s); setHudOpen(false); }}
        onSetSurface={(s) => { setSurface(s); setHudOpen(false); }}
      />

  );
}

export default function PHOSShell() {
  const { spoons, surface } = hydrateFromURL();
  return (
  );
}
/* v8 ignore stop */
