/**
 * PHOSRoot — Single React root that wraps all persistent UI islands
 * inside <AtmosphereProvider>.
 *
 * Solves the Astro React context gap: multiple `client:only` islands
 * cannot share React Context across Astro boundaries.
 * PHOSRoot renders everything inside ONE React tree so
 * useAtmosphere() works in every child component.
 *
 * This entire component uses `client:only="react"` and
 * `transition:persist` in PHOSLayout so it survives page navigations
 * without remounting.
 */
import React from 'react';
import '../styles/global.css';
import { AtmosphereProvider } from './AtmosphereProvider';
import StarfieldCanvas from './StarfieldCanvas';
import PHOSShell from './PHOSShell';
import PHOSGuide from './PHOSGuide';
import ErrorBoundary from './ErrorBoundary';
import type { SurfaceKey } from '../lib/atmosphere';

interface PHOSRootProps {
  initialSurface?: SurfaceKey;
}

const PHOSRoot: React.FC<PHOSRootProps> = ({ initialSurface = 'GREETING' }) => {
  return (
    <AtmosphereProvider initialSurface={initialSurface}>
      <StarfieldCanvas />
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        <ErrorBoundary>
          <PHOSShell>{null}</PHOSShell>
        </ErrorBoundary>
        <PHOSGuide />
      </div>
    </AtmosphereProvider>
  );
};

export default PHOSRoot;
