import { Component } from 'react';

function ErrorScreen({ error, onRetry }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: '#F5F4F0' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-8"
        style={{ backgroundColor: '#fff', border: '1.5px solid #FECACA', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#FEF2F2' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#DC2626' }}>Application Error</p>
            <p className="text-base font-bold" style={{ color: '#002147' }}>Something went wrong</p>
          </div>
        </div>

        {/* Error message */}
        <div
          className="rounded-xl px-4 py-3 mb-6 text-sm font-mono break-words"
          style={{ backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}
        >
          {error?.message || String(error)}
        </div>

        {/* Diagnostic checklist */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>Diagnostic checklist</p>
          <ul className="space-y-2 text-sm" style={{ color: '#374151' }}>
            {[
              'VITE_SUPABASE_URL is set in Netlify → Site Settings → Environment Variables',
              'VITE_SUPABASE_ANON_KEY is set in Netlify → Site Settings → Environment Variables',
              'A new Netlify deploy was triggered after setting the variables',
              'The Supabase project is active (not paused)',
              'Both SQL migrations have been run in Supabase SQL Editor',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span style={{ color: '#D4AF37', marginTop: '2px' }}>•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Stack trace (collapsed) */}
        {error?.stack && (
          <details className="mb-6">
            <summary className="text-xs font-semibold cursor-pointer mb-2" style={{ color: '#9CA3AF' }}>
              Stack trace
            </summary>
            <pre
              className="text-xs rounded-xl p-3 overflow-auto max-h-48"
              style={{ backgroundColor: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}
            >
              {error.stack}
            </pre>
          </details>
        )}

        <button
          onClick={onRetry}
          className="w-full py-3 rounded-xl text-sm font-bold"
          style={{ backgroundColor: '#002147', color: '#D4AF37' }}
        >
          Reload app
        </button>
      </div>
    </div>
  );
}

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught render error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorScreen
          error={this.state.error}
          onRetry={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}
