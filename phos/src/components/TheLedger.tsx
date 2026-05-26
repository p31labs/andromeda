import React, { useEffect, useState } from 'react';
import { useAtmosphere } from './AtmosphereProvider';
import { getLogs, clearLogs } from '../lib/EventLogger';
import type { PHOSEvent } from '../lib/EventLogger';

const TheLedger: React.FC = () => {
  const { spoons } = useAtmosphere();
  const [events, setEvents] = useState<PHOSEvent[]>([]);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    setEvents(getLogs());
  }, []);

  const formatTimestamp = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const eventClass = (type: string): string => {
    switch (type) {
      case 'GUARDIAN_ACTIVATED': return 'text-red-400';
      case 'SPOON_STATE_CHANGED': return 'text-amber-400';
      case 'DEVICE_SEALED':
      case 'DEVICE_UNLOCKED': return 'text-cyan-400';
      case 'INTENT_ROUTED': return 'text-emerald-400';
      case 'SURFACE_NAVIGATED': return 'text-sky-400';
      case 'VOICE_TOGGLED': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  if (spoons <= 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 animate-fade-in"
        style={{ backgroundColor: '#0a0a0f', color: '#667788' }}
      >
        <div className="max-w-md">
          <div className="mb-6 text-4xl font-thin tracking-[0.3em] uppercase opacity-30">
            ●
          </div>
          <p className="text-lg font-mono leading-relaxed">
            Data review is best saved for higher energy states.<br />
            You are safe now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen px-4 py-16 animate-fade-in"
      style={{ backgroundColor: '#0a0a0f', color: '#667788' }}
    >
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-3xl font-thin tracking-[0.3em] uppercase opacity-30 mb-4">●</div>
          <h1 className="text-2xl font-light mb-2" style={{ color: '#c0c8d0' }}>Memory</h1>
          <p className="text-sm font-mono opacity-50">Last {events.length} events</p>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16 font-mono text-sm opacity-40">
            {cleared ? 'Memory cleared.' : 'No events recorded yet.'}
          </div>
        ) : (
          <div className="space-y-1 font-mono text-xs">
            {[...events].reverse().map((evt) => (
              <div
                key={evt.id}
                className={`flex items-start gap-3 py-2 px-3 rounded transition-colors hover:bg-white/[0.02] ${eventClass(evt.type)}`}
              >
                <span className="shrink-0 w-16 opacity-50" style={{ color: '#556677' }}>
                  {formatTimestamp(evt.timestamp)}
                </span>
                <span className="shrink-0 w-28 font-semibold">{evt.type}</span>
                <span className="opacity-70 truncate">
                  {Object.entries(evt.data)
                    .map(([k, v]) => `${k}=${v}`)
                    .join('  ')}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          {events.length > 0 && (
            <button
              onClick={() => {
                clearLogs();
                setEvents([]);
                setCleared(true);
              }}
              className="px-6 py-2 text-xs font-mono uppercase tracking-widest transition-all hover:opacity-80"
              style={{
                backgroundColor: '#111111',
                color: '#667788',
                border: '1px solid #333333',
              }}
            >
              Clear Memory
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TheLedger;
