import React, { useState, useMemo } from 'react';
import { GAME_CATALOG, isGameAllowed } from '@p31/core';
import type { GameId, PlayerId } from '@p31/core';

interface Props {
  playerId: PlayerId;
  playerCredits: number;
  onLaunch: (gameId: GameId, mode: 'solo' | 'coop') => void;
}

export const GameLauncher: React.FC<Props> = ({ playerId, playerCredits, onLaunch }) => {
  const games = useMemo(
    () => Object.entries(GAME_CATALOG).filter(([id]) => isGameAllowed(id as GameId, playerId)),
    [playerId]
  );

  return (
    <div className="game-launcher">
      <div className="sentinel-banner">
        <span className="sentinel-shield">🛡️</span>
        <span>SENTINEL Active: {games.length} games available for {playerId.toUpperCase()}</span>
      </div>
      <div className="games-grid">
        {games.map(([gameId, config]) => (
          <div key={gameId} className="game-card">
            <div className="game-header">
              <span className="game-icon" style={{ color: config.color }}>{config.icon}</span>
              <span className="game-category">{config.category}</span>
            </div>
            <h4 className="game-name">{config.name}</h4>
            <p className="game-description">{config.description}</p>
            <div className="game-meta">
              <span>⏱️ {config.maxSessionMinutes}m</span>
              <span>💰 ${config.baseRate}/hr</span>
              {config.learningBonus > 1 && <span>🧠 {config.learningBonus}x</span>}
            </div>
            <div className="game-actions">
              <button onClick={() => onLaunch(gameId as GameId, 'solo')} className="launch-btn">
                Play Solo
              </button>
              {config.coopEnabled && (
                <button onClick={() => onLaunch(gameId as GameId, 'coop')} className="launch-btn coop">
                  👫 Co-op
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameLauncher;
