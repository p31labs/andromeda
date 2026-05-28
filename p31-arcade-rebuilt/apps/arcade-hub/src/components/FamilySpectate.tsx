import React from 'react';
import type { PlayerId } from '@p31/core';

interface Props {
  currentPlayer: PlayerId;
  siblingPlayer: PlayerId;
}

export const FamilySpectate: React.FC<Props> = ({ currentPlayer, siblingPlayer }) => {
  return (
    <div className="family-spectate">
      <h3>👀 Family Spectate</h3>
      <p className="spectate-subtitle">Watch your sibling play, both earn credits</p>
      <div className="sibling-status">
        <span className="status-dot offline"></span>
        <span>{siblingPlayer.toUpperCase()} is offline</span>
      </div>
      <div className="spectate-benefits">
        <h4>Why Spectate?</h4>
        <ul>
          <li>📺 You watch, you both earn credits</li>
          <li>💚 Sibling bond strengthens (+1 K4 edge)</li>
          <li>🛡️ SENTINEL: 100% ad-free, always safe</li>
        </ul>
      </div>
      <button className="start-spectate-btn" disabled>
        Waiting for sibling to play...
      </button>
    </div>
  );
};

export default FamilySpectate;
