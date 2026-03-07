// ObservatoryOverlay.tsx — DOM overlay for Observatory room inside Sovereign Shell
// Floats at z-10 over the 3D cockpit. Reads/writes observatoryStore.
// P31 Brand: #00FFFF green on void, Space Mono data font, glow borders.

import { useState, useMemo } from 'react';
import { useObservatoryStore } from '../observatoryStore';
import {
  VERTICES, EDGES, AXIS_KEYS, AXIS_CSS, AXIS_LABELS, BUS_CSS,
  getDominantAxis, getConnections, getCountdownLabel,
  type AxisKey,
} from '../../observatory-data';

const STATE_FILTER_OPTS = ['countdown', 'active', 'deployed', 'complete', 'missing'] as const;
const BUS_FILTER_OPTS = ['vital', 'ac', 'dc'] as const;

// ── Neon Phosphor Style Constants ──
const GREEN = '#00FFFF';
const DIM = 'rgba(0, 255, 255, 0.35)';
const GLASS = 'rgba(0, 0, 0, 0.45)';
const PANEL_BG = 'rgba(0, 0, 0, 0.85)';
const BORDER = 'rgba(0, 255, 255, 0.2)';
const FONT = "'Space Mono', monospace";

const STATE_COLORS: Record<string, string> = {
  countdown: '#ff6633',
  active: GREEN,
  deployed: '#44ffaa',
  complete: GREEN,
  missing: '#ff3333',
};

