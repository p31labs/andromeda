// spaceship-earth/src/components/ErrorBoundary.tsx
// Thin wrapper around @p31/shared ErrorBoundary with project-specific styling.
import type { ReactNode } from 'react';
import { ErrorBoundary as SharedErrorBoundary } from '@p31/shared/ui';

function ErrorFallback(error: Error) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000000',
      color: '#c8d0dc',
      fontFamily: "'JetBrains Mono', monospace",
      gap: 16,
      padding: 32,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 32 }}>&#x26A0;</div>
      <h1 style={{ fontSize: 16, letterSpacing: 2, color: '#ff4466' }}>
        SYSTEM ERROR
      </h1>
      <p style={{ fontSize: 12, color: '#64748b', maxWidth: 360, lineHeight: 1.6 }}>
        {error.message}
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 8,
          padding: '10px 24px',
          background: 'rgba(78, 205, 196, 0.1)',
          border: '1px solid rgba(78, 205, 196, 0.4)',
          borderRadius: 6,
          color: '#4ecdc4',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          letterSpacing: 1,
          cursor: 'pointer',
          minHeight: 48,
        }}
      >
        RELOAD
      </button>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <SharedErrorBoundary fallback={ErrorFallback}>
      {children}
    </SharedErrorBoundary>
  );
}
