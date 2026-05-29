import React, { useState, useEffect } from 'react';
import { GlobalSpoonManager } from '@p31/unified';
import type { UnifiedPlayer, GameId } from '@p31/unified';

interface Props {
  player: UnifiedPlayer;
  spoonManager: GlobalSpoonManager;
  onLaunch: (gameId: GameId) => void;
}

interface GameInfo {
  id: GameId;
  name: string;
  icon: string;
  category: string;
  color: string;
}

interface CreativeSpaceInfo {
  id: string;
  name: string;
  icon: string;
  category: string;
  color: string;
  url: string;
  description: string;
}

const GAMES: GameInfo[] = [
    { id: 'smallball', name: 'Smallball', icon: '⚾', category: 'Sports', color: '#22c55e' },
    { id: 'gridiron', name: 'Gridiron', icon: '🏈', category: 'Sports', color: '#a855f7' },
    { id: 'cards', name: 'Card Table', icon: '🃏', category: 'Cards', color: '#eab308' },
    { id: 'strategy', name: 'Strategy Board', icon: '♟️', category: 'Strategy', color: '#3b82f6' },
    { id: 'liquid-sculptor', name: 'Liquid Sculptor', icon: '💧', category: 'Physics', color: '#06b6d4' },
    { id: 'resonance-rings', name: 'Resonance Rings', icon: '🌊', category: 'Physics', color: '#ec4899' },
    { id: 'magnetic-poetry', name: 'Magnetic Poetry', icon: '🧲', category: 'Physics', color: '#f97316' },
    { id: 'orbital-drift', name: 'Orbital Drift', icon: '🪐', category: 'Physics', color: '#6366f1' },
    { id: 'water-parksimulator', name: 'Water Park Simulator', icon: '💦', category: 'Simulation', color: '#0ea5e9' },
];

const CREATIVE_SPACES: CreativeSpaceInfo[] = [
  {
    id: 'geodesic-builder',
    name: 'Geodesic Builder',
    icon: '🏗️',
    category: 'Creative',
    color: '#10b981',
    url: 'https://geodesic.p31ca.org',
    description: 'Collaborative 3D building space',
  },
];

export const GameLauncher: React.FC<Props> = ({ player, spoonManager, onLaunch }) => {
  const [affordable, setAffordable] = useState<Set<string>>(new Set());
  const [zenModes, setZenModes] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Get affordable modes
    const modes = spoonManager.getAffordableModes();
    const affordableSet = new Set(modes.map(m => m.gameId));
    const zenSet = new Set(modes.filter(m => m.spoonCost === 0).map(m => m.gameId));

    setAffordable(affordableSet);
    setZenModes(zenSet);
  }, [spoonManager]);

  const canLaunch = (gameId: GameId): boolean => {
    return affordable.has(gameId) || zenModes.has(gameId);
  };

  const getSpoonCost = (gameId: GameId): number => {
    // Check if any zen mode is available
    if (zenModes.has(gameId)) return 0;

    // Check minimum cost from affordable modes
    const modes = spoonManager.getAffordableModes().filter(m => m.gameId === gameId);
    if (modes.length === 0) return 99; // Can't afford

    return Math.min(...modes.map(m => m.spoonCost));
  };

   const getProgress = (gameId: GameId) => {
     // Safely access player.games[gameId] with fallback
     return player?.games?.[gameId] || { gamesPlayed: 0, wins: 0, losses: 0, level: 1 };
   };

  const openCreativeSpace = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <div className="game-grid">
        {GAMES.map(game => {
          const launchable = canLaunch(game.id);
          const cost = getSpoonCost(game.id);
          const progress = getProgress(game.id);
          const isZen = cost === 0;

          return (
            <div
              key={game.id}
              className={`game-card ${!launchable ? 'disabled' : ''}`}
              onClick={() => launchable && onLaunch(game.id)}
              style={{ '--game-color': game.color } as React.CSSProperties}
            >
              <span className="game-category" style={{ color: game.color }}>
                {game.category}
              </span>
              <div className="game-icon">{game.icon}</div>
              <div className="game-title">{game.name}</div>

              {progress.gamesPlayed > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Level {progress.level} • {progress.wins}W/{progress.losses}L
                </div>
              )}

              <span className={`game-spoon-cost ${isZen ? 'free' : ''}`}>
                {isZen ? '🆓 FREE' : `${cost} 🥄`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Creative Spaces Section */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          🎨 Creative Spaces (Separate Sessions)
        </h3>
        <div className="game-grid">
          {CREATIVE_SPACES.map(space => (
            <div
              key={space.id}
              className="game-card creative-card"
              onClick={() => openCreativeSpace(space.url)}
              style={{ '--game-color': space.color } as React.CSSProperties}
            >
              <span className="game-category" style={{ color: space.color }}>
                {space.category}
              </span>
              <div className="game-icon">{space.icon}</div>
              <div className="game-title">{space.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                {space.description}
              </div>
              <span className="game-spoon-cost free">🆓 ALWAYS FREE</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
