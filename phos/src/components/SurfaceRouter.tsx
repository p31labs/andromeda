import React from 'react';
import { useAtmosphere } from './AtmosphereProvider';
import { ConstellationSurface } from '../surfaces/ConstellationSurface';
import { LedgerSurface } from '../surfaces/LedgerSurface';
import { ForgeSurface } from '../surfaces/ForgeSurface';

const SURFACE_COMPONENTS: Record<string, React.FC<{ className?: string }>> = {
  CONSTELLATION: ConstellationSurface,
  LEDGER: LedgerSurface,
  FORGE: ForgeSurface,
};

export const SurfaceRouter: React.FC = () => {
  const { currentSurface } = useAtmosphere();
  const SurfaceComponent = SURFACE_COMPONENTS[currentSurface];

  if (SurfaceComponent) {
    return <SurfaceComponent />;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20">
      <span className="font-mono text-xs text-zinc-600 tracking-widest uppercase mb-4">
        {currentSurface.replace(/_/g, ' ')}
      </span>
      <p className="font-mono text-xs text-zinc-700">
        Surface loaded. Use PHOS Guide to navigate.
      </p>
    </div>
  );
};

export default SurfaceRouter;
