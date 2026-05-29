import React, { useState, useEffect } from 'react';
import { usePerformanceMonitor } from '../../shared/hooks/usePerformanceMonitor';
import { useSync } from '../SyncProvider';
import { NetworkStats } from '../../shared/network/WebRTCSync';

const PerformanceHUD: React.FC = () => {
  const metrics = usePerformanceMonitor();
  const { sync } = useSync();
  const [netStats, setNetStats] = useState<NetworkStats | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (sync) {
        setNetStats(sync.getStats());
      }
    }, 500);
    return () => clearInterval(interval);
  }, [sync]);

  return (
    <div className="fixed bottom-4 left-4 z-50 pointer-events-none">
      <div className="glass-panel p-3 rounded-lg border border-phos-green/30 bg-black/60 backdrop-blur-md flex flex-col gap-2 min-w-[180px]">
        <div className="flex justify-between items-center border-b border-phos-green/20 pb-1 mb-1">
          <span className="text-[10px] uppercase tracking-tighter text-phos-green font-bold">System Status</span>
          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${metrics.fps > 30 ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex flex-col">
            <span className="text-[8px] opacity-50 uppercase">Rendering</span>
            <span className="text-sm font-mono">{metrics.fps} FPS</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] opacity-50 uppercase">Heap</span>
            <span className="text-sm font-mono">{metrics.memoryUsage}MB</span>
          </div>
        </div>

        {netStats && (
          <div className="pt-2 border-t border-phos-green/10 flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="opacity-50">TX:</span>
              <span>{Math.round(netStats.bytesSent / 1024)}KB</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="opacity-50">RX:</span>
              <span>{Math.round(netStats.bytesReceived / 1024)}KB</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="opacity-50">LATENCY:</span>
              <span className="text-phos-green">{Math.round(netStats.latency)}ms</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceHUD;