import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled application error', error, errorInfo)
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#000', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 420, background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💎</div>
          <h1 style={{ margin: '0 0 8px', color: '#f5f5f5', fontSize: 24 }}>Something went wrong</h1>
          <p style={{ margin: '0 0 20px', color: '#a3a3a3', lineHeight: 1.5 }}>
            The app hit an unexpected error. Reload the page or head back to the discovery feed.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => window.location.reload()}
              style={{ flex: 1, background: '#7c3aed', border: 'none', borderRadius: 10, padding: '12px 16px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
            >
              Reload
            </button>
            <Link
              to="/"
              style={{ flex: 1, textAlign: 'center', background: '#111', border: '1px solid #333', borderRadius: 10, padding: '12px 16px', color: '#a3a3a3', textDecoration: 'none', fontWeight: 600 }}
            >
              Go home
            </Link>
          </div>
        </div>
      </div>
    )
  }
}
