import React from 'react';
import type { PlayerId } from '@p31/core';

interface Props { playerId: PlayerId; }

export const TaskBoard: React.FC<Props> = ({ playerId }) => {
  return (
    <div className="task-board">
      <h2>🏆 Bounties</h2>
      <p className="text-muted">Complete tasks to earn bonus credits and strengthen skill bridges.</p>
      <div className="bounties-grid">
        <div className="bounty-card">
          <span className="bounty-icon">⚾</span>
          <h4>Smallball Streak</h4>
          <p>Play 3 Smallball sessions this week</p>
          <span className="bounty-reward">+5 credits</span>
        </div>
        <div className="bounty-card">
          <span className="bounty-icon">🏈</span>
          <h4>Gridiron Rookie</h4>
          <p>Win your first Gridiron match</p>
          <span className="bounty-reward">+10 credits</span>
        </div>
        <div className="bounty-card">
          <span className="bounty-icon">👫</span>
          <h4>Co-op Champion</h4>
          <p>Complete a co-op session with sibling</p>
          <span className="bounty-reward">+15 credits +1 care flow</span>
        </div>
      </div>
    </div>
  );
};

export default TaskBoard;
