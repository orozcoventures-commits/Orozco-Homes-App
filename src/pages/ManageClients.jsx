import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Returns a random 4-digit zero-padded string, e.g. '0512' or '3921'.
function generateUniquePin() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

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

const inputStyle = { border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#fff' };

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
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [phone, setPhone]   = useState('');
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
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm"
          style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}>
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
            color:           saving || !name.trim() || !email.trim() ? '#9CA3AF' : '#D4AF37',
            cursor:          saving || !name.trim() || !email.trim() ? 'not-allowed' : 'pointer',
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

function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold shadow-xl"
      style={{ backgroundColor: '#002147', color: '#D4AF37', pointerEvents: 'none', whiteSpace: 'nowrap' }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {message}
    </div>
  );
}

function PinRow({ project, clientName, onCopy, onPinBackfilled }) {
  const [revealed, setRevealed] = useState(false);
  // If the DB row was created without a PIN, generate one and persist it now
  const [pin, setPin] = useState(project.project_pin ?? null);
  const portalUrl = window.location.origin;

  useEffect(() => {
    if (pin) return; // already has a PIN — nothing to do
    const newPin = generateUniquePin();
    supabase
      .from('projects')
      .update({ project_pin: newPin })
      .eq('id', project.id)
      .then(({ error }) => {
        if (!error) {
          setPin(newPin);
          onPinBackfilled?.(project.id, newPin);
        }
      });
  }, [pin, project.id, onPinBackfilled]);

  function handleShare() {
    if (!pin) return;
    const msg = `Hi ${clientName}! You can track your ${project.project_name} progress here: ${portalUrl}. Your 4-digit access code is: ${pin}.`;
    navigator.clipboard.writeText(msg).then(() => onCopy('Copied to clipboard!'));
  }

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl"
      style={{ backgroundColor: '#F9F8F6', border: '1px solid #F0EEE9' }}>

      {/* Project name */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate" style={{ color: '#002147' }}>{project.project_name}</p>
        <p className="text-xs" style={{ color: '#9CA3AF' }}>Project PIN</p>
      </div>

      {/* PIN display + controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* PIN digits */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{ backgroundColor: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.35)' }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span className="text-xs font-bold tracking-[0.2em]"
            style={{ color: '#002147', fontFamily: 'monospace', minWidth: '2.2rem', letterSpacing: revealed ? '0.2em' : '0.12em' }}>
            {pin ? (revealed ? pin : '••••') : '----'}
          </span>
        </div>

        {/* Show / Hide */}
        <button
          onClick={() => setRevealed((v) => !v)}
          className="text-xs px-2.5 py-1.5 rounded-lg focus:outline-none transition-colors"
          style={{ backgroundColor: '#F0EEE9', color: '#6B7280', border: '1px solid #E8E6E1' }}
        >
          {revealed ? 'Hide' : 'Show'}
        </button>

        {/* Share — primary gold action */}
        <button
          onClick={handleShare}
          title={`Copy PIN access message for ${project.project_name}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 focus:outline-none"
          style={{ backgroundColor: '#D4AF37', color: '#002147' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#C9A227'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#D4AF37'; }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Share
        </button>
      </div>
    </div>
  );
}

function ClientRow({ client, projects, onCopy, onPinBackfilled }) {
  const clientProjects = projects.filter((p) => p.managed_client_id === client.id);

  return (
    <div style={{ borderBottom: '1px solid #F3F2EE' }}>
      {/* Client identity */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0"
          style={{ backgroundColor: avatarColor(client.id), fontSize: '0.75rem' }}
        >
          {getInitials(client.full_name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug" style={{ color: '#002147' }}>{client.full_name}</p>
          <p className="text-xs leading-snug" style={{ color: '#6B7280' }}>
            {client.email}{client.phone ? ` · ${client.phone}` : ''}
          </p>
        </div>
      </div>

      {/* Projects grouped under client with gold accent line */}
      <div className="pb-3 px-5">
        {clientProjects.length > 0 ? (
          <div className="pl-3 space-y-1.5" style={{ borderLeft: '2px solid rgba(212,175,55,0.35)' }}>
            {clientProjects.map((p) => (
              <PinRow key={p.id} project={p} clientName={client.full_name} onCopy={onCopy} onPinBackfilled={onPinBackfilled} />
            ))}
          </div>
        ) : (
          <div className="pl-3" style={{ borderLeft: '2px solid #F0EEE9' }}>
            <p className="text-xs py-1" style={{ color: '#C4C0B8' }}>
              No projects yet — use <strong>Create New Project</strong> to add one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ManageClients() {
  const { isAdmin } = useAuth();
  const [clients, setClients]   = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast]       = useState('');
  const toastTimer              = useRef(null);

  function showToast(msg) {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  }
  useEffect(() => () => clearTimeout(toastTimer.current), []);

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
  }

  // Called by PinRow when it backfills a missing PIN into the DB — update local state instantly
  function handlePinBackfilled(projectId, newPin) {
    setProjects((prev) =>
      prev.map((p) => p.id === projectId ? { ...p, project_pin: newPin } : p)
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Toast message={toast} />

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>Admin Tool</p>
          <h2 className="text-2xl font-bold" style={{ color: '#002147' }}>Manage Clients</h2>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Share the 4-digit PIN with your client for instant portal access.
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
              After adding, create a project for this client to generate their PIN.
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
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#F5F4F0', color: '#6B7280' }}>
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
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: '#F5F4F0' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <line x1="23" y1="11" x2="17" y2="11" /><line x1="20" y1="8" x2="20" y2="14" />
              </svg>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#374151' }}>No clients yet</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Click "Add Client" above to get started.</p>
          </div>
        ) : (
          <div>
            {clients.map((client) => (
              <ClientRow key={client.id} client={client} projects={projects} onCopy={showToast} onPinBackfilled={handlePinBackfilled} />
            ))}
          </div>
        )}
      </div>

      {/* Info tip */}
      {clients.length > 0 && (
        <div
          className="mt-4 flex items-start gap-3 px-4 py-3 rounded-xl text-xs"
          style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Click <strong>Share</strong> next to any project PIN to copy a ready-to-paste message with the portal link and access code. Clients use the PIN on the login screen — no account needed.
        </div>
      )}
    </div>
  );
}
