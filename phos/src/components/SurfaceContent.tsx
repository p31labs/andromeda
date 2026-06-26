<<<<<<< HEAD
import React, { Suspense, lazy } from 'react';
import { getBiologicalTheme } from './PHOSShell';
import type { ThemeShape } from '../lib/themeEngine';
import { SurfaceErrorBoundary } from './SurfaceErrorBoundary';
=======
import React from 'react';
import { getBiologicalTheme } from './PHOSShell';
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
import { GreetingSurface } from '../surfaces/GreetingSurface';
import { IgnitionSurface } from '../surfaces/IgnitionSurface';
import { BondingSurface } from '../surfaces/BondingSurface';
import { CompassSurface } from '../surfaces/CompassSurface';
import { SettingsSurface } from '../surfaces/SettingsSurface';
<<<<<<< HEAD
import { RetroVaultSurface } from '../surfaces/RetroVaultSurface';
import { LedgerSurface } from '../surfaces/LedgerSurface';
import { NodeZeroSurface } from '../surfaces/NodeZeroSurface';
import { HearthSurface } from '../surfaces/HearthSurface';

const ArcadeSurface = lazy(() =>
  import('../surfaces/ArcadeSurface').then(m => ({ default: m.ArcadeSurface }))
);
const ChaosIngest = lazy(() =>
  import('../surfaces/ChaosIngest').then(m => ({ default: m.ChaosIngest }))
);
const ConnectionGridSurface = lazy(() =>
  import('../surfaces/ConnectionGridSurface').then(m => ({ default: m.ConnectionGridSurface }))
);
const ShakeStream = lazy(() =>
  import('../surfaces/ShakeStream').then(m => ({ default: m.ShakeStream }))
);
const WarehouseSurface = lazy(() =>
  import('../surfaces/WarehouseSurface').then(m => ({ default: m.WarehouseSurface }))
);

function SurfaceSkeleton({ name }: { name: string }) {
  return (
    <div className="animate-pulse p-6 space-y-4" role="status" aria-label={`Loading ${name}`}>
      <div className="h-4 bg-white/5 rounded w-2/3" />
      <div className="h-3 bg-white/5 rounded w-1/2" />
      <div className="h-3 bg-white/5 rounded w-3/4" />
    </div>
  );
}

