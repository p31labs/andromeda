// spaceship-earth/src/components/BugReportButton.tsx
// Live bug reporting — floating button + slide-out form.
// Posts to spaceship-relay /bug-report endpoint.
import React, { useState, useCallback, useRef, useEffect } from 'react';

const RELAY = 'https://spaceship-relay.trimtab-signal.workers.dev';

interface Props {
  room: string;
  sessionId?: string;
}

export function BugReportButton({ room, sessionId }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [flash, setFlash] = useState<'ok' | 'err' | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  // Auto-dismiss flash
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => {
      setFlash(null);
      if (flash === 'ok') setOpen(false);
    }, 1500);
    return () => clearTimeout(t);
  }, [flash]);

  const submit = useCallback(async () => {
    const desc = text.trim();
    if (!desc || sending) return;
    setSending(true);
    try {
      const viewport = `${window.innerWidth}x${window.innerHeight}@${devicePixelRatio}`;
      const res = await fetch(`${RELAY}/bug-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc, room, viewport, sessionId }),
      });
      if (res.ok) {
        setText('');
        setFlash('ok');
      } else {
        setFlash('err');
      }
    } catch {
      setFlash('err');
    } finally {
      setSending(false);
    }
  }, [text, room, sessionId, sending]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  }, [submit]);

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Report a bug"
        style={{
          position: 'fixed',
          bottom: 68,
          right: 8,
          zIndex: 40,
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: open
            ? '1px solid rgba(255,68,102,0.6)'
            : '1px solid rgba(40,60,80,0.3)',
          background: open
            ? 'rgba(255,68,102,0.15)'
            : 'rgba(2,4,6,0.7)',
          backdropFilter: 'blur(8px)',
          color: open ? '#ff4466' : '#4a5a6a',
          fontSize: 16,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          boxShadow: open ? '0 0 12px rgba(255,68,102,0.2)' : 'none',
        }}
      >
        {open ? '\u00d7' : '\u{1f41b}'}
      </button>

      {/* Report form */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 110,
          right: 8,
          zIndex: 40,
          width: 240,
          background: 'linear-gradient(135deg, rgba(2,4,6,0.95), rgba(6,10,16,0.92))',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(40,60,80,0.3)',
          borderRight: '3px solid #ff4466',
          borderRadius: 8,
          padding: 12,
          fontFamily: "'JetBrains Mono', monospace",
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            fontSize: 10,
            letterSpacing: 2,
            color: '#ff4466',
            marginBottom: 8,
            textShadow: '0 0 8px rgba(255,68,102,0.3)',
          }}>
            BUG REPORT
          </div>
          <div style={{ fontSize: 9, color: '#3a4a5a', marginBottom: 8 }}>
            room: {room}
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="What happened?"
            rows={4}
            style={{
              width: '100%',
              background: 'rgba(2,4,6,0.8)',
              border: '1px solid rgba(40,60,80,0.3)',
              borderRadius: 4,
              padding: 8,
              color: '#c8d0dc',
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 8, color: '#2a3a4a' }}>
              {flash === 'ok' ? 'sent!' : flash === 'err' ? 'failed' : '\u2318+Enter to send'}
            </span>
            <button
              onClick={submit}
              disabled={sending || !text.trim()}
              style={{
                background: flash === 'ok'
                  ? 'rgba(78,205,196,0.15)'
                  : flash === 'err'
                  ? 'rgba(255,68,102,0.15)'
                  : 'rgba(78,205,196,0.08)',
                border: `1px solid ${
                  flash === 'ok' ? 'rgba(78,205,196,0.5)'
                  : flash === 'err' ? 'rgba(255,68,102,0.5)'
                  : 'rgba(78,205,196,0.3)'
                }`,
                borderRadius: 4,
                padding: '5px 12px',
                color: flash === 'ok' ? '#4ecdc4' : flash === 'err' ? '#ff4466' : '#4ecdc4',
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                cursor: sending || !text.trim() ? 'default' : 'pointer',
                opacity: sending || !text.trim() ? 0.4 : 1,
                transition: 'all 0.2s',
                letterSpacing: 1,
              }}
            >
              {sending ? 'SENDING...' : flash === 'ok' ? 'SENT' : 'SEND'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
