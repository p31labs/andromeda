import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAtmosphere } from './AtmosphereProvider';
import { ingestChaos, getChaosLog, type ChaosEntry } from '../lib/ChaosVault';

const BUFFER_PLACEHOLDERS = [
  'Drop the weight here. No judgment.',
  'Empty your mind. This stays local and encrypted.',
  'Write what you cannot say. It is safe here.',
  'Chaos in. Clarity out. All data stays on this device.',
];

export default function TheBuffer() {
  const { spoons, grayRock } = useAtmosphere();
  const [text, setText] = useState('');
  const [log, setLog] = useState<ChaosEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [placeholder] = useState(
    () => BUFFER_PLACEHOLDERS[Math.floor(Math.random() * BUFFER_PLACEHOLDERS.length)]
  );

  useEffect(() => {
    getChaosLog().then((entries) => {
      setLog(entries);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (spoons <= 2 && !grayRock && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [spoons, grayRock]);

  const handleIngest = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    await ingestChaos(trimmed, spoons);
    setText('');

    const updated = await getChaosLog();
    setLog(updated);
  }, [text, spoons]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      handleIngest();
    }
  };

  const getTextareaStyle = () => {
    if (grayRock || spoons === 0) {
      return 'bg-[#111111] text-gray-500 placeholder-gray-700 border-none resize-none';
    }
    if (spoons <= 2) {
      return 'bg-blue-950/20 text-blue-50 placeholder-blue-300/40 border border-blue-500/10 resize-none shadow-[0_0_30px_rgba(59,130,246,0.08)]';
    }
    return 'bg-white/5 text-white placeholder-white/30 border border-white/10 resize-none';
  };

  const getContainerStyle = () => {
    if (grayRock || spoons === 0) {
      return 'border-gray-800';
    }
    if (spoons <= 2) {
      return 'border-blue-500/10 bg-blue-950/10';
    }
    return 'border-white/5 bg-black/20';
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 animate-fade-in mt-8">
      {/* Chaos Ingestion */}
      <div className={`rounded-2xl border p-6 transition-all duration-700 ${getContainerStyle()}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-mono uppercase tracking-widest opacity-60">
            Sanctuary Buffer
          </h2>
          <span className="text-[10px] font-mono opacity-40">
            {spoons <= 2 ? 'Auto-save on blur' : 'Shift+Enter to save'}
          </span>
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleIngest}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={5}
          className={`w-full p-4 text-sm md:text-base leading-relaxed outline-none transition-all duration-500 rounded-xl ${getTextareaStyle()}`}
          disabled={grayRock || spoons === 0}
        />

        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] font-mono opacity-30">
            {text.length > 0 ? `${text.length} chars — encrypted local storage` : 'Encrypted local vault'}
          </span>
          {text.trim().length > 0 && (
            <button
              onClick={handleIngest}
              className={`text-[11px] font-mono uppercase tracking-wider px-4 py-1.5 rounded-full transition-all border
                ${grayRock || spoons === 0
                  ? 'border-gray-800 text-gray-600'
                  : spoons <= 2
                    ? 'border-blue-400/30 text-blue-300 hover:bg-blue-400/10'
                    : 'border-white/20 text-white/70 hover:bg-white/10'
                }`}
            >
              Store
            </button>
          )}
        </div>
      </div>

      {/* Chaos Log */}
      {loaded && log.length > 0 && (
        <div className="mt-10">
          <h3 className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-4 text-center">
            Prior Chaos — {log.length} {log.length === 1 ? 'entry' : 'entries'}
          </h3>
          <div className="space-y-2">
            {log.map((entry) => (
              <div
                key={entry.id}
                className="group flex items-start gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 opacity-40 hover:opacity-60"
              >
                <div className="shrink-0 text-[10px] font-mono leading-5 opacity-40 w-14 text-right">
                  {formatTime(entry.timestamp)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-relaxed truncate
                    ${spoons <= 2 && !grayRock ? 'text-blue-200/60' : 'text-gray-400/60'}
                  `}>
                    {entry.chaos}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-mono opacity-30">
                      {formatDate(entry.timestamp)}
                    </span>
                    <span className="text-[9px] font-mono opacity-20">
                      spoons {entry.spoons}/5
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loaded && log.length === 0 && (
        <p className="text-center text-xs font-mono opacity-20 mt-10">
          No chaos logged yet. This vault is empty and waiting.
        </p>
      )}
    </div>
  );
}
