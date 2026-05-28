import React, { useState } from 'react';
import { Shield, Activity, Briefcase, Eye, Fingerprint } from 'lucide-react';
import { BiologicalAnchor } from '../components/BiologicalAnchor';
import { TheLedger } from '../components/TheLedger';
import { LoveLedger } from '../components/TheLoveLedger';
import { useHardenedPassport } from '../lib/PassportContext';
import type { ActivePanel, OrbState } from '../types/phos';

const ActivePanelType = {
  none: 'none',
  biological: 'biological',
  ledger: 'ledger',
  archive: 'archive',
  cogpass: 'cogpass',
} as const;

type ActivePanelNodeZero = (typeof ActivePanelType)[keyof typeof ActivePanelType];

export const NodeZeroSurface: React.FC<{ orbStatus: OrbState; spoonLevel: number }> = ({ orbStatus, spoonLevel }) => {
  const [activePanel, setActivePanel] = useState<ActivePanelNodeZero>('none');
  const isTriageMode = spoonLevel <= 1;
  const { state: passport, isHydrated, refresh } = useHardenedPassport();

  const togglePanel = (panel: ActivePanelNodeZero) => {
    setActivePanel(prev => prev === panel ? 'none' : panel);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-start bg-zinc-950 select-none">
      <header className="flex justify-between items-center py-4 mb-6 border-b border-zinc-900 font-mono text-xs text-zinc-500 tracking-widest">
        <div className="flex items-center gap-2">
          <Shield size={14} className={orbStatus === 'crisis' ? 'text-purple-500 animate-pulse' : 'text-zinc-600'} />
          <span>PHOS SYSTEM LAYER ALPHA</span>
        </div>
        <span>SPARKS: {spoonLevel}/5</span>
      </header>

      <div className="flex flex-col gap-4 w-full flex-grow pb-24">

        {/* PANEL 1: MEDICAL ANCHOR */}
        <div className="w-full border border-zinc-900 rounded-xl overflow-hidden">
          <button
            onClick={() => togglePanel('biological')}
            className="w-full flex items-center justify-between p-5 bg-zinc-900/20 font-mono text-sm tracking-wide text-zinc-400"
          >
            <span className="flex items-center gap-3"><Activity size={16} className="text-blue-500" /> ENDOCRINE TRACKS</span>
            <span className="text-xs text-zinc-600">{activePanel === 'biological' ? 'CLOSE' : 'OPEN'}</span>
          </button>
          {activePanel === 'biological' && (
            <div className="bg-zinc-950 border-t border-zinc-900">
              <BiologicalAnchor onLogTelemetry={(p) => console.log('Telemetry payload locked:', p)} />
            </div>
          )}
        </div>

        {/* PANEL 2: COMPENSABLE CORPORATE ENTITY */}
        <div className="w-full border border-zinc-900 rounded-xl overflow-hidden">
          <button
            onClick={() => togglePanel('ledger')}
            className="w-full flex items-center justify-between p-5 bg-zinc-900/20 font-mono text-sm tracking-wide text-zinc-400"
          >
            <span className="flex items-center gap-3"><Briefcase size={16} className="text-indigo-500" /> DEFERRED INVOICING CORE</span>
            <span className="text-xs text-zinc-600">{activePanel === 'ledger' ? 'CLOSE' : 'OPEN'}</span>
          </button>
          {activePanel === 'ledger' && (
            <div className="bg-zinc-950 border-t border-zinc-900 max-h-[40vh] overflow-y-auto">
              <TheLedger laborEvents={[]} dunaName="P31 Sanctuary DUNA" />
            </div>
          )}
        </div>

        {/* PANEL 3: EVIDENCE ARCHIVE */}
        <div className="w-full border border-zinc-900 rounded-xl overflow-hidden">
          <button
            onClick={() => togglePanel('archive')}
            className="w-full flex items-center justify-between p-5 bg-zinc-900/20 font-mono text-sm tracking-wide text-zinc-400"
          >
            <span className="flex items-center gap-3"><Eye size={16} className="text-amber-500" /> OMNI OBJECT ARCHIVE</span>
            <span className="text-xs text-zinc-600">{activePanel === 'archive' ? 'CLOSE' : 'OPEN'}</span>
          </button>
          {activePanel === 'archive' && (
            <div className="bg-zinc-950 border-t border-zinc-900 max-h-[40vh] overflow-y-auto">
              <LoveLedger artifacts={[]} />
            </div>
          )}
        </div>

        {/* PANEL 4: COGNITIVE PASSPORT */}
        <div className="w-full border border-zinc-900 rounded-xl overflow-hidden">
          <button
            onClick={() => { togglePanel('cogpass'); if (!isHydrated) refresh(); }}
            className="w-full flex items-center justify-between p-5 bg-zinc-900/20 font-mono text-sm tracking-wide text-zinc-400"
          >
            <span className="flex items-center gap-3"><Fingerprint size={16} className="text-purple-500" /> COGNITIVE PASSPORT</span>
            <span className="text-xs text-zinc-600">{activePanel === 'cogpass' ? 'CLOSE' : 'OPEN'}</span>
          </button>
          {activePanel === 'cogpass' && (
            <div className="bg-zinc-950 border-t border-zinc-900 p-4 space-y-3 font-mono text-xs">
              {/* Identity */}
              <div className="border border-zinc-800 rounded-lg p-3 space-y-2">
                <div className="text-zinc-500 text-[10px] tracking-widest uppercase">Identity</div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">NAME:</span>
                  <span className="text-zinc-300">{passport.identity.displayName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">ROLE:</span>
                  <span className={passport.identity.isOperator ? 'text-amber-400' : 'text-zinc-400'}>
                    {passport.identity.isOperator ? 'OPERATOR' : 'USER'}
                  </span>
                </div>
                {passport.identity.truncatedKeyId && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">KEY:</span>
                    <span className="text-purple-400">{passport.identity.truncatedKeyId}…</span>
                  </div>
                )}
              </div>

              {/* Visual State */}
              <div className="border border-zinc-800 rounded-lg p-3 space-y-2">
                <div className="text-zinc-500 text-[10px] tracking-widest uppercase">Visual State</div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">THEME:</span>
                  <span className="text-zinc-300">{passport.visuals.theme}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">MOTION:</span>
                  <span className="text-zinc-300">{passport.visuals.motion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">COMFORT:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${passport.visuals.screenComfort}%` }}
                      />
                    </div>
                    <span className="text-zinc-300">{passport.visuals.screenComfort}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">ANIMATIONS:</span>
                  <span className={passport.visuals.animationsEnabled ? 'text-emerald-400' : 'text-zinc-600'}>
                    {passport.visuals.animationsEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* Linguistic Profile */}
              <div className="border border-zinc-800 rounded-lg p-3 space-y-2">
                <div className="text-zinc-500 text-[10px] tracking-widest uppercase">Linguistic Profile</div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">TONE:</span>
                  <span className="text-zinc-300">{passport.linguistics.tone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">FORMAT:</span>
                  <span className="text-zinc-300">{passport.linguistics.formatPreference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">LENGTH:</span>
                  <span className="text-zinc-300">{passport.linguistics.responseLength}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">PATTERNS:</span>
                  <span className="text-zinc-300">{passport.linguistics.avoidPatterns.length} active</span>
                </div>
              </div>

              {/* AI Context */}
              <div className="border border-zinc-800 rounded-lg p-3 space-y-2">
                <div className="text-zinc-500 text-[10px] tracking-widest uppercase">AI Context</div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">FOCUS:</span>
                  <span className="text-zinc-300">{passport.context.currentFocus || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">DOMAIN:</span>
                  <span className="text-zinc-300">{passport.context.domain || '—'}</span>
                </div>
                {passport.context.toolsUsed.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {passport.context.toolsUsed.map((tool, i) => (
                      <span key={i} className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] rounded">
                        {tool}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Status footer */}
              <div className="text-[10px] text-zinc-600 text-center pt-1 border-t border-zinc-800/50">
                {isHydrated
                  ? (passport.identity.isOperator ? 'PASSPORT ACTIVE — OPERATOR' : 'PASSPORT ACTIVE — USER')
                  : 'NO PASSPORT LOADED — VISIT P31CA.ORG/PASSPORT TO GENERATE'
                }
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
