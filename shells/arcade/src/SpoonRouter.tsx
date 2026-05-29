import React, { useState, lazy, Suspense } from 'react';

// A placeholder for the game components
const GamePlaceholder = ({ name }: { name: string }) => (
  <div>
    <h2>{name}</h2>
    <p>Coming soon...</p>
  </div>
);

// Lazily load the game views
const Games = {
  smallball: {
    LowEnergy: lazy(() => import('../games/smallball/LowEnergyView')),
    MediumEnergy: lazy(() => import('../games/smallball/MediumEnergyView')),
    HighEnergy: lazy(() => import('../games/smallball/HighEnergyView')),
  },
  gridiron: {
    LowEnergy: lazy(() => Promise.resolve({ default: () => <GamePlaceholder name="Gridiron - Low Energy" /> })),
    MediumEnergy: lazy(() => Promise.resolve({ default: () => <GamePlaceholder name="Gridiron - Medium Energy" /> })),
    HighEnergy: lazy(() => Promise.resolve({ default: () => <GamePlaceholder name="Gridiron - High Energy" /> })),
  },
  // ... and so on for the other 7 games
};

type GameId = keyof typeof Games;
type SpoonLevel = 'LowEnergy' | 'MediumEnergy' | 'HighEnergy';

export const SpoonRouter: React.FC = () => {
  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<SpoonLevel | null>(null);

  if (selectedGame && selectedLevel) {
    const GameComponent = Games[selectedGame][selectedLevel];
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <GameComponent />
      </Suspense>
    );
  }

  return (
    <div>
      <h1>P31 Arcade</h1>
      <h2>Select a Game:</h2>
      {Object.keys(Games).map((gameId) => (
        <button key={gameId} onClick={() => setSelectedGame(gameId as GameId)}>
          {gameId}
        </button>
      ))}

      {selectedGame && (
        <div>
          <h2>Select Energy Level:</h2>
          <button onClick={() => setSelectedLevel('LowEnergy')}>Low (1 Spoon)</button>
          <button onClick={() => setSelectedLevel('MediumEnergy')}>Medium (3 Spoons)</button>
          <button onClick={() => setSelectedLevel('HighEnergy')}>High (6 Spoons)</button>
        </div>
      )}
    </div>
  );
};
