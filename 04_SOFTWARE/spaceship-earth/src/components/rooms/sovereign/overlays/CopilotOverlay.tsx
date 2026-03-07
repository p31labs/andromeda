// CopilotOverlay — Full-screen Centaur Engine chat room.
// Direct LLM fetch via useCentaur. Babel compilation via jitterbugCompiler.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useCentaur } from '../../../../hooks/useCentaur';
import type { CentaurMessage } from '../../../../hooks/useCentaur';
import { useSovereignStore } from '../../../../sovereign/useSovereignStore';
import { compileCentaurCode, moduleRegistry } from '../../../../services/jitterbugCompiler';

const ACCENT = '#00FFFF';

const fullScreen: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  fontFamily: "'Space Mono', monospace",
  color: '#00FFFF',
  overflow: 'hidden',
  background: '#000000',
};

// ── Status badge colors ──
const STATUS_COLORS: Record<string, string> = {
  IDLE: '#7DDFB6',
  GENERATING: '#FFD700',
  COMPILING: '#00FFFF',
  ERROR: '#FF4444',
  SUCCESS: '#7DDFB6',
};

export function CopilotOverlay() {
  const { executePrompt, clearHistory, messagesRef, status } = useCentaur();
  const centaurStatus = useSovereignStore((s) => s.centaurStatus);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<CentaurMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [compileResult, setCompileResult] = useState<string | null>(null);
  const [lastCompiledComponent, setLastCompiledComponent] = useState<React.ComponentType | null>(null);
  const dynamicSlots = useSovereignStore((s) => s.dynamicSlots);
  const mountToSlot = useSovereignStore((s) => s.mountToSlot);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync messages from ref for rendering
  const syncMessages = useCallback(() => {
    setMessages([...messagesRef.current]);
  }, [messagesRef]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const hasKey = (() => {
    try { return !!localStorage.getItem('p31_llm_key'); } catch { return false; }
  })();

  const handleSend = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt) return;
    setInput('');
    setError(null);
    syncMessages();
    try {
      await executePrompt(prompt);
      syncMessages();
    } catch (err) {
      setError((err as Error).message);
      syncMessages();
    }
  }, [input, executePrompt, syncMessages]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleCompile = useCallback((code: string) => {
    try {
      useSovereignStore.getState().setCentaurStatus('COMPILING');
      const result = compileCentaurCode(code);
      if (result) {
        const name = result.displayName ?? result.name ?? 'Component';
        setCompileResult(`Compiled: ${name}`);
        setLastCompiledComponent(result);
        useSovereignStore.getState().setCentaurStatus('SUCCESS', 'Module compiled');
      }
    } catch (err) {
      setCompileResult(`Error: ${(err as Error).message}`);
      setLastCompiledComponent(null);
      useSovereignStore.getState().setCentaurStatus('ERROR', (err as Error).message.slice(0, 80));
    }
  }, []);

  const EMPTY_SLOTS = [2, 3, 6, 8, 9] as const;

  const handleMount = useCallback((slot: number) => {
    if (!lastCompiledComponent) return;
    const name = lastCompiledComponent.displayName ?? lastCompiledComponent.name ?? `Slot${slot}`;
    moduleRegistry.set(`SLOT_${slot}`, lastCompiledComponent);
    mountToSlot(slot, name);
    setCompileResult(`Mounted to Slot ${slot}: ${name}`);
    setLastCompiledComponent(null);
  }, [lastCompiledComponent, mountToSlot]);

  const handleClear = useCallback(() => {
    clearHistory();
    setMessages([]);
    setError(null);
    setCompileResult(null);
    setLastCompiledComponent(null);
  }, [clearHistory]);

  const statusColor = STATUS_COLORS[centaurStatus] ?? ACCENT;

  return (
    <div style={fullScreen}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(0,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 18, fontWeight: 700, letterSpacing: '0.08em',
            color: ACCENT, textShadow: `0 0 12px ${ACCENT}44, 0 0 24px ${ACCENT}22`,
          }}>
            CENTAUR ENGINE
          </span>
          <span style={{
            fontSize: 13, padding: '4px 12px',
            border: `1px solid ${statusColor}44`,
            borderRadius: 6, color: statusColor,
            textShadow: `0 0 8px ${statusColor}44`,
            animation: centaurStatus === 'GENERATING' ? 'lockPulse 1.5s ease-in-out infinite' : 'none',
          }}>
            {centaurStatus}
          </span>
        </div>
        <button type="button" onClick={handleClear} className="glass-btn" style={{
          padding: '12px 16px', fontSize: 16, color: 'rgba(0,255,255,0.3)', letterSpacing: 1,
          minHeight: '48px',
          minWidth: '48px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          CLEAR
        </button>
      </div>

      {/* No key warning */}
      {!hasKey && (
        <div style={{
          padding: '10px 16px', fontSize: 13,
          color: '#FF4444', background: 'rgba(255,68,68,0.06)',
          borderBottom: '1px solid rgba(255,68,68,0.1)',
          textShadow: '0 0 6px rgba(255,68,68,0.3)',
        }}>
          No API key set. Switch to 2D Dev Menu to add your key.
        </div>
      )}

      {/* Message area */}
      <div ref={scrollRef} style={{
        flex: 1, overflow: 'auto', padding: '12px 16px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {messages.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', flex: 1, gap: 8, opacity: 0.3,
          }}>
            <div style={{ fontSize: 32 }}>&#x2699;</div>
            <div style={{ fontSize: 15, letterSpacing: 2, textShadow: `0 0 8px ${ACCENT}44` }}>vibe code &gt; drop module</div>
            <div style={{ fontSize: 13, maxWidth: 320, textAlign: 'center', lineHeight: 1.7, color: 'rgba(0,255,255,0.4)' }}>
              Describe a React component. The Centaur will generate it and you can compile it into an empty slot.
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={`${msg.ts}-${i}`} style={{
            display: 'flex', flexDirection: 'column', gap: 4,
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              fontSize: 11, letterSpacing: 1.5,
              color: msg.role === 'user' ? 'rgba(0,255,255,0.35)' : `${ACCENT}66`,
              textShadow: msg.role === 'user' ? '0 0 4px rgba(0,255,255,0.2)' : `0 0 4px ${ACCENT}22`,
            }}>
              {msg.role === 'user' ? 'YOU' : 'CENTAUR'}
            </div>
            <div className="glass-card" style={{
              padding: '12px 16px', maxWidth: '85%',
              borderLeft: msg.role === 'assistant' ? `2px solid ${ACCENT}44` : 'none',
              borderRight: msg.role === 'user' ? '2px solid rgba(0,255,255,0.15)' : 'none',
            }}>
              {msg.role === 'assistant' ? (
                <>
                  <pre style={{
                    margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    fontSize: 13, lineHeight: 1.7, color: '#00FFFF',
                    fontFamily: "'Space Mono', monospace",
                    textShadow: '0 0 4px rgba(0,255,255,0.2)',
                  }}>
                    {msg.content}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCompile(msg.content)}
                    className="glass-btn"
                    style={{
                      marginTop: 8, padding: '12px 16px', fontSize: 16,
                      color: ACCENT, letterSpacing: 1,
                      border: `1px solid ${ACCENT}33`,
                      minHeight: '48px',
                      minWidth: '48px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    COMPILE & MOUNT
                  </button>
                </>
              ) : (
                <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#00FFFF', textShadow: '0 0 4px rgba(0,255,255,0.2)' }}>
                  {msg.content}
                </div>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div style={{
            fontSize: 13, color: '#FF4444', padding: '10px 14px',
            background: 'rgba(255,68,68,0.06)', borderRadius: 6,
            textShadow: '0 0 6px rgba(255,68,68,0.3)',
          }}>
            {error}
          </div>
        )}

        {compileResult && (
          <div style={{
            fontSize: 13, padding: '10px 14px', borderRadius: 6,
            color: compileResult.startsWith('Error') ? '#FF4444' : '#00FFFF',
            background: compileResult.startsWith('Error') ? 'rgba(255,68,68,0.06)' : 'rgba(0,255,255,0.06)',
            textShadow: compileResult.startsWith('Error') ? '0 0 6px rgba(255,68,68,0.3)' : '0 0 6px rgba(0,255,255,0.3)',
          }}>
            {compileResult}
          </div>
        )}

        {/* Mount target selector — shown after successful compile */}
        {lastCompiledComponent && (
          <div className="glass-card" style={{
            padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8,
            border: `1px solid ${ACCENT}22`,
          }}>
            <div style={{
              fontSize: 14, fontWeight: 700, letterSpacing: '0.1em',
              color: ACCENT, textShadow: `0 0 8px ${ACCENT}44`,
            }}>
              SELECT MOUNT TARGET
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {EMPTY_SLOTS.map(slot => {
                const occupied = !!dynamicSlots[slot];
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => handleMount(slot)}
                    className="glass-btn"
                    style={{
                      padding: '12px 16px', fontSize: 16, letterSpacing: 1,
                      color: occupied ? 'rgba(0,255,255,0.25)' : ACCENT,
                      border: `1px solid ${occupied ? 'rgba(0,255,255,0.08)' : `${ACCENT}33`}`,
                      opacity: occupied ? 0.4 : 1,
                      minHeight: '48px',
                      minWidth: '48px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={occupied ? `Slot ${slot}: ${dynamicSlots[slot]?.name ?? 'occupied'}` : `Mount to Slot ${slot}`}
                  >
                    SLOT {slot}{occupied ? ' *' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid rgba(0,255,255,0.06)',
        display: 'flex', gap: 8, alignItems: 'flex-end',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe a component..."
          className="glass-input"
          rows={2}
          style={{ flex: 1, fontSize: 14, resize: 'none' }}
          disabled={centaurStatus === 'GENERATING' || !hasKey}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={centaurStatus === 'GENERATING' || !input.trim() || !hasKey}
          className="glass-btn"
          style={{
            padding: '12px 16px', fontSize: 16, letterSpacing: 1,
            color: ACCENT, border: `1px solid ${ACCENT}33`,
            opacity: (centaurStatus === 'GENERATING' || !input.trim() || !hasKey) ? 0.3 : 1,
            minHeight: '48px',
            minWidth: '48px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          SEND
        </button>
      </div>
    </div>
  );
}
