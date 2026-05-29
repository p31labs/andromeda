/**
 * CHUMP Glass Morphism Earnings Overlay
 * Four-Domain economics display with micro-animations
 */

import { useState, useEffect } from 'react';
import { P31Colors, P31Shadows } from '../design-tokens';

interface EarningsData {
  chumpMonthly: number;
  arcadeMonthly: number;
  combined: number;
  availableCredits: number;
  lastPayout: number;
}

interface GlassEarningsOverlayProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  compact?: boolean;
  onCreditEarned?: (amount: number) => void;
}

export function GlassEarningsOverlay({
  position = 'top-right',
  compact = false,
  onCreditEarned,
}: GlassEarningsOverlayProps) {
  const [earnings, setEarnings] = useState<EarningsData>({
    chumpMonthly: 450,
    arcadeMonthly: 30,
    combined: 480,
    availableCredits: 50,
    lastPayout: Date.now(),
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [creditFlash, setCreditFlash] = useState(0);
  const [recentEarn, setRecentEarn] = useState<number | null>(null);

  // Poll for earnings updates
  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const response = await fetch('https://chump-edge.trimtab-signal.workers.dev/api/arcade/earnings');
        if (response.ok) {
          const data = await response.json();
          
          // Check for credit increase
          if (data.availableCredits > earnings.availableCredits) {
            const increase = data.availableCredits - earnings.availableCredits;
            setCreditFlash(increase);
            setRecentEarn(increase);
            onCreditEarned?.(increase);
            
            // Clear flash after animation
            setTimeout(() => setCreditFlash(0), 1000);
            setTimeout(() => setRecentEarn(null), 3000);
          }
          
          setEarnings(prev => ({ ...prev, ...data }));
        }
      } catch {
        // Silent fail - use cached values
      }
    };

    fetchEarnings();
    const interval = setInterval(fetchEarnings, 30000); // Every 30s
    return () => clearInterval(interval);
  }, [earnings.availableCredits, onCreditEarned]);

  const positionStyles = {
    'top-right': { top: '1rem', right: '1rem' },
    'top-left': { top: '1rem', left: '1rem' },
    'bottom-right': { bottom: '1rem', right: '1rem' },
    'bottom-left': { bottom: '1rem', left: '1rem' },
  };

  if (compact && !isExpanded) {
    return (
      <div
        className="glass-earnings-compact"
        style={{
          position: 'fixed',
          ...positionStyles[position],
          background: 'rgba(22, 33, 62, 0.8)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '0.75rem 1rem',
          border: `1px solid ${P31Colors.border}`,
          boxShadow: P31Shadows.glass,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          zIndex: 1000,
        }}
        onClick={() => setIsExpanded(true)}
      >
        <span style={{ fontSize: '1.25rem' }}>💰</span>
        <div style={{ display: 'flex', flexDirection: 'column' } as React.CSSProperties}>
          <span
            className="credits-value"
            style={{
              fontWeight: 700,
              color: P31Colors.chumpGold,
              fontSize: '1rem',
              animation: creditFlash > 0 ? 'creditFlash 0.5s ease-out' : undefined,
            }}
          >
            {earnings.availableCredits.toFixed(2)}
          </span>
          <span style={{ fontSize: '0.65rem', color: P31Colors.textSecondary }}>
            credits
          </span>
        </div>
        {recentEarn && (
          <span
            className="earn-badge"
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: P31Colors.phosGreen,
              color: P31Colors.bgDark,
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              animation: 'earnPop 0.3s ease-out',
            }}
          >
            +{recentEarn.toFixed(1)}
          </span>
        )}
      </div>
    );
  }

  const chumpPercent = (earnings.chumpMonthly / earnings.combined) * 100;
  const arcadePercent = (earnings.arcadeMonthly / earnings.combined) * 100;

  return (
    <div
      className="glass-earnings-overlay"
      style={{
        position: 'fixed',
        ...positionStyles[position],
        background: 'rgba(22, 33, 62, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '1.5rem',
        border: `1px solid ${P31Colors.border}`,
        boxShadow: P31Shadows.glass,
        width: '320px',
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' } as React.CSSProperties}>
          <span style={{ fontSize: '1.5rem' }}>💰</span>
          <div>
            <h4
              style={{
                margin: 0,
                fontSize: '0.9rem',
                color: P31Colors.textPrimary,
              }}
            >
              Family Gaming Fund
            </h4>
            <span
              style={{
                fontSize: '0.75rem',
                color: P31Colors.chumpGold,
              }}
            >
              ${earnings.combined}/month
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          style={{
            background: 'none',
            border: 'none',
            color: P31Colors.textSecondary,
            cursor: 'pointer',
            fontSize: '1.25rem',
          }}
        >
          ×
        </button>
      </div>

      {/* Credit Display */}
      <div
        style={{
          background: `linear-gradient(135deg, ${P31Colors.chumpGold}20, ${P31Colors.chumpGold}10)`,
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1rem',
          border: `1px solid ${P31Colors.chumpGold}40`,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: P31Colors.textSecondary }}>
            Available Credits
          </span>
          <span
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: P31Colors.chumpGold,
              animation: creditFlash > 0 ? 'creditPulse 0.5s ease-out' : undefined,
            }}
          >
            {earnings.availableCredits.toFixed(2)}
          </span>
        </div>
        {recentEarn && (
          <div
            style={{
              marginTop: '0.5rem',
              fontSize: '0.8rem',
              color: P31Colors.phosGreen,
              animation: 'earnSlide 0.5s ease-out',
            }}
          >
            +{recentEarn.toFixed(2)} earned! 💚
          </div>
        )}
      </div>

      {/* Stack Breakdown */}
      <div style={{ marginBottom: '1rem' } as React.CSSProperties}>
        <h5
          style={{
            margin: '0 0 0.75rem 0',
            fontSize: '0.75rem',
            color: P31Colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Monthly Stack
        </h5>

        {/* CHUMP */}
        <div style={{ marginBottom: '0.75rem' } as React.CSSProperties}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              marginBottom: '0.25rem',
            }}
          >
            <span style={{ color: P31Colors.textSecondary }}>CHUMP Bandwidth</span>
            <span style={{ color: P31Colors.chumpGold, fontWeight: 600 }}>
              ${earnings.chumpMonthly}
            </span>
          </div>
          <div
            style={{
              height: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${chumpPercent}%`,
                background: P31Colors.chumpGold,
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span style={{ fontSize: '0.65rem', color: P31Colors.textSecondary }}>
            Edge worker infrastructure
          </span>
        </div>

        {/* Arcade */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              marginBottom: '0.25rem',
            }}
          >
            <span style={{ color: P31Colors.textSecondary }}>Arcade Pool</span>
            <span style={{ color: P31Colors.orchidSoul, fontWeight: 600 }}>
              ${earnings.arcadeMonthly}
            </span>
          </div>
          <div
            style={{
              height: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${arcadePercent}%`,
                background: P31Colors.orchidSoul,
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span style={{ fontSize: '0.65rem', color: P31Colors.textSecondary }}>
            Play-to-earn rewards
          </span>
        </div>
      </div>

      {/* Four-Domain Footer */}
      <div
        style={{
          borderTop: `1px solid ${P31Colors.border}`,
          paddingTop: '0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.65rem',
        }}
      >
        <span style={{ color: P31Colors.textSecondary }}>Four-Domain Synthesis</span>
        <span style={{ display: 'flex', gap: '0.25rem' } as React.CSSProperties}>
          <span title="Industry">📊</span>
          <span title="Arcade">🎮</span>
          <span title="CHUMP">🔧</span>
          <span title="Love">💚</span>
        </span>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes creditFlash {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); color: ${P31Colors.phosGreen}; }
        }
        
        @keyframes creditPulse {
          0% { text-shadow: 0 0 0 ${P31Colors.chumpGold}; }
          50% { text-shadow: 0 0 20px ${P31Colors.chumpGold}; }
          100% { text-shadow: 0 0 0 ${P31Colors.chumpGold}; }
        }
        
        @keyframes earnPop {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        
        @keyframes earnSlide {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default GlassEarningsOverlay;
