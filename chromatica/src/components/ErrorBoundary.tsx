/**
 * ErrorBoundary - Arthritis-Optimized Error Handling
 * Large buttons, clear text, voice feedback
 */

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App error:', error, errorInfo);
    // Voice announcement for accessibility
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        'An error occurred. The app will refresh. Please wait.'
      );
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#0f1115',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
          }}
          role="alert"
          aria-live="assertive"
        >
          <div
            style={{
              backgroundColor: '#161920',
              border: '2px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '20px',
              padding: '48px',
              maxWidth: '500px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '96px', // Arthritis-optimized
                height: '96px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto',
              }}
            >
              <span style={{ fontSize: '48px' }}>⚠️</span>
            </div>
            <h2
              style={{
                fontSize: '32px', // Arthritis-optimized: 32px
                fontWeight: 'bold',
                marginBottom: '16px',
                color: '#fff',
              }}
            >
              Something went wrong
            </h2>
            <p
              style={{
                fontSize: '20px', // Arthritis-optimized: 20px+
                color: '#9ca3af',
                marginBottom: '32px',
                lineHeight: 1.5,
              }}
            >
              The app encountered an error. Don't worry - your work is saved.
              Try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '24px 48px', // Arthritis-optimized: 96px touch target
                borderRadius: '16px',
                backgroundColor: '#5DCAA5',
                color: '#0f1115',
                border: 'none',
                fontSize: '24px', // Arthritis-optimized
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                minHeight: '72px',
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
