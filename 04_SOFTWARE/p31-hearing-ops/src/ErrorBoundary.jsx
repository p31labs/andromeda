import { Component } from 'react'

export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    try {
      localStorage.setItem('p31_hearing_ops_crash', JSON.stringify({
        message: error.message,
        stack: error.stack,
        time: new Date().toISOString(),
      }))
    } catch {
      /* storage unavailable */
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f1115',
          color: '#d8d6d0',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌀</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Something came loose</h1>
          <p style={{ color: '#8b8a86', maxWidth: '400px', marginBottom: '2rem', lineHeight: 1.5 }}>
            The app hit an unexpected state. Your prep data is saved locally.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 2rem',
              background: '#d8d6d0',
              color: '#0f1115',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
