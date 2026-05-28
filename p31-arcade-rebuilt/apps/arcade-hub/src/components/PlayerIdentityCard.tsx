import React from 'react';
import type { PlayerId } from '@p31/core';

interface Props { playerId: PlayerId; }

export const PlayerIdentityCard: React.FC<Props> = ({ playerId }) => {
  return (
    <div className="player-identity-card">
      <div className="avatar">
        <div className="avatar-placeholder">{playerId.slice(0, 2).toUpperCase()}</div>
      </div>
      <h3>Player {playerId.toUpperCase()}</h3>
      <p className="text-muted">Cross-game identity active</p>
      <div className="stats-row">
        <span>Level 1</span>
        <span>0 XP</span>
      </div>
    </div>
  );
};

export default PlayerIdentityCard;
