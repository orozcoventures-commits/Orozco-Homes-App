import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// ── Password field with show/hide ─────────────────────────────────────────────
function PasswordField({ label = 'Password', value, onChange, autoComplete = 'current-password' }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label className="block text-xs font-bold mb-2" style={{ color: '#374151' }}>{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder="••••••••"
          autoComplete={autoComplete}
          required
          className="w-full text-sm rounded-xl px-4 py-3 pr-11 focus:outline-none transition-colors duration-150"
          style={{
            border: `1.5px solid ${focused ? '#D4AF37' : '#E8E6E1'}`,
            color: '#002147',
            backgroundColor: '#fff',
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
          style={{ color: '#9CA3AF' }}
          tabIndex={-1}
        >
          {show ? (
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
  );
}

// ── Error banner ──────────────────────────────────────────────────────────────
function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div
      className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm"
      style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {message}
    </div>
  );
}

// ── Submit button ─────────────────────────────────────────────────────────────
function SubmitButton({ loading, disabled, label, loadingLabel }) {
  const inactive = loading || disabled;
  return (
    <button
      type="submit"
      disabled={inactive}
      className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-150 focus:outline-none flex items-center justify-center gap-2"
      style={{
        backgroundColor: inactive ? '#E5E3DF' : '#002147',
        color:           inactive ? '#9CA3AF' : '#D4AF37',
        cursor:          inactive ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => { if (!inactive) e.currentTarget.style.backgroundColor = '#003166'; }}
      onMouseLeave={(e) => { if (!inactive) e.currentTarget.style.backgroundColor = '#002147'; }}
    >
      {loading ? (
        <>
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          {loadingLabel}
        </>
      ) : label}
    </button>
  );
}

// ── Sign-in form ──────────────────────────────────────────────────────────────
function SignInForm() {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label className="block text-xs font-bold mb-2" style={{ color: '#374151' }}>Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          className="w-full text-sm rounded-xl px-4 py-3 focus:outline-none transition-colors duration-150"
          style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#fff' }}
          onFocus={(e) => { e.target.style.borderColor = '#D4AF37'; }}
          onBlur={(e)  => { e.target.style.borderColor = '#E8E6E1'; }}
        />
      </div>
      <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} />
      <ErrorBanner message={error} />
      <SubmitButton
        loading={loading}
        disabled={!email.trim() || !password}
        label="Sign In"
        loadingLabel="Signing in…"
      />
    </form>
  );
}

// ── Create account form (also handles first-admin bootstrap) ──────────────────
function CreateAccountForm({ onSuccess }) {
  const { signup, login, claimFirstAdmin } = useAuth();

  const params      = new URLSearchParams(window.location.search);
  const inviteEmail = params.get('invite') || '';
  const inviteName  = params.get('name')   || '';
  const isInvite    = !!inviteEmail;

  const [name, setName]         = useState(inviteName);
  const [email, setEmail]       = useState(isInvite ? inviteEmail : 'orozcoventures@gmail.com');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [adminSetup, setAdminSetup] = useState(!isInvite);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return; }

    setError('');
    setLoading(true);
    try {
      await signup(email.trim(), password, name.trim());

      if (adminSetup) {
        // Sign in immediately so claimFirstAdmin has an active session
        await login(email.trim(), password);
        const promoted = await claimFirstAdmin();
        if (!promoted) {
          setError('An admin account already exists. You have been signed in as a client.');
        }
        // AuthContext onAuthStateChange fires → App re-renders to the portal automatically
      } else {
        setDone(true);
      }
    } catch (err) {
      setError(err.message || 'Could not create account. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
          style={{ backgroundColor: 'rgba(212,175,55,0.15)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-sm font-semibold" style={{ color: '#002147' }}>Account created!</p>
        <p className="text-xs" style={{ color: '#6B7280' }}>
          Check your email to confirm your address, then sign in using the Sign In tab.
        </p>
        <button
          type="button"
          onClick={onSuccess}
          className="w-full py-3 rounded-xl text-sm font-bold"
          style={{ backgroundColor: '#002147', color: '#D4AF37' }}
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Invite banner */}
      {isInvite && (
        <div
          className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm"
          style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12 19.79 19.79 0 0 1 1.93 3.35 2 2 0 0 1 3.91 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 14.92z" />
          </svg>
          <span>
            You've been invited by <strong>Orozco Homes</strong>. Create your account below to access your project portal.
          </span>
        </div>
      )}

      {/* Full name */}
      <div>
        <label className="block text-xs font-bold mb-2" style={{ color: '#374151' }}>Full name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Carlos Orozco"
          autoComplete="name"
          required
          className="w-full text-sm rounded-xl px-4 py-3 focus:outline-none transition-colors duration-150"
          style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#fff' }}
          onFocus={(e) => { e.target.style.borderColor = '#D4AF37'; }}
          onBlur={(e)  => { e.target.style.borderColor = '#E8E6E1'; }}
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-bold mb-2" style={{ color: '#374151' }}>Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          className="w-full text-sm rounded-xl px-4 py-3 focus:outline-none transition-colors duration-150"
          style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#fff' }}
          onFocus={(e) => { e.target.style.borderColor = '#D4AF37'; }}
          onBlur={(e)  => { e.target.style.borderColor = '#E8E6E1'; }}
        />
      </div>

      {/* Password */}
      <PasswordField
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
      />

      {/* Confirm password */}
      <PasswordField
        label="Confirm password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
      />

      {/* First-admin toggle — hidden for client invites */}
      {!isInvite && <label className="flex items-start gap-3 cursor-pointer select-none">
        <div className="relative mt-0.5 shrink-0">
          <input
            type="checkbox"
            className="sr-only"
            checked={adminSetup}
            onChange={(e) => setAdminSetup(e.target.checked)}
          />
          <div
            className="w-4 h-4 rounded flex items-center justify-center transition-colors"
            style={{
              backgroundColor: adminSetup ? '#002147' : '#fff',
              border: `1.5px solid ${adminSetup ? '#002147' : '#D1D5DB'}`,
            }}
          >
            {adminSetup && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1.5 5 3.5 7.5 8.5 2.5" />
              </svg>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold" style={{ color: '#002147' }}>Set up as admin (contractor)</p>
          <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
            Only works if no admin exists yet. Grants full access to all client projects and tools.
          </p>
        </div>
      </label>}

      <ErrorBanner message={error} />

      <SubmitButton
        loading={loading}
        disabled={!name.trim() || !email.trim() || !password || !confirm}
        label={!isInvite && adminSetup ? 'Create Admin Account' : 'Create Account'}
        loadingLabel="Creating account…"
      />
    </form>
  );
}

// ── PIN Login form ────────────────────────────────────────────────────────────
function PinLoginForm() {
  const { verifyPin } = useAuth();
  const [email, setEmail]   = useState('');
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => { inputRefs[0].current?.focus(); }, []);

  function handleDigit(i, value) {
    const v = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 3) inputRefs[i + 1].current?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs[i - 1].current?.focus();
    }
    if (e.key === 'ArrowLeft' && i > 0) inputRefs[i - 1].current?.focus();
    if (e.key === 'ArrowRight' && i < 3) inputRefs[i + 1].current?.focus();
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      setDigits(pasted.split(''));
      inputRefs[3].current?.focus();
      e.preventDefault();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const pin = digits.join('');
    if (!email.trim() || pin.length < 4) return;
    setError('');
    setLoading(true);
    try {
      await verifyPin(email.trim(), pin);
      // AuthContext sets pinSession → App re-renders to PinClientPortal
    } catch (err) {
      setError(err.message || 'Invalid email or PIN. Please try again.');
      setDigits(['', '', '', '']);
      inputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  }

  const pin = digits.join('');
  const canSubmit = email.trim() && pin.length === 4 && !loading;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Explainer */}
      <div className="px-4 py-3 rounded-xl text-xs"
        style={{ backgroundColor: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#92400E' }}>
        <p className="font-semibold mb-0.5" style={{ color: '#002147' }}>Client PIN Access</p>
        Enter the email address your contractor has on file, then the 4-digit PIN they gave you.
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-bold mb-2" style={{ color: '#374151' }}>Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          className="w-full text-sm rounded-xl px-4 py-3 focus:outline-none transition-colors duration-150"
          style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#fff' }}
          onFocus={(e) => { e.target.style.borderColor = '#D4AF37'; }}
          onBlur={(e)  => { e.target.style.borderColor = '#E8E6E1'; }}
        />
      </div>

      {/* 4-digit PIN boxes */}
      <div>
        <label className="block text-xs font-bold mb-3" style={{ color: '#374151' }}>Project PIN</label>
        <div className="flex gap-3 justify-center" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-14 h-16 text-center text-2xl font-bold rounded-2xl focus:outline-none transition-all duration-150"
              style={{
                border: `2px solid ${d ? '#D4AF37' : '#E8E6E1'}`,
                color: '#002147',
                backgroundColor: d ? 'rgba(212,175,55,0.07)' : '#fff',
                boxShadow: d ? '0 0 0 3px rgba(212,175,55,0.15)' : 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#D4AF37';
                e.target.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.2)';
                e.target.select();
              }}
              onBlur={(e) => {
                if (!d) {
                  e.target.style.borderColor = '#E8E6E1';
                  e.target.style.boxShadow = 'none';
                }
              }}
            />
          ))}
        </div>
      </div>

      <ErrorBanner message={error} />

      <SubmitButton
        loading={loading}
        disabled={!canSubmit}
        label="Access My Project"
        loadingLabel="Verifying PIN…"
      />
    </form>
  );
}

