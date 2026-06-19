import { useState, useEffect } from 'react';
import type { EquilibriumState } from '../hooks/useEquilibrium';

export interface EquilibriumAdminProps {
  adminOpen: boolean;
  equilibrium: EquilibriumState | null;
}

export function EquilibriumAdmin({ adminOpen, equilibrium }: EquilibriumAdminProps) {
  const [calcium, setCalcium] = useState(equilibrium?.calcium ?? 8.2);
  const [spoons, setSpoons] = useState(equilibrium?.spoon ?? 4);
  const [forceServer, setForceServer] = useState(true);

  useEffect(() => {
    if (equilibrium) {
      setCalcium(equilibrium.calcium);
      setSpoons(equilibrium.spoon);
    }
  }, [adminOpen, equilibrium?.calcium, equilibrium?.spoon]);

  const applyPhaseShift = () => {
    localStorage.setItem('p31_medical_override', JSON.stringify({ serum_calcium_mg_dL: calcium }));
    localStorage.setItem('p31_spoon_override', JSON.stringify({ level: spoons }));
    window.dispatchEvent(new Event('equilibrium_override'));
  };

  const handleForceServerChange = (checked: boolean) => {
    setForceServer(checked);
    localStorage.setItem('p31_force_server_stage', checked ? 'true' : 'false');
    window.dispatchEvent(new Event('equilibrium_override'));
  };

  const handleReset = () => {
    localStorage.removeItem('p31_medical_override');
    localStorage.removeItem('p31_spoon_override');
    localStorage.removeItem('p31_equilibrium_override');
    window.dispatchEvent(new Event('equilibrium_override'));
  };

  if (!adminOpen) return null;

  const stage = equilibrium?.stage ?? 'SAPLING';
  const entropy = equilibrium?.entropy ?? 0;

  return (
    <div style={{
      position: 'absolute',
      right: '1rem',
      top: '4rem',
      zIndex: 50,
      width: '300px',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.15)',
      background: 'rgba(15,15,25,0.95)',
      padding: '1rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      fontFamily: 'monospace'
    }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
        Equilibrium Admin
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.4)', marginBottom: '0.2rem' }}>Current Stage</div>
        <div style={{ fontSize: '1.75rem', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--color-phosphor)', letterSpacing: '0.04em' }}>
          {stage}
        </div>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.2rem' }}>
          <span>Biological Spoons</span>
          <span style={{ color: '#fff' }}>{spoons} / 5</span>
        </label>
        <input type="range" min="0" max="5" step="1" value={spoons} onChange={(e) => setSpoons(parseInt(e.target.value, 10))} style={{ width: '100%', accentColor: '#06b6d4' }} />
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.2rem' }}>
          <span>Serum Calcium</span>
          <span style={{ color: calcium <= 7.8 ? '#f97316' : '#fff' }}>{calcium.toFixed(1)} mg/dL</span>
        </label>
        <input type="range" min="7.0" max="9.5" step="0.1" value={calcium} onChange={(e) => setCalcium(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#06b6d4' }} />
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input type="checkbox" id="forceServer" checked={forceServer} onChange={(e) => handleForceServerChange(e.target.checked)} style={{ accentColor: '#06b6d4' }} />
        <label htmlFor="forceServer" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>Force Server Stage</label>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <button onClick={applyPhaseShift} style={{ flex: 1, borderRadius: '6px', border: '1px solid rgba(6,182,212,0.4)', background: 'rgba(6,182,212,0.1)', padding: '0.4rem', fontSize: '0.65rem', fontWeight: 'bold', color: '#06b6d4', cursor: 'pointer' }}>Phase Shift</button>
        <button onClick={handleReset} style={{ flex: 1, borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', fontSize: '0.65rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>Reset</button>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
        <div>Entropy: {entropy}x</div>
      </div>
    </div>
  );
}
