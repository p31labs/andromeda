import React, { useState, useRef, useEffect } from 'react';
import { Activity, Bone, Zap, XCircle, Loader2 } from 'lucide-react';
import type { BioPayload } from '../types/phos';

export const BiologicalAnchor: React.FC<{ onLogTelemetry: (payload: BioPayload) => void }> = ({ onLogTelemetry }) => {
  const [pendingAction, setPendingAction] = useState<BioPayload['compound'] | null>(null);
  const [countdown, setCountdown] = useState(0);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleStrike = (compound: BioPayload['compound']) => {
    if (pendingAction) return;
    setPendingAction(compound);
    setCountdown(10);

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    commitTimerRef.current = setTimeout(() => {
      onLogTelemetry({ compound, action: 'ingest' });
      clearBuffer();
    }, 10000);
  };

  const handleUndo = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearBuffer();
  };

  const clearBuffer = () => {
    setPendingAction(null);
    setCountdown(0);
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  useEffect(() => clearBuffer, []);

  const renderButton = (compound: BioPayload['compound'], label: string, icon: React.ReactNode, colorClass: string) => {
    const isPending = pendingAction === compound;
    return (
      <button
        disabled={!!pendingAction && !isPending}
        onClick={isPending ? handleUndo : () => handleStrike(compound)}
        className={`
          relative w-full h-24 rounded-xl border-2 flex items-center justify-between px-6
          transition-all duration-300 touch-manipulation select-none outline-none
          ${isPending ? 'bg-amber-950/80 border-amber-900 text-amber-500' : `bg-zinc-900/50 ${colorClass} active:scale-95`}
          ${!!pendingAction && !isPending ? 'opacity-30 grayscale pointer-events-none' : ''}
        `}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-zinc-950 border border-zinc-800">
            {isPending ? <Loader2 size={24} className="animate-spin" /> : icon}
          </div>
          <div className="flex flex-col items-start">
            <span className="font-mono text-lg tracking-widest text-zinc-200">{isPending ? `COMMITTING IN ${countdown}s` : label}</span>
            <span className="font-mono text-[10px] text-zinc-500 mt-1">{isPending ? 'TAP TO ABORT DATA ENTRY' : 'STRIKE REALITY ANVIL'}</span>
          </div>
        </div>
        {isPending && <XCircle size={24} className="text-red-500" />}
      </button>
    );
  };

  return (
    <div className="w-full flex flex-col gap-4 p-4 bg-zinc-950 border-t border-zinc-900/50 rounded-t-3xl mt-auto">
      <header className="flex items-center gap-2 px-2 text-zinc-500 font-mono text-xs mb-2">
        <Activity size={14} className="text-blue-500" />
        <span>BIOLOGICAL COMPLIANCE FEED</span>
      </header>
      {renderButton('calcium', 'CALCIUM', <Bone size={24} />, 'border-blue-900/50 text-blue-400')}
      {renderButton('calcitriol', 'CALCITRIOL', <Zap size={24} />, 'border-amber-900/50 text-amber-500')}
    </div>
  );
};
