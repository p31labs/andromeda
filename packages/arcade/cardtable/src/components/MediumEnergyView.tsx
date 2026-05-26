import React, { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, RotateCcw, Play, Pause, Bot } from 'lucide-react';
import { CardTable, type CardState, type ChipState } from './CardTable';
import { createShuffledDeck } from '../engine/Deck';

interface MediumEnergyViewProps {
  onBack: () => void;
}

export const MediumEnergyView: React.FC<MediumEnergyViewProps> = ({ onBack }) => {
  const [cards, setCards] = useState<CardState[]>([]);
  const [chips, setChips] = useState<ChipState[]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [cameraMode, setCameraMode] = useState<'default' | 'top' | 'player'>('default');
  const [coOpMode] = useState(false);
  const [victoryMode, setVictoryMode] = useState(false);

  // Initialize game
  const initGame = useCallback(() => {
    const deck = createShuffledDeck(Date.now());
    const dealtCards: CardState[] = [];

    // Deal 7 columns (solitaire style)
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck.draw(1)[0];
        if (card) {
          dealtCards.push({
            id: card.id,
            value: card.value,
            suit: card.suit,
            position: {
              x: (col - 3) * 3.5,
              y: 0.5,
              z: (row - 3) * 0.3 - 5,
            },
            rotation: { x: -Math.PI / 2, y: 0, z: 0 },
            isFaceUp: row === col,
          });
        }
      }
    }

    // Add stock pile
    const remaining = deck.getState().remaining;
    remaining.forEach((card, i) => {
      dealtCards.push({
        id: card.id,
        value: card.value,
        suit: card.suit,
        position: {
          x: -12,
          y: 0.5,
          z: -8 + i * 0.02,
        },
        rotation: { x: -Math.PI / 2, y: 0, z: 0 },
        isFaceUp: false,
      });
    });

    setCards(dealtCards);
    setChips([]);
    setScore(0);
    setMoves(0);
    setVictoryMode(false);
    setGameStarted(true);
  }, []);

  // Handle card click
  const handleCardClick = useCallback((cardId: string) => {
    if (isPaused) return;

    setCards(prev => prev.map(card => {
      if (card.id === cardId && !card.isFaceUp) {
        setMoves(m => m + 1);
        setScore(s => s + 5);
        return { ...card, isFaceUp: true };
      }
      return card;
    }));
  }, [isPaused]);

  // AI move simulation
  useEffect(() => {
    if (!gameStarted || isPaused) return;

    const aiInterval = setInterval(() => {
      // Simple AI: flip random face-down card
      const faceDownCards = cards.filter(c => !c.isFaceUp);
      if (faceDownCards.length > 0 && Math.random() < 0.1) {
        const randomCard = faceDownCards[Math.floor(Math.random() * faceDownCards.length)];
        handleCardClick(randomCard.id);
      }
    }, 3000);

    return () => clearInterval(aiInterval);
  }, [gameStarted, isPaused, cards, handleCardClick]);

  // Check victory
  useEffect(() => {
    const allFaceUp = cards.length > 0 && cards.every(c => c.isFaceUp);
    if (allFaceUp && gameStarted && !victoryMode) {
      setVictoryMode(true);
      setScore(s => s + 100);
    }
  }, [cards, gameStarted, victoryMode]);

  return (
    <div className="h-screen bg-bg flex flex-col overflow-hidden">
      {/* Header */}
      <header className="glass-card sticky top-0 z-50 px-4 py-3 flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-phos" />
        </button>

        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">Medium Energy Mode</h1>
          <p className="text-xs text-white/50">3 Spoons • 15-Minute Loop</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-white/50">Score</p>
            <p className="text-lg font-bold text-phos">{score}</p>
          </div>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {isPaused ? (
              <Play className="w-5 h-5 text-phos" />
            ) : (
              <Pause className="w-5 h-5 text-white/50" />
            )}
          </button>
        </div>
      </header>

      {/* Main 3D Canvas */}
      <main className="flex-1 relative">
        {!gameStarted ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-phos/20 flex items-center justify-center mx-auto">
                <Bot className="w-10 h-10 text-phos" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Solitaire vs AI</h2>
                <p className="text-white/50 mt-2">Practice with procedural 3D cards</p>
              </div>
              <button
                onClick={initGame}
                className="glass-button px-8 py-4 rounded-xl font-bold text-phos border-phos/30
                           flex items-center gap-2 mx-auto"
              >
                <Play className="w-5 h-5" />
                Start Game
              </button>
            </div>
          </div>
        ) : (
          <>
            <CardTable
              cards={cards}
              chips={chips}
              coOpMode={coOpMode}
              victoryMode={victoryMode}
              onCardClick={handleCardClick}
              cameraMode={cameraMode}
            />

            {/* Controls Overlay */}
            <div className="absolute bottom-6 left-6 glass-card rounded-xl p-3 space-y-2">
              <p className="text-xs text-white/50 font-bold">Camera</p>
              <div className="flex gap-2">
                {(['default', 'top', 'player'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setCameraMode(mode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${
                      cameraMode === mode
                        ? 'bg-phos/20 text-phos'
                        : 'bg-white/5 text-white/50'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="absolute bottom-6 right-6 glass-card rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between gap-6">
                <span className="text-xs text-white/50">Moves</span>
                <span className="font-bold text-white">{moves}</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-xs text-white/50">Cards</span>
                <span className="font-bold text-white">{cards.length}</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-xs text-white/50">Face Up</span>
                <span className="font-bold text-cyan">
                  {cards.filter(c => c.isFaceUp).length}
                </span>
              </div>
            </div>

            {/* Pause Overlay */}
            {isPaused && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="glass-card rounded-2xl p-8 text-center">
                  <Pause className="w-12 h-12 text-phos mx-auto mb-4" />
                  <p className="text-xl font-bold text-white">Paused</p>
                  <p className="text-white/50 text-sm mt-2">
                    Click play to resume
                  </p>
                </div>
              </div>
            )}

            {/* Victory Overlay */}
            {victoryMode && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                <div className="glass-card rounded-2xl p-8 text-center">
                  <p className="text-4xl font-bold text-phos mb-2">🎉 Victory!</p>
                  <p className="text-white/70">All cards revealed</p>
                  <p className="text-gold font-bold mt-4">+100 bonus points</p>
                </div>
              </div>
            )}

            {/* Reset Button */}
            <button
              onClick={initGame}
              className="absolute top-6 right-6 glass-button p-3 rounded-xl text-white/50"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </>
        )}
      </main>

      <footer className="glass-card px-4 py-2 flex items-center justify-between">
        <p className="text-xs text-white/30">
          Medium Energy • 3D Solitaire • AI Opponent
        </p>
        <div className="flex items-center gap-4 text-[10px] text-white/20">
          <span>Procedural Cards</span>
          <span>•</span>
          <span>Physics Enabled</span>
          <span>•</span>
          <span>Paused Timing</span>
        </div>
      </footer>
    </div>
  );
};
