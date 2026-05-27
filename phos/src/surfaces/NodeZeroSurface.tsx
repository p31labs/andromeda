/**
 * NodeZeroSurface.tsx — Live ESP32-S3 IoT telemetry via WebSocket.
 *
 * Connects to the Node Zero firmware WebSocket endpoint.
 * Parses JSON telemetry payloads and renders them spoon-aware.
 *
 * QUANTUM: dense monospace grid with raw values.
 * SANCTUARY: abstracted "Environmental Comfort" gauge.
 * CRISIS: minimal, only critical alerts.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface TelemetryData {
  hvac_temp: number;
  power_draw_kw: number;
  ambient_lux: number;
  mesh_status: string;
  uptime_s: number;
  free_heap: number;
  wifi_rssi: number;
  timestamp: number;
}

interface Props {
  className?: string;
  spoons: number;
  grayRock: boolean;
}

const WS_URL = 'ws://node-zero.local:81';
const WS_FALLBACK = 'ws://192.168.1.100:81';
const RECONNECT_MS = 5000;

export const NodeZeroSurface: React.FC<Props> = ({ className, spoons, grayRock }) => {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setData({
            hvac_temp: payload.hvac_temp ?? payload.temp ?? 0,
            power_draw_kw: payload.power_draw_kw ?? payload.power ?? 0,
            ambient_lux: payload.ambient_lux ?? payload.lux ?? 0,
            mesh_status: payload.mesh_status ?? payload.mesh ?? 'unknown',
            uptime_s: payload.uptime_s ?? payload.uptime ?? 0,
            free_heap: payload.free_heap ?? payload.heap ?? 0,
            wifi_rssi: payload.wifi_rssi ?? payload.rssi ?? 0,
            timestamp: payload.timestamp ?? Date.now(),
          });
        } catch {
          // malformed payload — ignore
        }
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectRef.current = setTimeout(connect, RECONNECT_MS);
      };

      ws.onerror = () => {
        ws.close();
        // Try fallback IP
        try {
          const ws2 = new WebSocket(WS_FALLBACK);
          wsRef.current = ws2;
          ws2.onopen = () => { setConnected(true); setError(null); };
          ws2.onmessage = ws.onmessage;
          ws2.onclose = ws.onclose;
          ws2.onerror = () => {
            setConnected(false);
            setError('Node Zero unreachable. Check WiFi or flash firmware.');
          };
        } catch {
          setError('Node Zero unreachable. Check WiFi or flash firmware.');
        }
      };
    } catch {
      setError('WebSocket unavailable.');
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect]);

  if (grayRock || spoons === 0) {
    return (
      <div className={className}>
        <p className="text-xs opacity-50">Node Zero telemetry suspended. Gray Rock active.</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className={className}>
        <p className="text-xs text-amber-500">{error}</p>
        <p className="text-xs text-gray-600 mt-1">Showing last known state or simulation.</p>
      </div>
    );
  }

  // SANCTUARY: abstracted comfort gauge
  if (spoons <= 2) {
    const comfort = data
      ? (data.hvac_temp >= 68 && data.hvac_temp <= 76 ? 'Comfortable' : 'Adjusting…')
      : 'Connecting…';
    return (
      <div className={className}>
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-amber-400/20 to-rose-400/20 flex items-center justify-center">
            <span className="text-3xl">{comfort === 'Comfortable' ? '✓' : '◉'}</span>
          </div>
          <p className="text-lg">{comfort}</p>
          <p className="text-xs text-gray-500">Environment stable. Rest.</p>
        </div>
      </div>
    );
  }

  // QUANTIUM/BRIDGE: dense telemetry grid
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
        <span className="text-xs text-gray-500">{connected ? 'LIVE' : 'RECONNECTING'}</span>
      </div>

      {data ? (
        <div className={`grid grid-cols-2 gap-3 ${spoons >= 4 ? 'font-mono text-xs' : 'text-sm'}`}>
          <TelemetryCard label="HVAC Temp" value={`${data.hvac_temp.toFixed(1)}°F`} alert={data.hvac_temp > 80 || data.hvac_temp < 60} />
          <TelemetryCard label="Power" value={`${data.power_draw_kw.toFixed(2)} kW`} alert={data.power_draw_kw > 5} />
          <TelemetryCard label="Ambient Light" value={`${data.ambient_lux} lux`} />
          <TelemetryCard label="WiFi Signal" value={`${data.wifi_rssi} dBm`} alert={data.wifi_rssi < -70} />
          <TelemetryCard label="Free Heap" value={`${(data.free_heap / 1024).toFixed(0)} KB`} alert={data.free_heap < 50000} />
          <TelemetryCard label="Mesh" value={data.mesh_status} alert={data.mesh_status !== 'online'} />
          <TelemetryCard label="Uptime" value={formatUptime(data.uptime_s)} />
          <TelemetryCard label="Last Ping" value={new Date(data.timestamp).toLocaleTimeString()} />
        </div>
      ) : (
        <div className="text-sm text-gray-500 animate-pulse">Waiting for telemetry…</div>
      )}
    </div>
  );
};

function TelemetryCard({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${alert ? 'border-red-800/50 bg-red-950/20' : 'border-white/10 bg-white/5'}`}>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`mt-1 font-medium ${alert ? 'text-red-400' : 'text-emerald-400'}`}>{value}</div>
    </div>
  );
}

function formatUptime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export default NodeZeroSurface;
