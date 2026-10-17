import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { STAGES } from '../utils/projectStages';

// Returns a random 4-digit zero-padded string, e.g. '0512' or '3921'.
// Treated strictly as a string so leading zeros are preserved.
function generateUniquePin() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

const CATEGORY_OPTIONS = [
  { value: 'bathroom',          label: 'Bathrooms' },
  { value: 'kitchen',           label: 'Kitchens' },
  { value: 'addition',          label: 'Addition' },
  { value: 'portico',           label: 'Portico' },
  { value: 'garage-conversion', label: 'Garage Conversion' },
  { value: 'full-renovation',   label: 'Full House Renovation' },
];

// "+ Add a new project type…": the typed name is saved as the project's label,
// and a slug of it as its category. Types used before are offered again.
const NEW_TYPE = '__new__';
const MAX_TYPE_NAME = 60;
const typeSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

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

const inputStyle = {
  border: '1.5px solid #E8E6E1',
  color: '#002147',
  backgroundColor: '#fff',
};

function StyledInput({ value, onChange, placeholder, type = 'text' }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required
      className="w-full text-sm rounded-xl px-4 py-3 focus:outline-none transition-colors duration-150"
      style={{ ...inputStyle, borderColor: focused ? '#D4AF37' : '#E8E6E1' }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function StyledSelect({ value, onChange, children }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value}
      onChange={onChange}
      required
      className="w-full text-sm rounded-xl px-4 py-3 focus:outline-none transition-colors duration-150 appearance-none"
      style={{ ...inputStyle, borderColor: focused ? '#D4AF37' : '#E8E6E1', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%239CA3AF\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center' }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {children}
    </select>
  );
}

export default function AdminCreateProject() {
  const { isAdmin } = useAuth();
  const { dispatch } = useProject();

  const [clients, setClients]         = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientId, setClientId]       = useState('');
  const [category, setCategory]       = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [customTypes, setCustomTypes] = useState([]);   // [{ value, label }] used on earlier projects
  const [projectTitle, setProjectTitle] = useState('');
  const [stage, setStage]             = useState('potential');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(null);

  // Redirect non-admins
  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <p className="text-sm font-semibold" style={{ color: '#DC2626' }}>Access denied. Admin only.</p>
      </div>
    );
  }

  useEffect(() => {
    async function fetchClients() {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name')
        .order('full_name');
      if (!error) setClients(data ?? []);
      setClientsLoading(false);
    }
    fetchClients();
    // Project types added before (anything not in the built-in list).
    supabase.from('projects').select('category, label').then(({ data }) => {
      const seen = new Map();
      for (const p of data ?? []) {
        if (!p.category || CATEGORY_OPTIONS.some((o) => o.value === p.category) || seen.has(p.category)) continue;
        seen.set(p.category, p.label || p.category);
      }
      setCustomTypes([...seen].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)));
    });
  }, []);

  const typeReady = !!category && (category !== NEW_TYPE || !!newTypeName.trim());

  async function handleSubmit(e) {
    e.preventDefault();
    if (!clientId || !typeReady || !projectTitle.trim()) return;

    // A new type: reuse an existing one with the same name, else make a slug.
    let categoryValue = category;
    let categoryLabel = [...CATEGORY_OPTIONS, ...customTypes].find((c) => c.value === category)?.label ?? category;
    if (category === NEW_TYPE) {
      const name = newTypeName.trim();
      const existing = [...CATEGORY_OPTIONS, ...customTypes].find((c) => c.label.toLowerCase() === name.toLowerCase() || c.value === typeSlug(name));
      categoryValue = existing?.value ?? typeSlug(name);
      categoryLabel = existing?.label ?? name;
      if (!categoryValue) { setError('Enter a project type name with letters or numbers.'); return; }
    }

    setError('');
    setSubmitting(true);

    const clientName    = clients.find((c) => c.id === clientId)?.full_name ?? 'Client';

    const pin = generateUniquePin();

    const row = {
      managed_client_id: clientId,
      label:             categoryLabel,
      project_name:      projectTitle.trim(),
      category:          categoryValue,
      project_pin:       pin,
      stage,
    };
    let { data, error: insertError } = await supabase.from('projects').insert(row).select().single();
    // Before migration 055 there is no stage column: create the project without it.
    if (insertError && /stage/.test(insertError.message ?? '')) {
      delete row.stage;
      ({ data, error: insertError } = await supabase.from('projects').insert(row).select().single());
    }

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    // Use the PIN returned by the DB in case a trigger overwrote it
    setSuccess({ clientName, projectTitle: projectTitle.trim(), id: data.id, pin: data.project_pin ?? pin });
    setClientId('');
    if (category === NEW_TYPE && !customTypes.some((c) => c.value === categoryValue) && !CATEGORY_OPTIONS.some((c) => c.value === categoryValue)) {
      setCustomTypes((t) => [...t, { value: categoryValue, label: categoryLabel }].sort((a, b) => a.label.localeCompare(b.label)));
    }
    setCategory('');
    setNewTypeName('');
    setProjectTitle('');
    setStage('potential');
  }

  function handleCreateAnother() {
    setSuccess(null);
  }

  function handleGoToUpdates() {
    dispatch({ type: 'SET_PAGE', page: 'weekly-updates' });
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20">
        <div
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: '#fff', border: '1.5px solid #A7F3D0', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: 'rgba(212,175,55,0.12)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-lg font-bold mb-1" style={{ color: '#002147' }}>Project Created</p>
          <p className="text-sm mb-5" style={{ color: '#6B7280' }}>
            <span className="font-semibold" style={{ color: '#002147' }}>{success.projectTitle}</span> has been linked to{' '}
            <span className="font-semibold" style={{ color: '#002147' }}>{success.clientName}</span>.
          </p>

          {/* PIN badge — visible immediately so the admin can share it right away */}
          {success.pin && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-6"
              style={{ backgroundColor: 'rgba(212,175,55,0.1)', border: '1.5px solid rgba(212,175,55,0.45)' }}>
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: '#92400E' }}>Client PIN</p>
                <p className="text-2xl font-extrabold tracking-[0.35em] font-mono" style={{ color: '#002147' }}>{success.pin}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(success.pin);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold"
                style={{ backgroundColor: '#D4AF37', color: '#002147' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#C9A227'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#D4AF37'; }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy PIN
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={handleGoToUpdates}
              className="w-full py-3 rounded-xl text-sm font-bold"
              style={{ backgroundColor: '#002147', color: '#D4AF37' }}
            >
              Go to Weekly Updates
            </button>
            <button
              onClick={handleCreateAnother}
              className="w-full py-3 rounded-xl text-sm font-bold"
              style={{ backgroundColor: '#F5F4F0', color: '#002147' }}
            >
              Create Another Project
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>
          Admin Tool
        </p>
        <h2 className="text-2xl font-bold" style={{ color: '#002147' }}>Create New Project</h2>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          Add a project and assign it to a client. It will appear in their private portal immediately.
        </p>
      </div>

      <div
        className="rounded-2xl p-6 sm:p-8"
        style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.06)' }}
      >
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          {/* Client */}
          <Field label="Client" required>
            {clientsLoading ? (
              <div className="w-full text-sm rounded-xl px-4 py-3" style={{ ...inputStyle, border: '1.5px solid #E8E6E1', color: '#9CA3AF' }}>
                Loading clients…
              </div>
            ) : clients.length === 0 ? (
              <div
                className="w-full text-sm rounded-xl px-4 py-3"
                style={{ backgroundColor: '#FEF9E7', border: '1.5px solid #FDE68A', color: '#92400E' }}
              >
                No clients found. Go to <strong>Clients</strong> to add your first client.
              </div>
            ) : (
              <StyledSelect value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </StyledSelect>
            )}
          </Field>

          {/* Project type / category */}
          <Field label="Project Type" required>
            <StyledSelect value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select a type…</option>
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
              {customTypes.length > 0 && (
                <optgroup label="Added by you">
                  {customTypes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </optgroup>
              )}
              <option value={NEW_TYPE}>+ Add a new project type…</option>
            </StyledSelect>
            {category === NEW_TYPE && (
              <div className="mt-3">
                <StyledInput
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value.slice(0, MAX_TYPE_NAME))}
                  placeholder="New project type, e.g. Basement Finish"
                />
                <p className="text-xs mt-1.5" style={{ color: '#9CA3AF' }}>It will be in this list next time.</p>
              </div>
            )}
          </Field>

          {/* Project title */}
          <Field label="Project Title" required>
            <StyledInput
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="e.g. Johnson Residence — Master Bath"
            />
          </Field>

          {/* Stage */}
          <Field label="Stage">
            <StyledSelect value={stage} onChange={(e) => setStage(e.target.value)}>
              {[...STAGES].sort((a, b) => (a.key === 'potential' ? -1 : b.key === 'potential' ? 1 : 0)).map((o) => (
                <option key={o.key} value={o.key}>{o.label} — {o.hint}</option>
              ))}
            </StyledSelect>
          </Field>

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm"
              style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !clientId || !typeReady || !projectTitle.trim() || clients.length === 0}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-150 focus:outline-none flex items-center justify-center gap-2"
              style={{
                backgroundColor: submitting || !clientId || !typeReady || !projectTitle.trim() ? '#E5E3DF' : '#002147',
                color:           submitting || !clientId || !typeReady || !projectTitle.trim() ? '#9CA3AF' : '#D4AF37',
                cursor:          submitting || !clientId || !typeReady || !projectTitle.trim() ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => { if (!submitting && clientId && typeReady && projectTitle.trim()) e.currentTarget.style.backgroundColor = '#003166'; }}
              onMouseLeave={(e) => { if (!submitting && clientId && typeReady && projectTitle.trim()) e.currentTarget.style.backgroundColor = '#002147'; }}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Creating project…
                </>
              ) : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