interface SurfaceProps {
  currentSurface: string;
  theme?: ThemeShape;
=======
import { ChaosIngest } from '../surfaces/ChaosIngest';
import { RetroVaultSurface } from '../surfaces/RetroVaultSurface';
import { LedgerSurface } from '../surfaces/LedgerSurface';
import { ArcadeSurface } from '../surfaces/ArcadeSurface';
import { NodeZeroSurface } from '../surfaces/NodeZeroSurface';
import { ConnectionGridSurface } from '../surfaces/ConnectionGridSurface';
import { HearthSurface } from '../surfaces/HearthSurface';
import { ShakeStream } from '../surfaces/ShakeStream';
import { WarehouseSurface } from '../surfaces/WarehouseSurface';

interface SurfaceProps {
  currentSurface: string;
  theme?: Record<string, string>;
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  setSurface: (surf: string) => void;
  spoons: number;
}

export function SurfaceContent({ currentSurface, setSurface, spoons, theme: externalTheme }: SurfaceProps) {
<<<<<<< HEAD
  const theme = externalTheme || getBiologicalTheme(spoons, false, 4);

  switch (currentSurface) {
    case 'GREETING':
      return (
        <SurfaceErrorBoundary surfaceName="GREETING">
          <GreetingSurface />
        </SurfaceErrorBoundary>
      );

    case 'IGNITION':
      return (
        <SurfaceErrorBoundary surfaceName="IGNITION">
          <IgnitionSurface />
        </SurfaceErrorBoundary>
      );

    case 'BONDING':
      return (
        <SurfaceErrorBoundary surfaceName="BONDING">
          <BondingSurface />
        </SurfaceErrorBoundary>
      );

    case 'COMPASS':
      return (
        <SurfaceErrorBoundary surfaceName="COMPASS">
          <CompassSurface />
        </SurfaceErrorBoundary>
      );

    case 'SETTINGS':
      return (
        <SurfaceErrorBoundary surfaceName="SETTINGS">
          <SettingsSurface />
        </SurfaceErrorBoundary>
      );

    case 'THE_BUFFER':
      return (
        <SurfaceErrorBoundary surfaceName="THE_BUFFER">
          <Suspense fallback={<SurfaceSkeleton name="THE_BUFFER" />}>
            <ChaosIngest theme={theme} />
          </Suspense>
        </SurfaceErrorBoundary>
      );

    case 'VAULT':
      return (
        <SurfaceErrorBoundary surfaceName="VAULT">
          <RetroVaultSurface theme={theme} spoons={spoons} />
        </SurfaceErrorBoundary>
      );

    case 'GRID':
      return (
        <SurfaceErrorBoundary surfaceName="GRID">
          <Suspense fallback={<SurfaceSkeleton name="GRID" />}>
            <ConnectionGridSurface theme={theme} spoons={spoons} />
          </Suspense>
        </SurfaceErrorBoundary>
      );

    case 'NODE_ZERO':
      return (
        <SurfaceErrorBoundary surfaceName="NODE_ZERO">
          <NodeZeroSurface theme={theme} spoons={spoons} />
        </SurfaceErrorBoundary>
      );

    case 'LEDGER':
    case 'LOVE':
      return (
        <SurfaceErrorBoundary surfaceName="LEDGER">
          <LedgerSurface theme={theme} />
        </SurfaceErrorBoundary>
      );

    case 'HEARTH':
      return (
        <SurfaceErrorBoundary surfaceName="HEARTH">
          <HearthSurface theme={theme} spoons={spoons} />
        </SurfaceErrorBoundary>
      );

    case 'ARCADE':
      return (
        <SurfaceErrorBoundary surfaceName="ARCADE">
          <Suspense fallback={<SurfaceSkeleton name="ARCADE" />}>
            <ArcadeSurface theme={theme} spoons={spoons} />
          </Suspense>
        </SurfaceErrorBoundary>
      );

    case 'ARCHIVE':
      return (
        <SurfaceErrorBoundary surfaceName="ARCHIVE">
          <Suspense fallback={<SurfaceSkeleton name="ARCHIVE" />}>
            <div className="space-y-4">
              <h3 className="text-sm font-mono uppercase tracking-widest opacity-60">Sovereign Archive Search</h3>
              <ShakeStream theme={theme} initialQuery="" />
            </div>
          </Suspense>
        </SurfaceErrorBoundary>
      );

    case 'WAREHOUSE':
      return (
        <SurfaceErrorBoundary surfaceName="WAREHOUSE">
          <Suspense fallback={<SurfaceSkeleton name="WAREHOUSE" />}>
            <WarehouseSurface theme={theme} spoons={spoons} />
          </Suspense>
        </SurfaceErrorBoundary>
      );

    default:
      return (
        <SurfaceErrorBoundary surfaceName={currentSurface}>
          <div className="p-4 border border-dashed border-red-900/40 text-red-400 font-mono text-xs uppercase tracking-widest rounded-lg">
            ERR_SURFACE_NOT_BOUND // {currentSurface}
          </div>
        </SurfaceErrorBoundary>
=======
  const computedTheme = externalTheme || getBiologicalTheme(spoons, false);
  const theme = computedTheme;

  switch (currentSurface) {
    case 'GREETING':
      return <GreetingSurface />;

    case 'IGNITION':
      return <IgnitionSurface />;

    case 'BONDING':
      return <BondingSurface />;

    case 'COMPASS':
      return <CompassSurface />;

    case 'SETTINGS':
      return <SettingsSurface />;

    case 'THE_BUFFER':
      return <ChaosIngest theme={theme} />;

    case 'VAULT':
      return <RetroVaultSurface theme={theme} spoons={spoons} />;

    case 'GRID':
      return <ConnectionGridSurface theme={theme} spoons={spoons} />;

    case 'NODE_ZERO':
      return <NodeZeroSurface theme={theme} spoons={spoons} />;

    case 'LEDGER':
    case 'LOVE':
      return <LedgerSurface theme={theme} />;

    case 'HEARTH':
      return <HearthSurface theme={theme} spoons={spoons} />;

    case 'ARCADE':
      return <ArcadeSurface theme={theme} spoons={spoons} />;

    case 'ARCHIVE':
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-mono uppercase tracking-widest opacity-60">Sovereign Archive Search</h3>
          <ShakeStream theme={theme} initialQuery="" />
        </div>
      );

    case 'WAREHOUSE':
      return <WarehouseSurface theme={theme} spoons={spoons} />;

    default:
      return (
        <div className="p-4 border border-dashed border-red-900/40 text-red-400 font-mono text-xs uppercase tracking-widest rounded-lg">
          ERR_SURFACE_NOT_BOUND // {currentSurface}
        </div>
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      );
  }
}