export function ObservatoryOverlay() {
  const {
    selectedNode, filter, searchQuery, stateFilters, busFilters,
    setSelected, setFilter, setSearchQuery, toggleStateFilter, toggleBusFilter,
  } = useObservatoryStore();

  const [filtersOpen, setFiltersOpen] = useState(false);

  const connections = useMemo(
    () => selectedNode ? getConnections(selectedNode.id) : [],
    [selectedNode],
  );

  // Count active filters for badge
  const activeFilterCount = (filter ? 1 : 0) + stateFilters.size + busFilters.size + (searchQuery ? 1 : 0);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', fontFamily: FONT }}>

      {/* Filter toggle button */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, pointerEvents: 'auto' }}>
        <button
          type="button"
          onClick={() => setFiltersOpen(o => !o)}
          aria-expanded={filtersOpen}
          aria-label="Toggle observatory filters"
          style={{
            background: filtersOpen ? 'rgba(0,255,255,0.08)' : GLASS,
            backdropFilter: 'blur(12px)',
            border: `1px solid ${filtersOpen ? GREEN : BORDER}`,
            color: GREEN, padding: '12px 18px', borderRadius: 8, fontSize: 14,
            fontFamily: FONT, cursor: 'pointer', letterSpacing: 1.5,
            textShadow: `0 0 8px rgba(0,255,255,0.5)`,
            boxShadow: filtersOpen ? `0 0 12px rgba(0,255,255,0.15)` : 'none',
            minHeight: '48px',
            minWidth: '48px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>{filtersOpen ? '\u25B2' : '\u25BC'}</span>
          <span>FILTERS</span>
          {activeFilterCount > 0 && (
            <span style={{
              background: GREEN, color: '#000', fontSize: 11, fontWeight: 700,
              borderRadius: '50%', width: 22, height: 22,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              textShadow: 'none',
            }}>
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Dropdown panel */}
        {filtersOpen && (
          <div style={{
            marginTop: 8, padding: 16, borderRadius: 10,
            background: PANEL_BG, backdropFilter: 'blur(20px)',
            border: `1px solid ${BORDER}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 12px rgba(0,255,255,0.06)',
            display: 'flex', flexDirection: 'column', gap: 14,
            minWidth: 280, maxWidth: 400,
            animation: 'fadeInUp 0.15s ease-out',
          }}>
            {/* Axis filters */}
            <div>
              <div style={{ fontSize: 11, color: DIM, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }}>AXIS</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {AXIS_KEYS.map(k => (
                  <button key={k} onClick={() => setFilter(filter === k ? null : k)} aria-pressed={filter === k ? 'true' : 'false'} style={{
                    background: filter === k ? `${AXIS_CSS[k]}18` : 'rgba(0,0,0,0.4)',
                    border: '1px solid ' + (filter === k ? AXIS_CSS[k] : BORDER),
                    color: AXIS_CSS[k], padding: '10px 16px', borderRadius: 6, fontSize: 14,
                    fontFamily: FONT, cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase',
                    boxShadow: filter === k ? `0 0 8px ${AXIS_CSS[k]}33` : 'none',
                    textShadow: `0 0 6px ${AXIS_CSS[k]}${filter === k ? '66' : '33'}`,
                    minHeight: '44px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {AXIS_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div>
              <div style={{ fontSize: 11, color: DIM, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }}>SEARCH</div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="search nodes..."
                aria-label="Search observatory nodes"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 6, padding: '10px 14px', color: GREEN, width: '100%',
                  fontSize: 14, fontFamily: FONT, outline: 'none', letterSpacing: 0.5,
                  textShadow: `0 0 6px rgba(0, 255, 255, 0.3)`,
                  minHeight: '44px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* State filters */}
            <div>
              <div style={{ fontSize: 11, color: DIM, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }}>STATE</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STATE_FILTER_OPTS.map(s => {
                  const active = stateFilters.has(s);
                  const col = STATE_COLORS[s] ?? DIM;
                  return (
                    <button key={s} onClick={() => toggleStateFilter(s)} aria-pressed={active ? 'true' : 'false'} style={{
                      background: active ? `${col}18` : 'rgba(0,0,0,0.4)',
                      border: '1px solid ' + (active ? col : BORDER),
                      color: col, padding: '8px 14px', borderRadius: 6, fontSize: 12,
                      fontFamily: FONT, cursor: 'pointer', letterSpacing: 0.5,
                      boxShadow: active ? `0 0 8px ${col}33` : 'none',
                      textShadow: `0 0 4px ${col}${active ? '66' : '22'}`,
                      minHeight: '40px',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bus filters */}
            <div>
              <div style={{ fontSize: 11, color: DIM, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }}>BUS</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {BUS_FILTER_OPTS.map(b => {
                  const active = busFilters.has(b);
                  const col = BUS_CSS[b] || DIM;
                  return (
                    <button key={b} onClick={() => toggleBusFilter(b)} aria-pressed={active ? 'true' : 'false'} style={{
                      background: active ? `${col}18` : 'rgba(0,0,0,0.4)',
                      border: '1px solid ' + (active ? col : BORDER),
                      color: col, padding: '8px 14px', borderRadius: 6, fontSize: 12,
                      fontFamily: FONT, cursor: 'pointer', letterSpacing: 0.5,
                      boxShadow: active ? `0 0 8px ${col}33` : 'none',
                      textShadow: `0 0 4px ${col}${active ? '66' : '22'}`,
                      minHeight: '40px',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}>
                      {b}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Panel count */}
      <div style={{
        position: 'absolute', top: 12, right: 12, color: DIM, fontSize: 12,
        fontFamily: FONT, letterSpacing: 1, zIndex: 10,
        textShadow: '0 0 4px rgba(0,255,255,0.2)',
      }}>
        {Object.keys(VERTICES).length} PANELS &middot; {EDGES.length} EDGES &middot; 80 FACES
      </div>

      {/* Selected node panel */}
      {selectedNode && (
        <div style={{
          position: 'absolute', bottom: 12, left: 12, right: 12, maxWidth: 460,
          background: PANEL_BG, backdropFilter: 'blur(16px)',
          border: `1px solid ${BORDER}`, borderRadius: 10, padding: 18, zIndex: 20,
          pointerEvents: 'auto',
          boxShadow: `0 0 16px rgba(0, 255, 255, 0.06)`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: GREEN, fontSize: 16, fontWeight: 700, letterSpacing: 0.5, textShadow: `0 0 8px rgba(0, 255, 255, 0.4)` }}>
              {selectedNode.label}
              {getCountdownLabel(selectedNode.id) && (
                <span style={{ color: '#ff6633', marginLeft: 8, fontSize: 13, textShadow: '0 0 6px rgba(255,102,51,0.3)' }}>
                  {getCountdownLabel(selectedNode.id)}
                </span>
              )}
            </span>
            <button onClick={() => setSelected(null)} aria-label="Close node details" style={{
              background: 'none', border: 'none', color: GREEN, cursor: 'pointer', fontSize: 20, padding: '8px',
              minWidth: '48px', minHeight: '48px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              textShadow: '0 0 6px rgba(0,255,255,0.4)',
            }}>{'\u2715'}</button>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 13, color: DIM, marginBottom: 8 }}>
            <span style={{ color: AXIS_CSS[getDominantAxis(selectedNode.a, selectedNode.b, selectedNode.c, selectedNode.d)], textShadow: `0 0 6px ${AXIS_CSS[getDominantAxis(selectedNode.a, selectedNode.b, selectedNode.c, selectedNode.d)]}44` }}>
              {AXIS_LABELS[getDominantAxis(selectedNode.a, selectedNode.b, selectedNode.c, selectedNode.d)]}
            </span>
            <span style={{
              color: STATE_COLORS[selectedNode.state] ?? DIM,
              textShadow: `0 0 6px ${(STATE_COLORS[selectedNode.state] ?? DIM)}44`,
            }}>{selectedNode.state}</span>
            <span style={{ color: BUS_CSS[selectedNode.bus] || DIM }}>{selectedNode.bus}</span>
          </div>
          {selectedNode.notes && <div style={{ color: 'rgba(0,255,255,0.45)', fontSize: 12, marginBottom: 8, lineHeight: 1.5 }}>{selectedNode.notes}</div>}
          {connections.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {connections.map((c, i) => (
                <span key={i} onClick={() => {
                  const d = VERTICES[c.id];
                  if (d) setSelected({ id: c.id, label: d[0], a: d[1], b: d[2], c: d[3], d: d[4], state: d[5], bus: d[6], notes: d[7] });
                }} style={{
                  fontSize: 12, padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                  background: GLASS, backdropFilter: 'blur(12px)', border: `1px solid ${BORDER}`,
                  color: AXIS_CSS[c.axis], letterSpacing: 0.5,
                  transition: 'border-color 0.15s',
                  minHeight: '40px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  textShadow: `0 0 4px ${AXIS_CSS[c.axis]}44`,
                }}>
                  {c.label} <span style={{ color: DIM, marginLeft: 4 }}>({c.type})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div style={{
        position: 'absolute', bottom: selectedNode ? 200 : 12, right: 12, color: 'rgba(0,255,255,0.4)',
        fontSize: 12, textAlign: 'right', letterSpacing: 1.5, transition: 'bottom 0.3s',
        lineHeight: 2, textShadow: '0 0 4px rgba(0,255,255,0.2)',
      }}>
        <div>DRAG ROTATE</div>
        <div>TAP PANEL</div>
        <div>SCROLL ZOOM</div>
      </div>
    </div>
  );
}
