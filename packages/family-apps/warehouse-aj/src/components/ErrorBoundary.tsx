// Copied from culinary-matria, converted from Tailwind to inline styles
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
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconContainer}>
              <span style={styles.icon}>⚠️</span>
            </div>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.description}>
              The app encountered an error. Try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={styles.button}
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f1115',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    backgroundColor: '#161920',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
  },
  iconContainer: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px auto',
  },
  icon: {
    fontSize: '32px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#fff',
  },
  description: {
    fontSize: '14px',
    color: '#9ca3af',
    marginBottom: '24px',
  },
  button: {
    padding: '12px 24px',
    borderRadius: '8px',
    backgroundColor: '#5DCAA5',
    color: '#0f1115',
    border: 'none',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};

export default ErrorBoundary;
