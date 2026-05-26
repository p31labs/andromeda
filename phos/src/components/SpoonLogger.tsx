import React from 'react';
import { useAtmosphere } from './AtmosphereProvider';

const SPOON_LABELS = ['Empty', 'Low', 'Managing', 'Okay', 'Good', 'Full'];

/**
 * SpoonLogger — Cognitive load tracker (0-5).
 *
 * Reads from and writes to the shared spoon state in AtmosphereContext.
 * When spoons drop to 1 or 0, auto-triggers Gray Rock.
 * Both PHOSGuide and SpoonLogger now read the *same* spoons value.
 */
const SpoonLogger: React.FC = () => {
  const { preset, grayRock, spoons, setSpoons, loading } = useAtmosphere();

  const textColor = grayRock ? '#888888' : preset.palette.text;
  const activeColor = grayRock ? '#888888' : preset.palette.primary;
  const inactiveBg = grayRock ? '#222222' : '#333333';

  return (
    <div
      className="flex items-center gap-1.5"
      style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.3s' }}
    >
      <span
        className="text-[10px] font-mono uppercase tracking-wider"
        style={{ color: textColor }}
      >
        Spoons:
      </span>
      <div className="flex gap-0.5">
        {[0, 1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            onClick={() => setSpoons(level)}
            className="w-5 h-5 rounded-sm text-[9px] font-mono transition-all duration-150 hover:scale-110"
            style={{
              backgroundColor: spoons >= level ? activeColor : inactiveBg,
              color: spoons >= level ? '#000000' : '#666666',
            }}
            title={`${level} — ${SPOON_LABELS[level]}`}
            aria-label={`Set spoons to ${level} (${SPOON_LABELS[level]})`}
          >
            {level}
          </button>
        ))}
      </div>
      {spoons <= 1 && (
        <span
          className="text-[10px] font-mono"
          style={{ color: '#888888' }}
        >
          ⚫ gray rock
        </span>
      )}
    </div>
  );
};

export default SpoonLogger;
