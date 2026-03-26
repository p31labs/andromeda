import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useZoneStore } from '../../stores/zoneStore';

/**
 * WCD-SE02: Visitor Mindset Modal
 * The 3-second hold-to-ground UI overlay that triggers when isTransitioning becomes true.
 * This physical interruption is the required mechanical resolution for the "Double Empathy" event boundary.
 */
export const VisitorMindsetModal: React.FC = () => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Get state from store - proper selectors
  const spatialState = useZoneStore((state) => state.spatialState);
  const environmentalState = useZoneStore((state) => state.environmentalState);
  const activeZoneId = useZoneStore((state) => state.activeZoneId);
  const zones = useZoneStore((state) => state.zones);
  const completeGrounding = useZoneStore((state) => state.completeGrounding);
  
  const isTransitioning = spatialState.isTransitioning;
  const isGrounded = environmentalState.isGrounded;
  const groundingDuration = environmentalState.groundingDuration;
  
  // Get the current zone name
  const currentZone = activeZoneId ? zones.find(z => z.id === activeZoneId) : null;
  
  const holdTimerRef = useRef<number | null>(null);

  // Reset state when transition starts
  useEffect(() => {
    if (isTransitioning && !isGrounded) {
      setIsHolding(false);
      setProgress(0);
    }
  }, [isTransitioning, isGrounded]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
      }
    };
  }, []);

  const handleMouseDown = useCallback(() => {
    if (!isTransitioning || isGrounded) return;
    setIsHolding(true);
    setProgress(0);
    
    const intervalMs = 30;
    const stepsPerSecond = 1000 / intervalMs;
    const totalSteps = groundingDuration / intervalMs;
    const progressPerStep = 100 / totalSteps;
    
    holdTimerRef.current = window.setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + progressPerStep;
        if (newProgress >= 100) {
          handleGroundingComplete();
          return 100;
        }
        return newProgress;
      });
    }, intervalMs);
  }, [isTransitioning, isGrounded, groundingDuration]);

  const handleMouseUp = useCallback(() => {
    if (!isHolding) return;
    setIsHolding(false);
    setProgress(0);
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, [isHolding]);

  const handleGroundingComplete = useCallback(() => {
    setIsHolding(false);
    setProgress(100);
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    // Trigger the grounding completion in the zone store
    completeGrounding();
  }, [completeGrounding]);

  if (!isTransitioning || isGrounded) return null;

  // Calculate breath circle SVG parameters
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * progress) / 100;
  const isComplete = progress >= 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xl transition-all duration-500"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={(e) => { e.preventDefault(); handleMouseDown(); }}
      onTouchEnd={handleMouseUp}
    >
      <div className="flex flex-col items-center max-w-md p-8 text-center bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl">
        {/* BLUF (Bottom Line Up Front) Header */}
        <div className="mb-8">
          <h2 className="text-sm font-mono tracking-widest text-zinc-400 uppercase">
            Threshold Detected
          </h2>
          <h1 className="mt-2 text-3xl font-bold text-white">
            Entering {currentZone?.name || 'New Zone'}
          </h1>
          <p className="mt-4 text-zinc-300">
            Current Room Energy: <span className="font-semibold text-emerald-400">{currentZone?.elemental || 'Unknown'}</span>
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            You are carrying external velocity. Please initiate a grounding sequence to adapt to the Visitor Mindset before entering.
          </p>
        </div>

        {/* The Mechanical Interruption (Hold to Ground) */}
        <div className="relative flex items-center justify-center w-48 h-48">
          {/* Expanding SVG Breath Pacer */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#3f3f46"
              strokeWidth="4"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={isComplete ? "#34d399" : "#60a5fa"}
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-75 ease-linear"
            />
          </svg>

          {/* Touch/Mouse Interaction Target */}
          <button
            className={`relative z-10 w-32 h-32 rounded-full font-mono text-sm font-bold tracking-wider transition-all duration-300 ${
              isHolding ? 'bg-blue-500/20 text-blue-300 scale-95' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {isHolding ? 'BREATHE...' : 'HOLD TO GROUND'}
          </button>
        </div>
      </div>
    </div>
  );
};
