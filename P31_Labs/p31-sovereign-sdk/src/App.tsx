import { useEffect } from 'react';
import { useSovereignStore } from './store/useSovereignStore';
import { ROOMS } from './types';
import { setupSovereignPWA } from './lib/pwa';
import { ImmersiveCockpitUI } from './components/ImmersiveCockpit';
import { ClassicDiagnosticUI } from './components/ClassicDiagnostic';

export default function App() {
  const {
    viewMode, toggleView, setPwaStatus,
    activeRoom, targetRoom, isRoomTransitioning, navigateRoom,
    initIdentity, connectBLE, appendTelemetry, exportLedger, telemetryHashes
  } = useSovereignStore();

  useEffect(() => { setupSovereignPWA(setPwaStatus); }, [setPwaStatus]);

  useEffect(() => {
    const interval = setInterval(() => {
      const { coherence, noiseFloor, isRoomTransitioning, activeRoom } = useSovereignStore.getState();
      if (!isRoomTransitioning && activeRoom !== 'BUFFER' && coherence < 0.99) {
        useSovereignStore.setState({ coherence: Math.min(0.99, coherence + 0.02), noiseFloor: Math.max(0.05, noiseFloor - 0.05) });
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative font-mono select-none">
      {viewMode === 'cockpit' ? <ImmersiveCockpitUI /> : <ClassicDiagnosticUI />}

      {/* Unified Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2 bg-[#000a00]/90 border-b border-[#005500] backdrop-blur-md">
        {/* Left: P31-OS */}
        <div className="text-[#39FF14] font-bold tracking-widest text-sm px-3 py-1 border border-[#39FF14] bg-[#001100] shadow-[0_0_10px_rgba(57,255,20,0.3)] shrink-0">
          P31-OS
        </div>

        {/* Center: Room Nav + Action Buttons */}
        <div className="flex items-center gap-1 mx-2 overflow-x-auto">
          {/* Room Navigation */}
          {ROOMS.map(room => {
            const isActive = activeRoom === room;
            const isTarget = targetRoom === room && isRoomTransitioning;
            return (
              <button
                key={room}
                disabled={isRoomTransitioning}
                onClick={() => navigateRoom(room)}
                className={`px-2 py-1 text-xs font-bold tracking-wider transition-all border whitespace-nowrap disabled:cursor-not-allowed uppercase ${
                  isActive && !isRoomTransitioning
                    ? 'bg-[#39FF14] text-black border-[#39FF14] shadow-[0_0_8px_rgba(57,255,20,0.8)]'
                    : isTarget
                    ? 'bg-[#39FF14] text-black border-[#39FF14] animate-pulse'
                    : 'bg-transparent text-[#39FF14] border-transparent hover:border-[#39FF14]/50'
                }`}
              >
                {room}
              </button>
            );
          })}

          {/* Separator */}
          {viewMode === 'cockpit' && (
            <>
              <div className="w-px h-6 bg-[#39FF14]/30 mx-1 shrink-0" />
              {/* Action Buttons */}
              <button disabled={isRoomTransitioning} onClick={initIdentity} className="px-2 py-1 bg-[#001100] border border-[#39FF14]/60 text-[#39FF14] font-bold text-[10px] tracking-wider hover:bg-[#39FF14] hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase whitespace-nowrap">
                L3
              </button>
              <button disabled={isRoomTransitioning} onClick={connectBLE} className="px-2 py-1 bg-[#001100] border border-[#39FF14]/60 text-[#39FF14] font-bold text-[10px] tracking-wider hover:bg-[#39FF14] hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase whitespace-nowrap">
                L2
              </button>
              <button disabled={isRoomTransitioning} onClick={appendTelemetry} className="px-2 py-1 bg-[#001100] border border-[#39FF14]/60 text-[#39FF14] font-bold text-[10px] tracking-wider hover:bg-[#39FF14] hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase whitespace-nowrap">
                L1
              </button>
              <button disabled={isRoomTransitioning || telemetryHashes.length === 0} onClick={exportLedger} className="px-2 py-1 bg-transparent border border-[#39FF14]/30 text-[#39FF14]/60 font-bold text-[10px] tracking-wider hover:bg-[#39FF14] hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase whitespace-nowrap">
                EXP
              </button>
            </>
          )}
        </div>

        {/* Right: View Toggle */}
        <button onClick={toggleView} className="px-3 py-1 bg-[#001100] border border-[#39FF14] text-[#39FF14] font-bold text-xs hover:bg-[#39FF14] hover:text-black transition-colors uppercase cursor-pointer shadow-[0_0_10px_rgba(57,255,20,0.3)] shrink-0">
          {viewMode === 'cockpit' ? '2D' : '3D'}
        </button>
      </div>
    </div>
  );
}
