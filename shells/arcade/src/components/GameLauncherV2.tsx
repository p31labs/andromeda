/**
 * Game Launcher V2 - Four-Domain Centaur Architecture
 * SENTINEL guardrails + K4 mesh integration + CHUMP funding
 */

import { useState, useMemo } from 'react';
import type { GameId, PlayerId, GameCategory } from '../types/arcade';
import { GAME_CATALOG, ArcadeSDKv2 } from '../sdk/arcade-sdk-v2';

interface GameLauncherV2Props {
  playerId: PlayerId;
  playerCredits: number;
  onLaunch: (gameId: GameId, mode: 'solo' | 'coop') => void;
  onSpectateRequest: (gameId: GameId) => void;
  siblingPlaying?: GameId | null;
}

export function GameLauncherV2({
  playerId,
  playerCredits,
  onLaunch,
  onSpectateRequest,
  siblingPlaying,
}: GameLauncherV2Props) {
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | 'all'>('all');
  const [showSENTINEL, setShowSENTINEL] = useState(false);

  // Filter games by SENTINEL policy and category
  const availableGames = useMemo(() => {
    const games = Object.entries(GAME_CATALOG).filter(([gameId]) => {
      // SENTINEL: Check if game is allowed for this player
      return ArcadeSDKv2.isGameAllowed(gameId as GameId, playerId);
    });

    if (selectedCategory === 'all') return games;
    return games.filter(([, config]) => config.category === selectedCategory);
  }, [playerId, selectedCategory]);

  // Count blocked games (for S.J. awareness)
  const blockedGames = useMemo(() => {
    if (playerId === 'sj') {
      return Object.entries(GAME_CATALOG).filter(([gameId]) => {
        return !ArcadeSDKv2.isGameAllowed(gameId as GameId, 'wj');
      });
    }
    return [];
  }, [playerId]);

  const categories: { id: GameCategory | 'all'; label: string; icon: string }[] = [
    { id: 'all', label: 'All Games', icon: '🎮' },
    { id: 'sports', label: 'Sports', icon: '⚽' },
    { id: 'strategy', label: 'Strategy', icon: '♟️' },
    { id: 'physics', label: 'Physics', icon: '🔬' },
    { id: 'creative', label: 'Creative', icon: '🎨' },
  ];

  const canAfford = (gameId: GameId) => {
    return ArcadeSDKv2.canAffordSession(gameId, playerCredits);
  };

  return (
    <div className="game-launcher-v2">
      {/* SENTINEL Banner */}
      <div className="sentinel-banner">
        <span className="sentinel-shield">🛡️</span>
        <div className="sentinel-info">
          <strong>SENTINEL Active</strong>
          <span>Zero ads • Age-appropriate • Family-safe</span>
        </div>
        <button
          className="sentinel-toggle"
          onClick={() => setShowSENTINEL(!showSENTINEL)}
        >
          {showSENTINEL ? 'Hide' : 'Details'}
        </button>
      </div>

      {showSENTINEL && (
        <div className="sentinel-details">
          <h4>SENTINEL Guardrails for {playerId.toUpperCase()}</h4>
          <ul>
            <li>✅ Allowed: {availableGames.length} games curated for your age</li>
            {playerId === 'sj' && (
              <li>🔒 W.J. Protection: {blockedGames.length} complex games hidden from sibling</li>
            )}
            <li>⏱️ Session limits enforced per game</li>
            <li>🚫 Zero advertising or external monetization</li>
            <li>💚 All funding from CHUMP bandwidth earnings</li>
          </ul>
          <small>
            SENTINEL is absolute: No ads for children. Period.
          </small>
        </div>
      )}

      {/* Category Filter */}
      <div className="category-tabs">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span className="tab-icon">{cat.icon}</span>
            <span className="tab-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Game Grid */}
      <div className="games-grid">
        {availableGames.map(([gameId, config]) => {
          const isAffordable = canAfford(gameId as GameId);
          const isSiblingPlaying = siblingPlaying === gameId;
          const canCoop = config.coopEnabled && isSiblingPlaying;

          return (
            <div
              key={gameId}
              className={`game-card ${!isAffordable ? 'unaffordable' : ''} ${canCoop ? 'coop-available' : ''}`}
            >
              <div className="game-header">
                <span className="game-category">{config.category}</span>
                {canCoop && (
                  <span className="coop-badge">👫 Co-op Ready</span>
                )}
              </div>

              <h4 className="game-name">{config.name}</h4>
              <p className="game-description">{config.description}</p>

              <div className="game-meta">
                <div className="meta-item">
                  <span className="meta-icon">⏱️</span>
                  <span>{config.maxSessionMinutes}m max</span>
                </div>
                <div className="meta-item">
                  <span className="meta-icon">💰</span>
                  <span>{config.baseRate}/hr base</span>
                </div>
                {config.learningBonus > 1 && (
                  <div className="meta-item learning">
                    <span className="meta-icon">🧠</span>
                    <span>{config.learningBonus}x learning</span>
                  </div>
                )}
              </div>

              <div className="game-actions">
                <button
                  onClick={() => onLaunch(gameId as GameId, 'solo')}
                  disabled={!isAffordable}
                  className="launch-btn solo"
                >
                  {isAffordable ? 'Play Solo' : 'Need Credits'}
                </button>

                {canCoop ? (
                  <button
                    onClick={() => onLaunch(gameId as GameId, 'coop')}
                    disabled={!isAffordable}
                    className="launch-btn coop"
                  >
                    👫 Play Together (1.5x)
                  </button>
                ) : isSiblingPlaying ? (
                  <button
                    onClick={() => onSpectateRequest(gameId as GameId)}
                    className="launch-btn spectate"
                  >
                    👀 Spectate
                  </button>
                ) : null}
              </div>

              {!isAffordable && (
                <div className="affordability-note">
                  Play more or spectate to earn credits
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Four-Domain Footer */}
      <div className="launcher-footer">
        <div className="domain-indicators">
          <span className="indicator industry" title="Industry: $92B market knowledge">📊</span>
          <span className="indicator arcade" title="Arcade: 8 games, S.J./W.J. policies">🎮</span>
          <span className="indicator chump" title="CHUMP: $450/mo edge worker">🔧</span>
          <span className="indicator love" title="Love: K4 mesh, care flows">💚</span>
        </div>
        <small>
          Four-Domain Centaur Architecture • Hybrid Mode Active
        </small>
      </div>
    </div>
  );
}
