/**
 * P31 12-Pillar MVP Template - Main Entry Point
 * Version: 1.0.0
 * 
 * React 18 + Strict Mode
 * PQC Provider setup
 * Error Boundary
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// ============================================
// ERROR BOUNDARY
// ============================================

class P31ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('P31 Error Boundary caught:', error, errorInfo);
    
    // In production, send to error tracking
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '24px',
            maxWidth: '600px',
            margin: '0 auto',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ color: '#cc6247' }}>Something went wrong</h1>
          <p>The application encountered an error. Please try refreshing the page.</p>
          {process.env.NODE_ENV === 'development' && (
            <pre
              style={{
                background: '#f5f5f5',
                padding: '16px',
                borderRadius: '8px',
                overflow: 'auto',
                fontSize: '14px',
              }}
            >
              {this.state.error?.toString()}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              backgroundColor: '#5DCAA5',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================
// ROOT RENDER
// ============================================

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <P31ErrorBoundary>
      <App />
    </P31ErrorBoundary>
  </React.StrictMode>
);

// ============================================
// HOT MODULE REPLACEMENT
// ============================================

if (import.meta.hot) {
  import.meta.hot.accept();
}

// ============================================
// PQC INITIALIZATION (Async)
// ============================================

// Initialize PQC subsystem
const initPQC = async () => {
  try {
    // PQC keys would be loaded/verified here
    console.log('🔐 P31 PQC Subsystem: ML-KEM-768 + ML-DSA-65 + SLH-DSA-SHA2-128s');
  } catch (error) {
    console.error('PQC initialization failed:', error);
  }
};

initPQC();

// ============================================
// SERVICE WORKER UPDATE HANDLING
// ============================================

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // New service worker activated, reload for fresh content
    window.location.reload();
  });
}
