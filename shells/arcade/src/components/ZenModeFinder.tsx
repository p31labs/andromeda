import React from 'react';
import { GlobalSpoonManager } from '@p31/unified';
import type { GameId } from '@p31/unified';

interface Props {
  spoonManager: GlobalSpoonManager;
  onLaunch: (gameId: GameId) => void;
}

export const ZenModeFinder: React.FC<Props> = ({ spoonManager, onLaunch }) => {
  const zenModes = spoonManager.getZenModes();
  const isDeficit = spoonManager.isSpoonDeficit();

  const gameNames: Record<string, string> = {
    'liquid-sculptor': 'Liquid Sculptor',
    'resonance-rings': 'Resonance Rings',
    'magnetic-poetry': 'Magnetic Poetry',
    'orbital-drift': 'Orbital Drift',
  };

  return (
    <div className="panel">
      <h3>
        {isDeficit ? '🔴 Spoon Deficit Mode' : '🧘 Zero-Spoon Zen Modes'}
      </h3>

      {isDeficit ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          You're running low on energy. These modes are completely free and relaxing:
        </p>
      ) : (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Creative, meditative experiences. No spoons needed, ever.
        </p>
      )}

      <div className="zen-modes">
        {zenModes.map(mode => (
          <div
            key={`${mode.gameId}-${mode.mode}`}
            className="zen-mode-item"
            onClick={() => onLaunch(mode.gameId)}
          >
            <div>
              <div style={{ fontWeight: 500 }}>{gameNames[mode.gameId]}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {mode.description}
              </div>
            </div>
            <span className="zen-badge">FREE</span>
          </div>
        ))}

        {zenModes.length === 0 && (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            No zen modes currently available. Check back later or wait for spoon recovery.
          </p>
        )}
      </div>
    </div>
  );
};
