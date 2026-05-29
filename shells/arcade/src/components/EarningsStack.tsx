/**
 * Earnings Stack - Four-Domain Centaur Economics Display
 * Shows CHUMP + Arcade combined funding
 */

import { useState, useEffect } from 'react';
import type { EarningsStack as EarningsStackType } from '../types/arcade';

interface EarningsStackProps {
  playerCredits: number;
  compact?: boolean;
}

export function EarningsStackDisplay({ playerCredits, compact = false }: EarningsStackProps) {
  const [earnings, setEarnings] = useState<EarningsStackType>({
    chumpMonthly: 450,
    arcadeMonthly: 30,
    combined: 480,
    availableCredits: playerCredits,
    lastPayout: 0,
  });

  // Refresh earnings data periodically
  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const response = await fetch('https://chump-edge.trimtab-signal.workers.dev/api/arcade/earnings');
        if (response.ok) {
          const data = await response.json();
          setEarnings(prev => ({
            ...prev,
            ...data,
            availableCredits: playerCredits,
          }));
        }
      } catch {
        // Use defaults on error
      }
    };

    fetchEarnings();
    const interval = setInterval(fetchEarnings, 60000); // Every minute
    return () => clearInterval(interval);
  }, [playerCredits]);

  if (compact) {
    return (
      <div className="earnings-stack-compact">
        <span className="credits-badge">
          💰 {earnings.availableCredits.toFixed(2)} credits
        </span>
        <span className="monthly-indicator">
          (${earnings.combined}/mo stack)
        </span>
      </div>
    );
  }

  return (
    <div className="earnings-stack">
      <div className="stack-header">
        <h3>💰 Monthly Family Gaming Fund</h3>
        <span className="stack-total">${earnings.combined}/month</span>
      </div>

      <div className="stack-breakdown">
        <div className="stack-item chump">
          <div className="stack-bar">
            <div
              className="stack-fill chump-fill"
              style={{ width: `${(earnings.chumpMonthly / earnings.combined) * 100}%` }}
            />
          </div>
          <div className="stack-details">
            <span className="stack-source">CHUMP Bandwidth</span>
            <span className="stack-amount">${earnings.chumpMonthly}</span>
          </div>
          <small className="stack-desc">
            Edge worker earnings • Infrastructure layer
          </small>
        </div>

        <div className="stack-item arcade">
          <div className="stack-bar">
            <div
              className="stack-fill arcade-fill"
              style={{ width: `${(earnings.arcadeMonthly / earnings.combined) * 100}%` }}
            />
          </div>
          <div className="stack-details">
            <span className="stack-source">Arcade Pool</span>
            <span className="stack-amount">${earnings.arcadeMonthly}</span>
          </div>
          <small className="stack-desc">
            Gaming rewards • Play-to-earn credits
          </small>
        </div>
      </div>

      <div className="credits-available">
        <div className="credits-display">
          <span className="credits-label">Your Available Credits</span>
          <span className="credits-amount">{earnings.availableCredits.toFixed(2)}</span>
        </div>
        <small className="credits-note">
          Credits = play time • Earn more by playing, spectating, or co-op
        </small>
      </div>

      <div className="stack-four-domain">
        <h4>Four-Domain Synthesis</h4>
        <div className="domain-badges">
          <span className="domain-badge industry">
            📊 Industry: $92B market knowledge
          </span>
          <span className="domain-badge arcade">
            🎮 Arcade: 8 games, S.J./W.J. safe
          </span>
          <span className="domain-badge chump">
            🔧 CHUMP: ${earnings.chumpMonthly}/mo infrastructure
          </span>
          <span className="domain-badge love">
            💚 Love: K4 mesh, care flows tracked
          </span>
        </div>
      </div>

      <div className="stack-policy">
        <small>
          <strong>SENTINEL Override Active:</strong> Zero ads for children. All funding
          from CHUMP bandwidth earnings. No external monetization.
        </small>
      </div>
    </div>
  );
}
