import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ['#1B4F6B', '#2D7DA0', '#374151', '#3B2F1E', '#1E3A5F', '#1A3A2A'];
function avatarColor(id) {
  let h = 0;
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const inputStyle = {
  border: '1.5px solid #E8E6E1',
  color: '#002147',
  backgroundColor: '#fff',
};

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-bold mb-2" style={{ color: '#374151' }}>
        {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function StyledInput({ value, onChange, placeholder, type = 'text', autoComplete }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className="w-full text-sm rounded-xl px-4 py-3 focus:outline-none transition-colors duration-150"
      style={{ ...inputStyle, borderColor: focused ? '#D4AF37' : '#E8E6E1' }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function AddClientForm({ onAdded }) {
  const { user } = useAuth();
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setError('');
    setSaving(true);
    const { data, error: insertError } = await supabase
      .from('clients')
      .insert({ full_name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || null, created_by: user?.id })
      .select()
      .single();
    setSaving(false);
    if (insertError) { setError(insertError.message); return; }
    setName(''); setEmail(''); setPhone('');
    onAdded(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6" noValidate>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full Name" required>
          <StyledInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Maria Johnson" autoComplete="name" />
        </Field>
        <Field label="Email Address" required>
          <StyledInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@example.com" autoComplete="email" />
        </Field>
      </div>
      <Field label="Phone Number">
        <StyledInput type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000" autoComplete="tel" />
      </Field>

      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={saving || !name.trim() || !email.trim()}
          className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 focus:outline-none flex items-center gap-2"
          style={{
            backgroundColor: saving || !name.trim() || !email.trim() ? '#E5E3DF' : '#002147',
            color: saving || !name.trim() || !email.trim() ? '#9CA3AF' : '#D4AF37',
            cursor: saving || !name.trim() || !email.trim() ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => { if (!saving && name.trim() && email.trim()) e.currentTarget.style.backgroundColor = '#003166'; }}
          onMouseLeave={(e) => { if (!saving && name.trim() && email.trim()) e.currentTarget.style.backgroundColor = '#002147'; }}
        >
          {saving ? (
            <>
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              Saving…
            </>
          ) : 'Add Client'}
        </button>
      </div>
    </form>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 focus:outline-none shrink-0"
      style={{
        backgroundColor: copied ? '#ECFDF5' : '#F5F4F0',
        color: copied ? '#059669' : '#374151',
        border: `1px solid ${copied ? '#A7F3D0' : '#E8E6E1'}`,
      }}
      title="Copy invite link"
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Copy Invite Link
        </>
      )}
    </button>
  );
}

// Sends a Supabase magic-link email via the built-in Auth email service.
// Uses signInWithOtp (anon-key safe) with shouldCreateUser:true so Supabase
// creates the auth user and emails them a one-click login link.
// The client's full_name is stored in user_metadata so the profile trigger
// picks it up on first sign-in.
function SendMagicLinkButton({ client }) {
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [errMsg, setErrMsg] = useState('');

  async function handleSend() {
    setStatus('sending');
    setErrMsg('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: client.email,
        options: {
          shouldCreateUser: true,
          data: { full_name: client.full_name },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      setStatus('sent');
      setTimeout(() => setStatus('idle'), 3500);
    } catch (err) {
      setErrMsg(err.message || 'Failed to send');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  }

  const cfg = {
    idle: {
      bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'Send Magic Link',
      icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
    },
    sending: {
      bg: '#EFF6FF', color: '#93C5FD', border: '#BFDBFE', label: 'Sending…',
      icon: <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>,
    },
    sent: {
      bg: '#ECFDF5', color: '#059669', border: '#A7F3D0', label: 'Email Sent!',
      icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    },
    error: {
      bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', label: errMsg || 'Failed',
      icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    },
  }[status];

  return (
    <button
      onClick={handleSend}
      disabled={status === 'sending'}
      title="Send magic-link email via Supabase Auth"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 focus:outline-none shrink-0"
      style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, cursor: status === 'sending' ? 'not-allowed' : 'pointer' }}
    >
      {cfg.icon}
      <span className="hidden sm:inline">{cfg.label}</span>
    </button>
  );
}

function PinBadge({ pin }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!pin) return null;
  function handleCopy() {
    navigator.clipboard.writeText(pin).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg"
        style={{ backgroundColor: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span className="text-xs font-bold tracking-[0.18em]" style={{ color: '#002147', fontFamily: 'monospace' }}>
          {revealed ? pin : '••••'}
        </span>
      </div>
      <button onClick={() => setRevealed((v) => !v)}
        className="text-xs px-2 py-1 rounded-lg transition-colors focus:outline-none"
        style={{ backgroundColor: '#F5F4F0', color: '#6B7280' }}>
        {revealed ? 'Hide' : 'Show'}
      </button>
      {revealed && (
        <button onClick={handleCopy}
          className="text-xs px-2 py-1 rounded-lg transition-colors focus:outline-none"
          style={{ backgroundColor: copied ? '#ECFDF5' : '#F5F4F0', color: copied ? '#059669' : '#6B7280' }}>
          {copied ? '✓' : 'Copy'}
        </button>
      )}
    </div>
  );
}

function ClientRow({ client, projects }) {
  const inviteUrl = `${window.location.origin}?invite=${encodeURIComponent(client.email)}&name=${encodeURIComponent(client.full_name)}`;
  const clientProjects = projects.filter((p) => p.managed_client_id === client.id);
  return (
    <div style={{ borderBottom: '1px solid #F3F2EE' }}>
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0"
          style={{ backgroundColor: avatarColor(client.id), fontSize: '0.75rem' }}>
          {getInitials(client.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: '#002147' }}>{client.full_name}</p>
          <p className="text-xs truncate" style={{ color: '#6B7280' }}>{client.email}{client.phone ? ` · ${client.phone}` : ''}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SendMagicLinkButton client={client} />
          <CopyButton text={inviteUrl} />
        </div>
      </div>
      {/* Project PINs */}
      {clientProjects.length > 0 && (
        <div className="px-5 pb-3 space-y-2">
          {clientProjects.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl"
              style={{ backgroundColor: '#F9F8F6', border: '1px solid #F0EEE9' }}>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: '#002147' }}>{p.project_name}</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Project PIN</p>
              </div>
              <PinBadge pin={p.project_pin} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ManageClients() {
  const { isAdmin } = useAuth();
  const [clients, setClients]   = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchClients = useCallback(async () => {
    const [{ data: clientData }, { data: projectData }] = await Promise.all([
      supabase
        .from('clients')
        .select('id, full_name, email, phone, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('projects')
        .select('id, project_name, project_pin, managed_client_id')
        .order('project_name'),
    ]);
    setClients(clientData ?? []);
    setProjects(projectData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <p className="text-sm font-semibold" style={{ color: '#DC2626' }}>Access denied. Admin only.</p>
      </div>
    );
  }

  function handleAdded(newClient) {
    setClients((prev) => [newClient, ...prev]);
    setShowForm(false);
    // Auto-send magic link on new client creation — non-blocking, failure is silent
    supabase.auth.signInWithOtp({
      email: newClient.email,
      options: {
        shouldCreateUser: true,
        data: { full_name: newClient.full_name },
        emailRedirectTo: window.location.origin,
      },
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>Admin Tool</p>
          <h2 className="text-2xl font-bold" style={{ color: '#002147' }}>Manage Clients</h2>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Add clients and share their invite link so they can create their account.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 focus:outline-none"
          style={{ backgroundColor: showForm ? '#F5F4F0' : '#002147', color: showForm ? '#002147' : '#D4AF37' }}
          onMouseEnter={(e) => { if (!showForm) e.currentTarget.style.backgroundColor = '#003166'; }}
          onMouseLeave={(e) => { if (!showForm) e.currentTarget.style.backgroundColor = '#002147'; }}
        >
          {showForm ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              Cancel
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add Client
            </>
          )}
        </button>
      </div>

      {/* Add client form */}
      {showForm && (
        <div
          className="rounded-2xl mb-6"
          style={{ backgroundColor: '#fff', border: '1.5px solid #D4AF37', boxShadow: '0 2px 12px rgba(0,33,71,0.06)' }}
        >
          <div className="px-6 pt-5 pb-1">
            <p className="text-sm font-bold" style={{ color: '#002147' }}>New Client</p>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
              A magic-link email will be sent automatically via Supabase Auth.
            </p>
          </div>
          <AddClientForm onAdded={handleAdded} />
        </div>
      )}

      {/* Clients list */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.06)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #F3F2EE' }}>
          <p className="text-sm font-bold" style={{ color: '#002147' }}>
            All Clients
            {!loading && (
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F5F4F0', color: '#6B7280' }}>
                {clients.length}
              </span>
            )}
          </p>
        </div>

        {loading ? (
          <div className="px-5 py-8 flex items-center justify-center gap-3">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            <span className="text-sm" style={{ color: '#9CA3AF' }}>Loading clients…</span>
          </div>
        ) : clients.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#F5F4F0' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <line x1="23" y1="11" x2="17" y2="11" /><line x1="20" y1="8" x2="20" y2="14" />
              </svg>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#374151' }}>No clients yet</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Click "Add Client" above to add your first client.</p>
          </div>
        ) : (
          <div>
            {clients.map((client) => (
              <ClientRow key={client.id} client={client} projects={projects} />
            ))}
          </div>
        )}
      </div>

      {/* Invite info box */}
      {clients.length > 0 && (
        <div
          className="mt-4 flex items-start gap-3 px-4 py-3 rounded-xl text-xs"
          style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <strong>Send Magic Link</strong> emails a one-click login directly from Supabase — no extra accounts needed. The client clicks the link and is signed in instantly. You can also <strong>Copy Invite Link</strong> to share manually.
        </div>
      )}
    </div>
  );
}
