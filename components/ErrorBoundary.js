// components/ErrorBoundary.js
import { Component } from 'react';

/**
 * Wraps the whole admin panel. If anything unexpected throws while rendering
 * (a malformed API response, a network hiccup mid-update, etc.), this shows a
 * friendly recoverable screen instead of the page silently going blank.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Admin panel error caught by boundary:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0b0d12', fontFamily: 'system-ui, sans-serif', padding: 20,
        }}>
          <div style={{ textAlign: 'center', maxWidth: 380 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
              Something went wrong
            </div>
            <div style={{ fontSize: 12.5, color: '#9aa0aa', marginBottom: 20, lineHeight: 1.6 }}>
              A temporary hiccup interrupted this page — nothing was lost. Try again, or reload the page if it keeps happening.
            </div>
            <button
              onClick={this.handleReset}
              style={{
                background: '#FF6A00', color: '#fff', border: 'none', padding: '10px 20px',
                borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginRight: 8,
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'rgba(255,255,255,.08)', color: '#fff', border: 'none', padding: '10px 20px',
                borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
