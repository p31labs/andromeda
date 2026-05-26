/**
 * Spoon Indicator — Warehouse AJ Variant (Canonical v2.0.0)
 * Inventory scanning modes for different energy levels
 * Aligned with p31-universal-canon.json
 */

import React from 'react';
import type { SpoonState } from '@p31/physics';

interface SpoonIndicatorProps {
  spoonState: SpoonState;
  onChange: (spoons: SpoonState) => void;
}

// ============================================
// CANONICAL SPOON COLORS (from p31-universal-canon.json)
// ============================================

const SPOON_COLORS = {
  high: '#5DCAA5',    // teal
  medium: '#cda852',  // amber
  low: '#cc6247',     // coral
} as const;

// Canonical Unicode indicators (no emoji)
const SPOON_ICON = '●';

export const SpoonIndicator: React.FC<SpoonIndicatorProps> = ({ spoonState, onChange }) => {
  const configs = {
    1: { 
      label: 'Single Scan', 
      desc: 'One item at a time. Voice confirms. Large buttons.',
      color: SPOON_COLORS.high,
      time: '~5m'
    },
    3: { 
      label: 'Batch Mode', 
      desc: 'Multi-select. Category shortcuts. List view.',
      color: SPOON_COLORS.medium,
      time: '~15m'
    },
    6: { 
      label: 'Full Warehouse', 
      desc: 'Grid view. Filters. Export. Full inventory control.',
      color: SPOON_COLORS.low,
      time: '~30m'
    },
  };

  const config = configs[spoonState];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Spoon Energy</span>
        <span style={{ ...styles.badge, background: config.color }}>
          <span style={styles.icon}>{SPOON_ICON}</span>
          <span style={styles.count}>{spoonState}</span>
        </span>
      </div>
      <div style={styles.info}>
        <div style={{ ...styles.label, color: config.color }}>{config.label}</div>
        <div style={styles.time}>{config.time}</div>
        <div style={styles.desc}>{config.desc}</div>
      </div>
      <div style={styles.controls}>
        {[1, 3, 6].map(n => (
          <button
            key={n}
            onClick={() => onChange(n as SpoonState)}
            style={{
              ...styles.button,
              ...(spoonState === n ? { 
                ...styles.active, 
                borderColor: configs[n as 1 | 3 | 6].color,
                background: `${configs[n as 1 | 3 | 6].color}40`,
              } : {}),
            }}
          >
            <span style={{
              ...styles.buttonIcon,
              color: spoonState === n ? configs[n as 1 | 3 | 6].color : 'var(--p31-muted, #6b7280)',
            }}>
              {SPOON_ICON}
            </span>
            <span style={styles.buttonLabel}>{n}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(22, 25, 32, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '16px',
    fontFamily: 'Atkinson Hyperlegible, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    color: '#d8d6d0',
    fontWeight: 600,
    fontSize: '14px',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 12px',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '14px',
    color: '#0f1115',
  },
  icon: {
    fontSize: '10px',
  },
  count: {
    fontSize: '14px',
  },
  info: {
    marginBottom: '12px',
  },
  label: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  time: {
    fontSize: '12px',
    fontFamily: 'JetBrains Mono, monospace',
    color: '#6b7280',
    marginBottom: '4px',
  },
  desc: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: 1.5,
  },
  controls: {
    display: 'flex',
    gap: '8px',
  },
  button: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '8px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    color: '#d8d6d0',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  buttonIcon: {
    fontSize: '14px',
  },
  buttonLabel: {
    fontSize: '12px',
    fontWeight: 600,
  },
  active: {
    background: 'rgba(93, 202, 165, 0.25)',
    borderColor: '#5DCAA5',
  },
};

export default SpoonIndicator;
