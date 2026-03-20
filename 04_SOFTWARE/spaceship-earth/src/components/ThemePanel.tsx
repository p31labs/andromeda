/**
 * @file ThemePanel — Skin switcher + dynamic accent color picker.
 *
 * Mounted inside BridgeOverlay. Shows 4 preset skins as swatches and a
 * native color picker for real-time accent overrides. All changes persist
 * to localStorage via useSovereignStore.setAccentColor / setSkinTheme.
 *
 * Three.js sync: accentColor in the store is read by ImmersiveCockpit's
 * RAF loop each frame and applied to Jitterbug node/edge colors.
 */

import { useShallow } from 'zustand/shallow';
import { useSovereignStore } from '../sovereign/useSovereignStore';
import type { SkinTheme } from '../sovereign/types';

interface SkinDef {
  id: SkinTheme;
  label: string;
  accent: string;
  desc: string;
}

const SKINS: SkinDef[] = [
  { id: 'OPERATOR', label: 'Operator',  accent: '#00FFFF', desc: 'Neon cyan — default' },
  { id: 'AURORA',   label: 'Aurora',    accent: '#00FF88', desc: 'Phosphor green' },
  { id: 'KIDS',     label: 'Solar',     accent: '#FFD700', desc: 'Warm amber tones' },
  { id: 'GRAY_ROCK', label: 'Gray Rock', accent: '#888888', desc: 'Low-stimulation mono' },
];

export function ThemePanel() {
  const { skinTheme, setSkinTheme, accentColor, setAccentColor } = useSovereignStore(
    useShallow(s => ({
      skinTheme:       s.skinTheme,
      setSkinTheme:    s.setSkinTheme,
      accentColor:     s.accentColor,
      setAccentColor:  s.setAccentColor,
    })),
  );

  const defaultAccent = SKINS.find(s => s.id === skinTheme)?.accent ?? '#00FFFF';

  return (
    <div style={{ padding: '20px 24px', fontFamily: 'var(--font-data)', color: 'var(--text)' }}>
      {/* ── Skin presets ── */}
      <div style={{ fontSize: 10, opacity: 0.45, letterSpacing: 2, marginBottom: 12 }}>
        SKIN PROFILE
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
        {SKINS.map(skin => {
          const active = skinTheme === skin.id;
          return (
            <button
              key={skin.id}
              type="button"
              onClick={() => setSkinTheme(skin.id)}
              aria-pressed={active}
              style={{
                background: active ? `color-mix(in srgb, ${skin.accent} 10%, transparent)` : 'var(--s2)',
                border: `1px solid ${active ? skin.accent : 'var(--dim2)'}`,
                borderRadius: 8,
                padding: '10px 12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color var(--trans-base), background var(--trans-base)',
              }}
            >
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: skin.accent,
                boxShadow: `0 0 6px ${skin.accent}`,
                marginBottom: 6,
              }} />
              <div style={{ color: active ? skin.accent : 'var(--text)', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                {skin.label}
              </div>
              <div style={{ color: 'var(--dim)', fontSize: 9 }}>{skin.desc}</div>
            </button>
          );
        })}
      </div>

      {/* ── Dynamic accent ── */}
      <div style={{ fontSize: 10, opacity: 0.45, letterSpacing: 2, marginBottom: 12 }}>
        ACCENT COLOR
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          type="color"
          value={accentColor}
          onChange={e => setAccentColor(e.target.value)}
          aria-label="Primary accent color"
          style={{
            width: 44, height: 44, border: '1px solid var(--dim2)',
            borderRadius: 8, cursor: 'pointer', background: 'none', padding: 2,
          }}
        />
        <div>
          <div style={{ color: 'var(--neon)', fontSize: 13, letterSpacing: 1 }}>
            {accentColor.toUpperCase()}
          </div>
          <div style={{ color: 'var(--dim)', fontSize: 9, marginTop: 2 }}>
            Updates live · applied to UI + 3D materials
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAccentColor(defaultAccent)}
          aria-label="Reset accent to skin default"
          style={{
            marginLeft: 'auto', background: 'none',
            border: '1px solid var(--dim2)', borderRadius: 4,
            color: 'var(--dim)', fontSize: 10, padding: '5px 10px', cursor: 'pointer',
          }}
        >
          reset
        </button>
      </div>
    </div>
  );
}
