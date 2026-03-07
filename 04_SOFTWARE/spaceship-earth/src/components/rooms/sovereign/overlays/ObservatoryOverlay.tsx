// ObservatoryOverlay.tsx — DOM overlay for Observatory room inside Sovereign Shell
// Floats at z-10 over the 3D cockpit. Reads/writes observatoryStore.
// P31 Brand: #00FF88 green on void, Space Mono data font, glow borders.

import { useMemo } from 'react';
import { useObservatoryStore } from '../observatoryStore';
import {
  VERTICES, EDGES, AXIS_KEYS, AXIS_CSS, AXIS_LABELS, BUS_CSS,
  getDominantAxis, getConnections, getCountdownLabel,
  type AxisKey,
} from '../../observatory-data';

const STATE_FILTER_OPTS = ['countdown', 'active', 'deployed', 'complete', 'missing'] as const;
const BUS_FILTER_OPTS = ['vital', 'ac', 'dc'] as const;

// ── P31 Brand Style Constants ──
const GREEN = '#00FF88';
const DIM = 'rgba(0, 255, 136, 0.35)';
const GLASS = 'rgba(255, 255, 255, 0.04)';
const BORDER = 'rgba(0, 255, 136, 0.18)';
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

  const connections = useMemo(
    () => selectedNode ? getConnections(selectedNode.id) : [],
    [selectedNode],
  );

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', fontFamily: FONT }}>

      {/* Axis filters */}
      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 8, zIndex: 10, pointerEvents: 'auto' }}>
        {AXIS_KEYS.map(k => (
          <button key={k} onClick={() => setFilter(filter === k ? null : k)} style={{
            background: GLASS,
            backdropFilter: 'blur(12px)',
            border: '1px solid ' + (filter === k ? AXIS_CSS[k] : BORDER),
            color: AXIS_CSS[k], padding: '3px 10px', borderRadius: 3, fontSize: 10,
            fontFamily: FONT, cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase',
            boxShadow: filter === k ? `0 0 6px ${AXIS_CSS[k]}33` : 'none',
            textShadow: filter === k ? `0 0 6px ${AXIS_CSS[k]}66` : 'none',
          }}>
            {AXIS_LABELS[k]}
          </button>
        ))}
      </div>

      {/* Panel count */}
      <div style={{
        position: 'absolute', top: 12, right: 12, color: DIM, fontSize: 9,
        fontFamily: FONT, letterSpacing: 1, zIndex: 10,
      }}>
        {Object.keys(VERTICES).length} PANELS &middot; {EDGES.length} EDGES &middot; 80 FACES
      </div>

      {/* Search bar */}
      <div style={{ position: 'absolute', top: 42, left: 12, zIndex: 10, pointerEvents: 'auto' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="search nodes..."
          style={{
            background: GLASS, backdropFilter: 'blur(12px)',
            border: `1px solid ${BORDER}`,
            borderRadius: 3, padding: '4px 8px', color: GREEN, width: 200,
            fontSize: 10, fontFamily: FONT, outline: 'none', letterSpacing: 0.5,
            textShadow: `0 0 4px rgba(0, 255, 136, 0.25)`,
          }}
        />
      </div>

      {/* State + bus filters */}
      <div style={{
        position: 'absolute', top: 68, left: 12, display: 'flex', gap: 4,
        flexWrap: 'wrap', zIndex: 10, maxWidth: 320, pointerEvents: 'auto',
      }}>
        {STATE_FILTER_OPTS.map(s => {
          const active = stateFilters.has(s);
          const col = STATE_COLORS[s] ?? DIM;
          return (
            <button key={s} onClick={() => toggleStateFilter(s)} style={{
              background: GLASS, backdropFilter: 'blur(12px)',
              border: '1px solid ' + (active ? col : BORDER),
              color: col, padding: '2px 7px', borderRadius: 2, fontSize: 8,
              fontFamily: FONT, cursor: 'pointer', letterSpacing: 0.5,
              boxShadow: active ? `0 0 5px ${col}33` : 'none',
              textShadow: active ? `0 0 5px ${col}66` : 'none',
            }}>
              {s}
            </button>
          );
        })}
        <span style={{ width: 4 }} />
        {BUS_FILTER_OPTS.map(b => {
          const active = busFilters.has(b);
          const col = BUS_CSS[b] || DIM;
          return (
            <button key={b} onClick={() => toggleBusFilter(b)} style={{
              background: GLASS, backdropFilter: 'blur(12px)',
              border: '1px solid ' + (active ? col : BORDER),
              color: col, padding: '2px 7px', borderRadius: 2, fontSize: 8,
              fontFamily: FONT, cursor: 'pointer', letterSpacing: 0.5,
              boxShadow: active ? `0 0 5px ${col}33` : 'none',
              textShadow: active ? `0 0 5px ${col}66` : 'none',
            }}>
              {b}
            </button>
          );
        })}
      </div>

      {/* Selected node panel */}
      {selectedNode && (
        <div style={{
          position: 'absolute', bottom: 12, left: 12, right: 12, maxWidth: 420,
          background: GLASS, backdropFilter: 'blur(16px)',
          border: `1px solid ${BORDER}`, borderRadius: 6, padding: 14, zIndex: 20,
          pointerEvents: 'auto',
          boxShadow: `0 0 10px rgba(0, 255, 136, 0.05)`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: GREEN, fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textShadow: `0 0 4px rgba(0, 255, 136, 0.2)` }}>
              {selectedNode.label}
              {getCountdownLabel(selectedNode.id) && (
                <span style={{ color: '#ff6633', marginLeft: 8, fontSize: 11 }}>
                  {getCountdownLabel(selectedNode.id)}
                </span>
              )}
            </span>
            <button onClick={() => setSelected(null)} style={{
              background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontSize: 14, padding: '0 4px',
            }}>{'\u2715'}</button>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 10, color: DIM, marginBottom: 6 }}>
            <span style={{ color: AXIS_CSS[getDominantAxis(selectedNode.a, selectedNode.b, selectedNode.c, selectedNode.d)] }}>
              {AXIS_LABELS[getDominantAxis(selectedNode.a, selectedNode.b, selectedNode.c, selectedNode.d)]}
            </span>
            <span style={{
              color: STATE_COLORS[selectedNode.state] ?? DIM,
            }}>{selectedNode.state}</span>
            <span style={{ color: BUS_CSS[selectedNode.bus] || DIM }}>{selectedNode.bus}</span>
          </div>
          {selectedNode.notes && <div style={{ color: DIM, fontSize: 9, marginBottom: 6 }}>{selectedNode.notes}</div>}
          {connections.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {connections.map((c, i) => (
                <span key={i} onClick={() => {
                  const d = VERTICES[c.id];
                  if (d) setSelected({ id: c.id, label: d[0], a: d[1], b: d[2], c: d[3], d: d[4], state: d[5], bus: d[6], notes: d[7] });
                }} style={{
                  fontSize: 8, padding: '2px 8px', borderRadius: 2, cursor: 'pointer',
                  background: GLASS, backdropFilter: 'blur(12px)', border: `1px solid ${BORDER}`,
                  color: AXIS_CSS[c.axis], letterSpacing: 0.5,
                  transition: 'border-color 0.15s',
                }}>
                  {c.label} <span style={{ color: DIM, marginLeft: 2 }}>({c.type})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div style={{
        position: 'absolute', bottom: selectedNode ? 180 : 12, right: 12, color: DIM,
        fontSize: 8, textAlign: 'right', letterSpacing: 1, transition: 'bottom 0.3s',
        lineHeight: 1.8,
      }}>
        <div>DRAG ROTATE</div>
        <div>TAP PANEL</div>
        <div>SCROLL ZOOM</div>
      </div>
    </div>
  );
}
