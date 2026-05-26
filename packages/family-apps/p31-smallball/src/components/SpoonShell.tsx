// Spoon Theory UI Shell — Canonical v2.0.0
// Aligned with p31-universal-canon.json

import { useState, useEffect, ReactNode } from 'react';
import type { SpoonState, SpoonAllocation } from '../types';

// ============================================
// SPOON STATE CONTEXT
// ============================================

import { createContext, useContext } from 'react';

interface SpoonContextType {
  spoonState: SpoonState;
  setSpoonState: (state: SpoonState) => void;
  spoonsRemaining: number;
  useSpoons: (amount: number) => boolean;
  allocation: SpoonAllocation | null;
}

const SpoonContext = createContext<SpoonContextType>({
  spoonState: 6,
  setSpoonState: () => {},
  spoonsRemaining: 6,
  useSpoons: () => false,
  allocation: null,
});

export function SpoonProvider({ children }: { children: ReactNode }) {
  const [spoonState, setSpoonState] = useState<SpoonState>(6);
  const [allocation, setAllocation] = useState<SpoonAllocation | null>(null);
  const [spoonsRemaining, setSpoonsRemaining] = useState(6);

  // Load saved spoon allocation
  useEffect(() => {
    const saved = localStorage.getItem('p31-spoons');
    if (saved) {
      const parsed = JSON.parse(saved) as SpoonAllocation;
      const today = new Date().toISOString().split('T')[0];

      if (parsed.date === today) {
        setAllocation(parsed);
        setSpoonsRemaining(parsed.totalSpoons - parsed.usedSpoons);

        // Auto-set spoon state based on remaining
        if (parsed.totalSpoons - parsed.usedSpoons <= 1) {
          setSpoonState(1);
        } else if (parsed.totalSpoons - parsed.usedSpoons <= 3) {
          setSpoonState(3);
        }
      } else {
        // New day - reset allocation
        const newAllocation: SpoonAllocation = {
          franchiseId: parsed.franchiseId,
          date: today,
          totalSpoons: parsed.totalSpoons,
          usedSpoons: 0,
          recoveryRate: parsed.recoveryRate,
          manuallySet: false,
          crdtClock: 0n,
        };
        setAllocation(newAllocation);
        setSpoonsRemaining(parsed.totalSpoons);
        localStorage.setItem('p31-spoons', JSON.stringify(newAllocation));
      }
    }
  }, []);

  const useSpoons = (amount: number): boolean => {
    if (spoonsRemaining < amount) {
      return false;
    }

    const newRemaining = spoonsRemaining - amount;
    setSpoonsRemaining(newRemaining);

    if (allocation) {
      const updated = {
        ...allocation,
        usedSpoons: allocation.usedSpoons + amount,
      };
      setAllocation(updated);
      localStorage.setItem('p31-spoons', JSON.stringify(updated));
    }

    return true;
  };

  return (
    <SpoonContext.Provider value={{
      spoonState,
      setSpoonState,
      spoonsRemaining,
      useSpoons,
      allocation,
    }}>
      {children}
    </SpoonContext.Provider>
  );
}

