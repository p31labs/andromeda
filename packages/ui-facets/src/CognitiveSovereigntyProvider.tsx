import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the absolute cognitive limits (Spoon Theory)
type SpoonCount = 1 | 2 | 3 | 4 | 5 | 6;
type UIFacet = 'law' | 'kid' | 'a11y';

interface CognitiveState {
  currentSpoons: SpoonCount;
  setSpoons: (spoons: SpoonCount) => void;
  activeFacet: UIFacet;
  isSurvivalMode: boolean;
  r3fFrameloop: 'always' | 'demand';
  touchTargetMinSize: string; // Tailwind class
}

const CognitiveContext = createContext<CognitiveState | undefined>(undefined);

export const CognitiveSovereigntyProvider = ({ children }: { children: ReactNode }) => {
  // Default to 6 spoons (High-capacity/Institutional mode)
  const [currentSpoons, setCurrentSpoons] = useState<SpoonCount>(6);
  const [activeFacet, setActiveFacet] = useState<UIFacet>('law');

  useEffect(() => {
    // Dynamically shape-shift the UI based on cognitive load
    if (currentSpoons >= 5) {
      setActiveFacet('law'); // High-density, terminal aesthetic
    } else if (currentSpoons >= 3) {
      setActiveFacet('kid'); // Frictionless, bouncy animations
    } else {
      setActiveFacet('a11y'); // Survival mode: High-contrast, max readability
    }
  }, [currentSpoons]);

  const isSurvivalMode = currentSpoons <= 2;
  
  // R3F optimization: Halt WebGL loops if spoons are critically low
  const r3fFrameloop = isSurvivalMode ? 'demand' : 'always';
  
  // Ergonomic optimization: Expand touch targets if cognitive/physical energy is low
  const touchTargetMinSize = isSurvivalMode ? 'min-h-[64px] min-w-[64px]' : 'min-h-[44px] min-w-[44px]';

  return (
    <CognitiveContext.Provider 
      value={{ 
        currentSpoons, 
        setSpoons: setCurrentSpoons, 
        activeFacet, 
        isSurvivalMode,
        r3fFrameloop,
        touchTargetMinSize
      }}
    >
      <div 
        className={`transition-colors duration-500 ease-in-out min-h-screen ${
          activeFacet === 'a11y' ? 'bg-black text-white' : 
          activeFacet === 'kid' ? 'bg-sky-50 text-slate-800' : 
          'bg-slate-950 text-emerald-400'
        }`}
      >
        {children}
      </div>
    </CognitiveContext.Provider>
  );
};

export const useSpoons = () => {
  const context = useContext(CognitiveContext);
  if (context === undefined) {
    throw new Error('useSpoons must be used within a CognitiveSovereigntyProvider');
  }
  return context;
};