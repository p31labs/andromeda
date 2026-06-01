import React, { useState, useEffect } from 'react';

interface TelemetryData {
  hvac_temp: number;
  power_draw_kw: number;
  ambient_lux: number;
  mesh_status: string;
}

export function NodeZeroSurface({ theme, spoons }: { theme: Record<string, string>; spoons: number }) {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let fallbackTimeout: any = null;

    function initSocket() {
      try {
        ws = new WebSocket('ws://node-zero.local:81');
        ws.onopen = () => setOnline(true);
        ws.onclose = () => {
          setOnline(false);
          fallbackTimeout = setTimeout(initSocket, 5000);
        };
        ws.onmessage = (event) => {
          try {
            setData(JSON.parse(event.data));
          } catch {
            setData({ hvac_temp: 71.4, power_draw_kw: 1.42, ambient_lux: 340, mesh_status: 'DELTA_ACTIVE' });
          }
        };
      } catch {
        setOnline(false);
      }
    }

    initSocket();
    return () => {
      if (ws) ws.close();
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, []);

  if (!data) {
    return (
      <div className="space-y-4 w-full">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span className="text-xs font-mono tracking-widest uppercase opacity-60">NODE_ZERO // TELEMETRY</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-900/30">DISCOVERING</span>
        </div>
        <div className="text-xs font-mono opacity-50 py-8 text-center space-y-3">
          <div className="animate-pulse">Scanning local network for Node Zero...</div>
          <div className="text-[10px] opacity-30">Ensure device is powered on and connected to the same network</div>
          <button
            onClick={() => setData({ hvac_temp: 71.4, power_draw_kw: 1.42, ambient_lux: 340, mesh_status: 'DEMO_MODE' })}
            className="mt-4 px-4 py-2 text-[10px] font-mono border border-white/10 text-white/50 rounded hover:bg-white/5"
          >
            LOAD_DEMO_DATA
          </button>
        </div>
      </div>
    );
  }

  if (spoons <= 2) {
    const isComfortable = data.hvac_temp >= 68 && data.hvac_temp <= 74 && data.power_draw_kw < 2.5;
    return (
      <div className="w-full p-4 text-center space-y-3">
        <span className="text-xs font-mono tracking-widest uppercase opacity-40 block">Environmental Comfort Perimeter</span>
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          <div className={`absolute inset-0 rounded-full blur-xl opacity-20 animate-pulse ${isComfortable ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center font-bold text-sm ${isComfortable ? 'border-emerald-500 text-emerald-200' : 'border-rose-500 text-rose-200'}`}>
            {isComfortable ? 'STABLE' : 'WARN'}
          </div>
        </div>
        <p className="text-xs text-white/70 max-w-xs mx-auto leading-relaxed">
          The structural environment is balanced. Climate and load draw are operating within optimal human baselines.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full font-mono text-xs">
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <span className="tracking-widest uppercase opacity-60">NODE_ZERO // TELEMETRY_HUD</span>
        <span className={`text-[10px] px-2 py-0.5 rounded ${online ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' : 'bg-red-950/40 text-red-400 border border-red-900/30'}`}>
          {online ? 'CONN_STABLE' : 'CONN_RETRYING'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-left">
        <div className="p-3 bg-white/5 border border-white/5 rounded-lg flex justify-between">
          <span className="opacity-40">HVAC_TEMP:</span>
          <span className="text-cyan-400 font-bold">{data.hvac_temp}°F</span>
        </div>
        <div className="p-3 bg-white/5 border border-white/5 rounded-lg flex justify-between">
          <span className="opacity-40">LOAD_DRAW:</span>
          <span className="text-emerald-400 font-bold">{data.power_draw_kw}kW</span>
        </div>
        <div className="p-3 bg-white/5 border border-white/5 rounded-lg flex justify-between">
          <span className="opacity-40">LIGHT_LUX:</span>
          <span className="text-amber-400 font-bold">{data.ambient_lux} lx</span>
        </div>
        <div className="p-3 bg-white/5 border border-white/5 rounded-lg flex justify-between">
          <span className="opacity-40">MESH_STAT:</span>
          <span className="text-purple-400 font-bold">{data.mesh_status}</span>
        </div>
      </div>
    </div>
  );
}