export function useSpoons() {
  return useContext(SpoonContext);
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
const SPOON_ICONS = {
  loading: '◐',
  inactive: '○',
  active: '●',
} as const;

// ============================================
// SPOON SELECTOR (App Entry)
// ============================================

interface SpoonSelectorProps {
  onSelect: (state: SpoonState) => void;
}

export function SpoonSelector({ onSelect }: SpoonSelectorProps) {
  const [hovered, setHovered] = useState<SpoonState | null>(null);

  const options: Array<{ state: SpoonState; label: string; time: string; desc: string; color: string }> = [
    {
      state: 1,
      label: 'Low Energy',
      time: '5 min',
      desc: 'Passive management only. Single-tap actions. Large text.',
      color: SPOON_COLORS.high,
    },
    {
      state: 3,
      label: 'Moderate Energy',
      time: '15 min',
      desc: 'Interactive minigames. Rhythm mechanics. Moderate depth.',
      color: SPOON_COLORS.medium,
    },
    {
      state: 6,
      label: 'Full Energy',
      time: '30 min',
      desc: 'Full simulation depth. Tactical decisions. Complete control.',
      color: SPOON_COLORS.low,
    },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--p31-void, #0f1115)',
      color: 'var(--p31-cloud, #d8d6d0)',
      padding: '2rem',
      fontFamily: 'Atkinson Hyperlegible, sans-serif',
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: 300 }}>
        P31 Smallball
      </h1>
      <p style={{ fontSize: '1rem', opacity: 0.7, marginBottom: '3rem' }}>
        How many spoons do you have today?
      </p>

      <div style={{
        display: 'flex',
        gap: '2rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {options.map((option) => (
          <button
            key={option.state}
            onClick={() => onSelect(option.state)}
            onMouseEnter={() => setHovered(option.state)}
            onMouseLeave={() => setHovered(null)}
            style={{
              width: '280px',
              padding: '2rem',
              border: `2px solid ${hovered === option.state ? option.color : 'transparent'}`,
              borderRadius: '12px',
              background: hovered === option.state ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              textAlign: 'left',
              color: 'inherit',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}>
              {/* Canonical spoon indicators — Unicode, not emoji */}
              {Array.from({ length: option.state }).map((_, i) => (
                <span key={i} style={{
                  fontSize: '1.25rem',
                  color: option.color,
                }}>{SPOON_ICONS.active}</span>
              ))}
            </div>

            <h3 style={{
              fontSize: '1.5rem',
              margin: '0 0 0.5rem 0',
              color: option.color,
              fontWeight: 600,
            }}>
              {option.label}
            </h3>

            <p style={{
              fontSize: '0.875rem',
              opacity: 0.6,
              margin: '0 0 1rem 0',
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              {option.time} session
            </p>

            <p style={{
              fontSize: '0.875rem',
              opacity: 0.8,
              lineHeight: 1.5,
            }}>
              {option.desc}
            </p>
          </button>
        ))}
      </div>

      <p style={{
        marginTop: '3rem',
        fontSize: '0.75rem',
        opacity: 0.4,
        maxWidth: '400px',
        textAlign: 'center',
      }}>
        Based on Spoon Theory by Christine Miserandino.
        Choose the mode that matches your current cognitive capacity.
        You can always switch later.
      </p>
    </div>
  );
}

// ============================================
// SPOON-ADAPTIVE UI COMPONENTS
// ============================================

interface AdaptiveContainerProps {
  children: ReactNode;
  spoonState: SpoonState;
  style?: React.CSSProperties;
}

export function AdaptiveContainer({ children, spoonState, style }: AdaptiveContainerProps) {
  const getContainerStyles = (): React.CSSProperties => {
    switch (spoonState) {
      case 1:
        return {
          fontSize: '1.5rem',
          lineHeight: 1.6,
          maxWidth: '600px',
          margin: '0 auto',
          padding: '2rem',
        };
      case 3:
        return {
          fontSize: '1rem',
          lineHeight: 1.5,
          maxWidth: '900px',
          margin: '0 auto',
          padding: '1.5rem',
        };
      case 6:
      default:
        return {
          fontSize: '0.875rem',
          lineHeight: 1.4,
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '1rem',
        };
    }
  };

  return (
    <div style={{ ...getContainerStyles(), ...style }}>
      {children}
    </div>
  );
}

interface AdaptiveButtonProps {
  children: ReactNode;
  onClick: () => void;
  spoonState: SpoonState;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export function AdaptiveButton({
  children,
  onClick,
  spoonState,
  variant = 'primary',
  disabled = false,
}: AdaptiveButtonProps) {
  const getButtonStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      border: 'none',
      borderRadius: spoonState === 1 ? '16px' : spoonState === 3 ? '12px' : '8px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 0.15s ease',
      fontWeight: 600,
      fontFamily: 'Atkinson Hyperlegible, sans-serif',
    };

    const sizes = {
      1: { padding: '1.5rem 3rem', fontSize: '1.5rem' },
      3: { padding: '1rem 2rem', fontSize: '1.125rem' },
      6: { padding: '0.75rem 1.5rem', fontSize: '1rem' },
    };

    // Canonical colors (from p31-universal-canon.json)
    const colors = {
      primary: { background: '#4db8a8', color: '#0f1115' },  // cyan on void
      secondary: { background: '#1c2028', color: '#d8d6d0' },  // surface2 on cloud
      danger: { background: '#cc6247', color: '#d8d6d0' },  // coral on cloud
    };

    return {
      ...base,
      ...sizes[spoonState],
      ...colors[variant],
    };
  };

  return (
    <button onClick={onClick} disabled={disabled} style={getButtonStyles()}>
      {children}
    </button>
  );
}

interface AdaptiveCardProps {
  children: ReactNode;
  spoonState: SpoonState;
  title?: string;
  onClick?: () => void;
}

export function AdaptiveCard({ children, spoonState, title, onClick }: AdaptiveCardProps) {
  const styles: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: spoonState === 1 ? '24px' : spoonState === 3 ? '16px' : '12px',
    padding: spoonState === 1 ? '2rem' : spoonState === 3 ? '1.5rem' : '1rem',
    marginBottom: spoonState === 1 ? '1.5rem' : '1rem',
    cursor: onClick ? 'pointer' : 'default',
    border: '1px solid rgba(255,255,255,0.1)',
  };

  return (
    <div onClick={onClick} style={styles}>
      {title && (
        <h3 style={{
          margin: '0 0 1rem 0',
          fontSize: spoonState === 1 ? '1.75rem' : spoonState === 3 ? '1.25rem' : '1rem',
          fontWeight: 600,
        }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

// ============================================
// SPOON STATUS INDICATOR (Canonical)
// ============================================

export function SpoonStatus() {
  const { spoonsRemaining, spoonState, allocation } = useSpoons();
  const [showTooltip, setShowTooltip] = useState(false);

  if (!allocation) return null;

  // Canonical color logic
  const getColor = () => {
    const ratio = spoonsRemaining / allocation.totalSpoons;
    if (ratio > 0.5) return SPOON_COLORS.high;
    if (ratio > 0.25) return SPOON_COLORS.medium;
    return SPOON_COLORS.low;
  };

  const color = getColor();

  // Gray Rock overlay at 0 spoons
  if (spoonsRemaining <= 0) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 17, 21, 0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        fontFamily: 'Atkinson Hyperlegible, sans-serif',
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>◐</div>
        <h2 style={{ color: '#6b7280', marginBottom: '1rem' }}>Spoons Depleted</h2>
        <p style={{ color: '#6b7280', maxWidth: '400px', textAlign: 'center' }}>
          Gray Rock mode active. Rest recommended.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        background: 'rgba(22, 25, 32, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        color: '#d8d6d0',
        fontSize: '0.875rem',
        fontFamily: 'JetBrains Mono, monospace',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        zIndex: 1000,
        cursor: 'help',
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Canonical Unicode indicator */}
      <span style={{ color }}>{SPOON_ICONS.active}</span>
      <span style={{ fontWeight: 600, color }}>
        {spoonsRemaining}
      </span>
      <span style={{ opacity: 0.6 }}>
        /{allocation.totalSpoons}
      </span>

      {/* Tooltip with remaining time */}
      {showTooltip && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '0.5rem',
          background: 'rgba(22, 25, 32, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          fontSize: '0.75rem',
          minWidth: '150px',
          zIndex: 1001,
        }}>
          <div style={{ marginBottom: '0.25rem' }}>
            Mode: {spoonState === 1 ? 'Low Energy (5m)' : spoonState === 3 ? 'Moderate (15m)' : 'Full (30m)'}
          </div>
          <div style={{ opacity: 0.7 }}>
            ~{Math.round(spoonsRemaining * (spoonState === 1 ? 0.8 : spoonState === 3 ? 2.5 : 5))}m remaining
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// 5-MINUTE LOOP COMPONENTS
// ============================================

export function FiveMinuteDashboard() {
  const { spoonState } = useSpoons();

  return (
    <AdaptiveContainer spoonState={spoonState}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem', fontWeight: 600 }}>Quick Check</h1>

      <AdaptiveCard spoonState={spoonState} title="Overnight Results">
        <div style={{
          display: 'flex',
          gap: '1rem',
          flexDirection: spoonState === 1 ? 'column' : 'row',
        }}>
          <ResultBadge result="win" opponent="Dragons" score="5-3" />
          <ResultBadge result="loss" opponent="Hawks" score="2-4" />
          <ResultBadge result="win" opponent="Stars" score="7-1" />
        </div>
      </AdaptiveCard>

      <AdaptiveCard spoonState={spoonState} title="Today's Focus">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {['Power', 'Contact', 'Defense', 'Pitching'].map((focus) => (
            <AdaptiveButton
              key={focus}
              spoonState={spoonState}
              onClick={() => console.log(`Set focus: ${focus}`)}
            >
              {spoonState === 1 ? `Focus on ${focus}` : focus}
            </AdaptiveButton>
          ))}
        </div>
      </AdaptiveCard>
    </AdaptiveContainer>
  );
}

interface ResultBadgeProps {
  result: 'win' | 'loss';
  opponent: string;
  score: string;
}

function ResultBadge({ result, opponent, score }: ResultBadgeProps) {
  // Canonical colors
  const color = result === 'win' ? '#5DCAA5' : '#cc6247';  // teal or coral
  const symbol = result === 'win' ? '▲' : '▼';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      padding: '1rem',
      borderRadius: '8px',
      borderLeft: `4px solid ${color}`,
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
    }}>
      <span style={{ color, fontSize: '1.25rem', fontFamily: 'JetBrains Mono, monospace' }}>{symbol}</span>
      <div>
        <div style={{ fontWeight: 600 }}>{opponent}</div>
        <div style={{ opacity: 0.6, fontSize: '0.875rem', fontFamily: 'JetBrains Mono, monospace' }}>{score}</div>
      </div>
    </div>
  );
}
