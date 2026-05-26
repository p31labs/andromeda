import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import SurvivalFacet from '../facets/SurvivalFacet';
import EditorialFacet from '../facets/EditorialFacet';
import TechFacet from '../facets/TechFacet';
import PolyhedronGlyph from './PolyhedronGlyph';
import SecurityBadge from './SecurityBadge';

type Facet = 'classic' | 'bridge' | 'quantum';

const facets: Record<Facet, React.ComponentType> = {
  classic: SurvivalFacet,
  bridge: EditorialFacet,
  quantum: TechFacet,
};

// Spoon state hook - reads from Zustand store
function useSpoonState() {
  const [spoons, setSpoons] = useState(6);
  useEffect(() => {
    // In production, this reads from Zustand store
    // For now, default to 6 spoons (high energy)
    const interval = setInterval(() => {
      // Poll spoon state from store
      try {
        const store = (window as any).__SPOON_STORE__;
        if (store?.getState) {
          setSpoons(store.getState().currentSpoons || 6);
        }
      } catch {
        // Keep default
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return spoons;
}

export default function FacetSwitchboard() {
  const [activeFacet, setActiveFacet] = useState<Facet>('classic');
  const currentSpoons = useSpoonState();

  // Auto-select facet based on spoon state (transducer logic)
  const facetFromSpoons = currentSpoons <= 1 ? 'classic' : currentSpoons <= 3 ? 'bridge' : 'quantum';
  
  // Determine if we should render heavy visuals
  const isHighEnergy = currentSpoons >= 6;
  const isStandard = currentSpoons >= 3 && currentSpoons < 6;
  const isSurvival = currentSpoons <= 1;

  const ActiveFacet = facets[activeFacet];

  // Determine canvas rendering mode based on spoon state
  const canvasFrameloop = isSurvival ? 'none' : isStandard ? 'demand' : 'always';

  const facetStyles: Record<Facet, string> = {
    classic: 'bg-gradient-to-br from-amber-50 to-orange-100',
    bridge: 'bg-zinc-50',
    quantum: 'bg-slate-950',
  };

  const facetLabels: Record<Facet, string> = {
    classic: 'The Classic',
    bridge: 'The Bridge',
    quantum: 'The Quantum',
  };

  return (
    <div className={`p-4 sm:p-8 min-h-screen font-sans ${facetStyles[activeFacet]}`} style={{ willChange: 'transform' }}>
      <div className="max-w-7xl mx-auto" style={{ willChange: 'transform' }}>
        <header className={`flex justify-between items-center p-4 rounded-t-lg border-b ${activeFacet === 'quantum' ? 'bg-slate-900 border-emerald-500/30' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <PolyhedronGlyph facet={activeFacet} className="w-10 h-10" />
            <h1 className={`text-2xl font-bold ${activeFacet === 'quantum' ? 'text-emerald-400' : 'text-slate-800'}`}>
              The DELTA
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <label htmlFor="facet-switcher" className={`text-sm font-medium ${activeFacet === 'quantum' ? 'text-emerald-400' : 'text-slate-600'}`}>
              Reality:
            </label>
            <select
              id="facet-switcher"
              value={activeFacet}
              onChange={(e) => setActiveFacet(e.target.value as Facet)}
              className={`p-2 border rounded-md focus:ring-2 focus:outline-none ${activeFacet === 'quantum' ? 'bg-slate-900 border-emerald-500/30 text-emerald-400 focus:ring-emerald-500' : 'border-slate-300 bg-white text-slate-800 focus:ring-blue-500'}`}
            >
              <option value="classic">{facetLabels.classic} (1-Spoon)</option>
              <option value="bridge">{facetLabels.bridge} (3-Spoons)</option>
              <option value="quantum">{facetLabels.quantum} (6-Spoons)</option>
            </select>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <ActiveFacet key={activeFacet} />
        </AnimatePresence>

        <footer className="mt-8 flex justify-center">
          <SecurityBadge />
        </footer>
      </div>
    </div>
  );
}