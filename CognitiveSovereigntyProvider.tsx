import React, { useState, useEffect } from 'react';

interface CognitiveState {
  energy: 'high' | 'medium' | 'low';
  focus: number; // 0-100
  spoons: number;
  maxSpoons: number;
}

interface SovereigntyProviderProps {
  children: React.ReactNode;
}

export default function CognitiveSovereigntyProvider({ children }: SovereigntyProviderProps) {
  const [state, setState] = useState<CognitiveState>({
    energy: 'medium',
    focus: 50,
    spoons: 5,
    maxSpoons: 5
  });

  useEffect(() => {
    const saved = localStorage.getItem('p31-cognitive-state');
    if (saved) {
      try {
        setState(JSON.parse(saved));
      } catch { /* ignore */ }
    }
  }, []);

  const updateState = (updates: Partial<CognitiveState>) => {
    setState(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('p31-cognitive-state', JSON.stringify(next));
      return next;
    });
  };

  const spendSpoon = () => {
    setState(prev => {
      const next = { ...prev, spoons: Math.max(0, prev.spoons - 1) };
      if (next.spoons === 0) next.energy = 'low';
      localStorage.setItem('p31-cognitive-state', JSON.stringify(next));
      return next;
    });
  };

  const restoreSpoon = () => {
    setState(prev => {
      const next = { ...prev, spoons: Math.min(prev.maxSpoons, prev.spoons + 1) };
      if (next.spoons > 2) next.energy = 'medium';
      localStorage.setItem('p31-cognitive-state', JSON.stringify(next));
      return next;
    });
  };

  const view = state.energy === 'low' ? 'low' : state.energy === 'high' ? 'high' : 'medium';

  return (
    <div data-view={view}>
      {children}
    </div>
  );
}
