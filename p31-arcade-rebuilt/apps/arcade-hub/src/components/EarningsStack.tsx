import React from 'react';

interface Props {
  playerCredits: number;
  compact?: boolean;
}

export const EarningsStack: React.FC<Props> = ({ playerCredits, compact }) => {
  if (compact) {
    return (
      <div className="earnings-stack-compact">
        <span className="credits-badge">💰 {playerCredits.toFixed(2)} credits</span>
        <span className="monthly-indicator">($480/mo stack)</span>
      </div>
    );
  }
  return (
    <div className="earnings-stack">
      <h3>💰 Monthly Family Gaming Fund</h3>
      <div className="stack-breakdown">
        <div className="stack-item">
          <label>CHUMP Bandwidth</label>
          <div className="stack-bar"><div className="stack-fill" style={{ width: '93.75%' }} /></div>
          <span>$450/mo</span>
        </div>
        <div className="stack-item">
          <label>Arcade Pool</label>
          <div className="stack-bar"><div className="stack-fill arcade" style={{ width: '6.25%' }} /></div>
          <span>$30/mo</span>
        </div>
      </div>
      <div className="credits-display">
        <strong>Available: {playerCredits.toFixed(2)} credits</strong>
      </div>
    </div>
  );
};

export default EarningsStack;