// ── Main Login page ───────────────────────────────────────────────────────────
export default function Login() {
  const hasInvite = !!new URLSearchParams(window.location.search).get('invite');
  const [tab, setTab] = useState(hasInvite ? 'signup' : 'pin');

  const tabStyle = (active) => ({
    flex: 1,
    padding: '0.5rem',
    fontSize: '0.75rem',
    fontWeight: active ? '700' : '500',
    borderRadius: '0.625rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
    backgroundColor: active ? '#002147' : 'transparent',
    color: active ? '#D4AF37' : '#9CA3AF',
    border: 'none',
  });

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F4F0' }}>

      {/* ── Left panel (branding) ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 px-12 py-14"
        style={{ backgroundColor: '#002147' }}
      >
        <div style={{ height: '3px', backgroundColor: '#D4AF37', borderRadius: '2px', width: '48px' }} />

        <div>
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

      {/* ── Right panel (form) ────────────────────────────────────────────── */}
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

          <h2 className="text-2xl font-bold mb-1" style={{ color: '#002147' }}>
            {tab === 'signin' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
            {tab === 'signin' ? 'Sign in to your project portal' : 'Set up your Orozco Homes account'}
          </p>

          {/* Tab switcher */}
          <div className="flex p-1 mb-6 rounded-xl" style={{ backgroundColor: '#EDEBE6' }}>
            <button type="button" style={tabStyle(tab === 'pin')} onClick={() => setTab('pin')}>
              Project PIN
            </button>
            <button type="button" style={tabStyle(tab === 'signin')} onClick={() => setTab('signin')}>
              Sign In
            </button>
            <button type="button" style={tabStyle(tab === 'signup')} onClick={() => setTab('signup')}>
              Create Account
            </button>
          </div>

          {tab === 'pin'    && <PinLoginForm />}
          {tab === 'signin' && <SignInForm />}
          {tab === 'signup' && <CreateAccountForm onSuccess={() => setTab('signin')} />}

          {tab === 'pin' && (
            <p className="text-xs text-center mt-8" style={{ color: '#9CA3AF' }}>
              Your contractor gives you your Project PIN. No account required.
            </p>
          )}
          {tab === 'signin' && (
            <p className="text-xs text-center mt-8" style={{ color: '#9CA3AF' }}>
              Clients: use the <button onClick={() => setTab('pin')} className="underline" style={{ color: '#D4AF37' }}>Project PIN</button> tab instead.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
