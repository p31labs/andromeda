import React, { useState, useCallback } from 'react';
import { useAtmosphere } from './AtmosphereProvider';
import type { SurfaceKey } from '../lib/atmosphere';

interface Choice {
  label: string;
  next: number | 'ROUTE';
  target?: SurfaceKey;
}

interface DecisionNode {
  id: number;
  question: string;
  choices: [Choice, Choice];
}

const DECISION_TREE: Record<number, DecisionNode> = {
  0: {
    id: 0,
    question: 'Do you need to release pressure, or find ground?',
    choices: [
      { label: 'Release Pressure', next: 1 },
      { label: 'Find Ground', next: 2 },
    ],
  },
  1: {
    id: 1,
    question: 'Do you want to speak, or be completely silent?',
    choices: [
      { label: 'Speak', next: 'ROUTE', target: 'BONDING' },
      { label: 'Be Silent', next: 'ROUTE', target: 'THE_BUFFER' },
    ],
  },
  2: {
    id: 2,
    question: 'Do you need system facts, or simple focus?',
    choices: [
      { label: 'System Facts', next: 'ROUTE', target: 'GRID' },
      { label: 'Simple Focus', next: 'ROUTE', target: 'ARCADE' },
    ],
  },
};

export default function TheCompass() {
  const { spoons, grayRock, setSurface } = useAtmosphere();
  const [currentNodeId, setCurrentNodeId] = useState(0);
  const [history, setHistory] = useState<number[]>([]);

  const currentNode = DECISION_TREE[currentNodeId];

  const handleChoice = useCallback(
    (choice: Choice) => {
      if (choice.next === 'ROUTE' && choice.target) {
        setSurface(choice.target);
        return;
      }
      if (typeof choice.next === 'number') {
        setHistory((prev) => [...prev, currentNodeId]);
        setCurrentNodeId(choice.next);
      }
    },
    [currentNodeId, setSurface],
  );

  const handleBack = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCurrentNodeId(prev);
  }, [history]);

  const handleStartOver = useCallback(() => {
    setHistory([]);
    setCurrentNodeId(0);
  }, []);

  const getChoiceStyle = (index: number) => {
    if (grayRock || spoons === 0) {
      return 'bg-gray-900/80 border border-gray-800 text-gray-500 rounded-xl';
    }
    if (spoons <= 2) {
      const base = 'rounded-3xl border border-white/10 backdrop-blur-md shadow-[0_0_40px_rgba(255,176,0,0.06)]';
      const warmth = index === 0
        ? 'bg-gradient-to-br from-amber-500/15 to-rose-500/10 hover:from-amber-500/25 hover:to-rose-500/20 text-orange-50'
        : 'bg-gradient-to-br from-blue-500/15 to-cyan-500/10 hover:from-blue-500/25 hover:to-cyan-500/20 text-blue-50';
      return `${base} ${warmth}`;
    }
    const base = 'rounded-2xl border border-white/10 backdrop-blur-sm';
    const color = index === 0
      ? 'bg-white/10 hover:bg-white/15 text-white'
      : 'bg-white/5 hover:bg-white/10 text-white/90';
    return `${base} ${color}`;
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-6 min-h-[60vh] animate-fade-in">
      <div className="mb-12 text-center">
        <h2 className={`text-2xl md:text-3xl font-light leading-relaxed transition-all duration-700
          ${grayRock || spoons === 0 ? 'text-gray-500' : spoons <= 2 ? 'text-orange-50' : 'text-slate-200'}
        `}>
          {currentNode?.question}
        </h2>
      </div>

      <div className="w-full flex flex-col sm:flex-row gap-4 sm:gap-6">
        {currentNode?.choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => handleChoice(choice)}
            className={`flex-1 py-8 px-6 text-lg font-medium tracking-wide transition-all duration-500 active:scale-[0.97] ${getChoiceStyle(i)}`}
          >
            {choice.label}
          </button>
        ))}
      </div>

      <div className="mt-16 flex items-center gap-6">
        {history.length > 0 && (
          <button
            onClick={handleBack}
            className={`text-xs font-mono uppercase tracking-wider transition-all opacity-30 hover:opacity-60
              ${grayRock || spoons === 0 ? 'text-gray-600' : 'text-white/60'}
            `}
          >
            ← Back
          </button>
        )}
        {currentNodeId !== 0 && (
          <button
            onClick={handleStartOver}
            className={`text-xs font-mono uppercase tracking-wider transition-all opacity-20 hover:opacity-50
              ${grayRock || spoons === 0 ? 'text-gray-600' : 'text-white/40'}
            `}
          >
            Start Over
          </button>
        )}
      </div>
    </div>
  );
}
