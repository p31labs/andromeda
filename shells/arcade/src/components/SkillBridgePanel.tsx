import React, { useMemo } from 'react';
import { SkillBridgeManager } from '@p31/unified';
import type { UnifiedPlayer, GameId } from '@p31/unified';

interface Props {
  player: UnifiedPlayer;
  bridgeManager: SkillBridgeManager;
}

const gameNames: Record<GameId, string> = {
  smallball: 'Smallball',
  gridiron: 'Gridiron',
  cards: 'Card Table',
  strategy: 'Strategy Board',
  'liquid-sculptor': 'Liquid Sculptor',
  'resonance-rings': 'Resonance Rings',
  'magnetic-poetry': 'Magnetic Poetry',
  'orbital-drift': 'Orbital Drift',
  'water-parksimulator': 'Water Park Simulator',
};

export const SkillBridgePanel: React.FC<Props> = ({ player, bridgeManager }) => {
  // Get all active bridges across all games
  const allBridges = useMemo(() => {
    const games: GameId[] = [
      'smallball', 'gridiron', 'cards', 'strategy',
      'liquid-sculptor', 'resonance-rings', 'magnetic-poetry', 'orbital-drift'
    ];

    return games.flatMap(gameId => {
      const active = bridgeManager.getActiveBridges(gameId);
      return active.map(bridge => ({
        ...bridge,
        targetGame: gameId,
      }));
    });
  }, [bridgeManager]);

  // Get top recommendations
  const recommendations = useMemo(() => {
    // Get the most played game to base recommendations on
    const gamesByXP = Object.entries(player.games)
      .sort(([, a], [, b]) => b.xp - a.xp);

    if (gamesByXP.length === 0) return [];

    const topGame = gamesByXP[0][0] as GameId;
    return bridgeManager.getRecommendations(topGame).slice(0, 3);
  }, [bridgeManager, player]);

  return (
    <div className="panel">
      <h3>🔗 Skill Bridges</h3>

      {recommendations.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Cross-game bonuses available:
          </p>
          {recommendations.map((rec, idx) => (
            <div key={idx} className="bridge-item">
              <div className="bridge-from">
                From {gameNames[rec.targetGame]}
              </div>
              <div className="bridge-to" style={{ fontSize: '0.875rem' }}>
                {rec.benefit}
              </div>
              <div className="bridge-boost">
                +{rec.boostAmount.toFixed(1)}% boost
              </div>
            </div>
          ))}
        </div>
      )}

      {allBridges.length > 0 ? (
        <div className="bridge-list">
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            {allBridges.length} active skill transfer{allBridges.length === 1 ? '' : 's'}
          </p>

          {allBridges.slice(0, 3).map((bridge, idx) => (
            <div key={idx} className="bridge-item" style={{ fontSize: '0.75rem' }}>
              <div className="bridge-from">
                {gameNames[bridge.from.gameId]} L{bridge.sourceLevel} → {gameNames[bridge.targetGame]}
              </div>
              <div className="bridge-boost" style={{ fontSize: '0.75rem' }}>
                +{bridge.boostAmount.toFixed(1)}% {bridge.to.boost}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Play more games to unlock skill bridges between them!
        </p>
      )}
    </div>
  );
};
