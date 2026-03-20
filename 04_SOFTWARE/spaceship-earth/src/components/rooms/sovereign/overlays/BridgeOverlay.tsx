// BridgeOverlay — Full-screen LOVE economy dashboard overlay.

import { useState } from 'react';
import { BridgeRoom } from '../../BridgeRoom';
import { useSovereignStore } from '../../../../sovereign/useSovereignStore';
import { useShallow } from 'zustand/shallow';
import { ThemePanel } from '../../../ThemePanel';
import { LLMSettingsPanel } from '../../../LLMSettingsPanel';

function CollapseSection({
  label, children,
}: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = `collapse-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div style={{ borderTop: '1px solid var(--dim2)', background: 'var(--s1)', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls={id}
        style={{
          width: '100%', padding: '10px 24px', background: 'none', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          color: 'var(--dim)', fontSize: 10, letterSpacing: 2, cursor: 'pointer',
          fontFamily: 'var(--font-data)',
        }}
      >
        <span>{label}</span>
        <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>{open ? '▾' : '▸'}</span>
      </button>
      <div id={id} hidden={!open}>
        {open && children}
      </div>
    </div>
  );
}

export function BridgeOverlay() {
  const { love, spoons, maxSpoons, tier } = useSovereignStore(
    useShallow(s => ({ love: s.love, spoons: s.spoons, maxSpoons: s.maxSpoons, tier: s.tier })),
  );

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* LOVE dashboard */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <BridgeRoom love={love} spoons={spoons} maxSpoons={maxSpoons} tier={tier} />
      </div>

      {/* WCD-23: Theme section */}
      <CollapseSection label="THEME">
        <ThemePanel />
      </CollapseSection>

      {/* WCD-25: LLM settings section */}
      <CollapseSection label="LLM">
        <LLMSettingsPanel />
      </CollapseSection>
    </div>
  );
}
