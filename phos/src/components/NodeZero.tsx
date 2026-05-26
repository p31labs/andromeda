import React, { useEffect, useState } from 'react';
import { useAtmosphere } from './AtmosphereProvider';

interface Telemetry {
  env_temp: string;
  mesh_nodes_active: number;
  ambient_light: string;
  power_draw: string;
  last_updated: string;
}

const NodeZero: React.FC = () => {
  const { spoons } = useAtmosphere();
  const [telemetry, setTelemetry] = useState<Telemetry>({
    env_temp: '--',
    mesh_nodes_active: 0,
    ambient_light: '--',
    power_draw: '--',
    last_updated: '--',
  });
  const [pingSent, setPingSent] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry({
        env_temp: (72 + Math.random() * 4).toFixed(1) + '°F',
        mesh_nodes_active: Math.floor(Math.random() * 3) + 1,
        ambient_light: Math.floor(Math.random() * 60 + 20) + '%',
        power_draw: (10 + Math.random() * 4).toFixed(1) + 'W',
        last_updated: new Date().toLocaleTimeString(),
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (spoons <= 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 animate-fade-in"
        style={{ backgroundColor: '#0a000a', color: '#b026ff' }}
      >
        <div className="max-w-md">
          <div className="mb-6 text-4xl font-thin tracking-[0.3em] uppercase opacity-30">●</div>
          <p className="text-lg font-mono leading-relaxed opacity-80">
            Physical mesh is stable.<br />
            Living room is comfortable.<br />
            You are safe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen px-4 py-16 animate-fade-in"
      style={{ backgroundColor: '#0a000a', color: '#b026ff' }}
    >
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-10">
          <div className="text-3xl font-thin tracking-[0.3em] uppercase opacity-30 mb-4">●</div>
          <h1 className="text-2xl font-light mb-2" style={{ color: '#dd66ff' }}>Node Zero</h1>
          <p className="text-sm font-mono opacity-50">Physical Hardware Bridge</p>
        </div>

        <div className="space-y-3 font-mono text-sm">
          <div className="p-4"
            style={{
              backgroundColor: '#120012',
              border: '1px solid #b026ff33',
            }}
          >
            <div className="text-[10px] uppercase tracking-widest mb-3 opacity-50">Environment</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] opacity-40">Temp</div>
                <div className="text-lg">{telemetry.env_temp}</div>
              </div>
              <div>
                <div className="text-[10px] opacity-40">Light</div>
                <div className="text-lg">{telemetry.ambient_light}</div>
              </div>
              <div>
                <div className="text-[10px] opacity-40">Mesh Nodes</div>
                <div className="text-lg">{telemetry.mesh_nodes_active}</div>
              </div>
              <div>
                <div className="text-[10px] opacity-40">Power</div>
                <div className="text-lg">{telemetry.power_draw}</div>
              </div>
            </div>
            <div className="mt-3 text-[10px] opacity-30">
              Updated: {telemetry.last_updated}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setPingSent(true);
              setTimeout(() => setPingSent(false), 2000);
            }}
            className="px-8 py-3 text-sm font-mono uppercase tracking-widest transition-all hover:opacity-80"
            style={{
              backgroundColor: '#1a001a',
              color: '#b026ff',
              border: '1px solid #b026ff44',
            }}
          >
            {pingSent ? 'Signal sent to Genesis Gate' : 'Ping Genesis Gate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeZero;
