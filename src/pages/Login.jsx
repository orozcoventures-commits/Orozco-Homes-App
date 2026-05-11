import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      // AuthContext listener updates state; App re-renders automatically
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: '#F5F4F0' }}
    >
      {/* ── Left panel (branding) ─────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 px-12 py-14"
        style={{ backgroundColor: '#002147' }}
      >
        {/* Top gold accent */}
        <div style={{ height: '3px', backgroundColor: '#D4AF37', borderRadius: '2px', width: '48px' }} />

        <div>
          {/* Logo */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-lg"
            style={{ backgroundColor: '#D4AF37' }}
          >
            <span className="font-extrabold text-xl" style={{ color: '#002147' }}>OH</span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-3" style={{ letterSpacing: '0.02em' }}>
            Orozco Homes
          </h1>
          <p className="text-base font-light mb-8" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: '1.7' }}>
            Your renovation, tracked.<br />
            Sign in to view your project updates, progress photos, and approvals — all in one place.
          </p>

          {/* Feature list */}
          <ul className="space-y-4">
            {[
              'Real-time project updates',
              'Progress photo log',
              'Digital change order approvals',
              'Direct contractor messaging',
            ].map((f) => (
              <li key={f} className="flex items-center gap-3">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(212,175,55,0.2)' }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1.5 5 3.5 7.5 8.5 2.5" />
                  </svg>
                </span>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          © {new Date().getFullYear()} Orozco Homes. All rights reserved.
        </p>
      </div>

      {/* ── Right panel (form) ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow"
              style={{ backgroundColor: '#D4AF37' }}
            >
              <span className="font-extrabold text-sm" style={{ color: '#002147' }}>OH</span>
            </div>
            <span className="font-bold text-lg" style={{ color: '#002147', letterSpacing: '0.03em' }}>
              Orozco Homes
            </span>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: '#002147' }}>Welcome back</h2>
          <p className="text-sm mb-8" style={{ color: '#6B7280' }}>
            Sign in to your project portal
          </p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: '#374151' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full text-sm rounded-xl px-4 py-3 focus:outline-none transition-colors duration-150"
                style={{
                  border: '1.5px solid #E8E6E1',
                  color: '#002147',
                  backgroundColor: '#fff',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#D4AF37'; }}
                onBlur={(e)  => { e.target.style.borderColor = '#E8E6E1'; }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: '#374151' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full text-sm rounded-xl px-4 py-3 pr-11 focus:outline-none transition-colors duration-150"
                  style={{
                    border: '1.5px solid #E8E6E1',
                    color: '#002147',
                    backgroundColor: '#fff',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#D4AF37'; }}
                  onBlur={(e)  => { e.target.style.borderColor = '#E8E6E1'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
                  style={{ color: '#9CA3AF' }}
                  tabIndex={-1}
                >
                  {showPw ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div
                className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-150 focus:outline-none flex items-center justify-center gap-2"
              style={{
                backgroundColor: loading || !email.trim() || !password ? '#E5E3DF' : '#002147',
                color:           loading || !email.trim() || !password ? '#9CA3AF' : '#D4AF37',
                cursor:          loading || !email.trim() || !password ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!loading && email.trim() && password)
                  e.currentTarget.style.backgroundColor = '#003166';
              }}
              onMouseLeave={(e) => {
                if (!loading && email.trim() && password)
                  e.currentTarget.style.backgroundColor = '#002147';
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-xs text-center mt-8" style={{ color: '#9CA3AF' }}>
            Don't have an account? Contact your Orozco Homes contractor to receive your login credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
