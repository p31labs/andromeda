import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    try {
      const log = JSON.parse(localStorage.getItem('phos_event_log') || '[]');
      log.push({
        id: Date.now().toString(),
        type: 'ERROR',
        timestamp: new Date().toISOString(),
        data: { message: error.message, stack: error.stack?.slice(0, 500) || '' },
      });
      localStorage.setItem('phos_event_log', JSON.stringify(log.slice(-50)));
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{ backgroundColor: '#000000', color: '#888888' }}
        >
          <div className="max-w-md px-8 text-center">
            <div className="mb-10 text-6xl font-thin tracking-widest uppercase opacity-30">X</div>
            <p className="text-xl font-mono leading-relaxed mb-6">
              System encountered an unrecoverable error.<br />
              The calcium cage is stable.<br />
              Reload the page to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-12 py-4 text-base font-mono uppercase tracking-widest transition-all hover:opacity-80"
              style={{
                backgroundColor: '#111111',
                color: '#888888',
                border: '1px solid #333333',
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
