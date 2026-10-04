// src/pages/Proposals.jsx — Orozco Homes proposals (Project Retainer Agreements)
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { supabase } from '../lib/supabase';
import ProposalDocument from '../components/ProposalDocument';
import { PROPOSAL_PREFILL_KEYS } from '../utils/contractPrefill';
import {
  PROPOSAL_FIELDS, PROPOSAL_SECTIONS, PROPOSAL_TITLE, proposalDefaults, fmtWhole, fmtLongDate,
} from '../utils/proposalTemplate';

const NAVY = '#002147';
const GOLD = '#D4AF37';
const BG = '#F5F4F0';
const BORDER = '#E8E6E1';

const STATUS_STYLE = {
  draft:    { bg: '#F3F4F6', color: '#6B7280' },
  sent:     { bg: '#DBEAFE', color: '#1E40AF' },
  accepted: { bg: '#D1FAE5', color: '#065F46' },
  declined: { bg: '#FEE2E2', color: '#991B1B' },
  expired:  { bg: '#FEF3C7', color: '#92400E' },
};

// Only one proposal document is printed at a time.
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #oh-proposal-print, #oh-proposal-print * { visibility: visible !important; }
  #oh-proposal-print { position: absolute; top: 0; left: 0; width: 100%; max-width: none !important; padding: 0 !important; }
  @page { margin: 0.6in; }
}
`;

function Field({ field, value, onChange }) {
  const [focused, setFocused] = useState(false);
  const style = {
    border: `1.5px solid ${focused ? GOLD : BORDER}`, borderRadius: '10px', padding: '0.55rem 0.85rem',
    fontSize: '0.82rem', color: NAVY, backgroundColor: '#fff', width: '100%', outline: 'none', fontFamily: 'inherit',
  };
  const shared = {
    id: `pf-${field.key}`,
    value: value ?? '',
    onChange: (e) => onChange(field.key, e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    placeholder: field.placeholder || '',
    style,
  };
  return (
    <div className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
      <label htmlFor={shared.id} className="block text-xs font-bold mb-1.5" style={{ color: '#374151' }}>
        {field.label}{field.required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      {field.type === 'textarea'
        ? <textarea rows={field.rows ?? 4} {...shared} style={{ ...style, resize: 'vertical', fontFamily: field.key === 'scope_of_work' ? 'ui-monospace, monospace' : 'inherit' }} />
        : <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'} {...shared} />}
      {field.hint && <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{field.hint}</p>}
    </div>
  );
}

function SectionHeading({ label }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-2">
      <div className="h-px flex-1" style={{ backgroundColor: BORDER }} />
      <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full" style={{ backgroundColor: `${NAVY}12`, color: NAVY }}>
        {label}
      </span>
      <div className="h-px flex-1" style={{ backgroundColor: BORDER }} />
    </div>
  );
}

function SavedList({ onLoad, refreshKey }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
      .from('proposals')
      .select('id, client_name, title, status, investment_low, investment_high, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50)
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        setRows(data ?? []);
      });
  }, [refreshKey]);

  if (!rows) return <p className="text-xs text-center py-6" style={{ color: '#9CA3AF' }}>Loading…</p>;
  if (error) return <p role="alert" className="text-xs text-center py-6" style={{ color: '#DC2626' }}>Could not load proposals: {error}</p>;
  if (!rows.length) return <p className="text-xs text-center py-6" style={{ color: '#9CA3AF' }}>No proposals saved yet.</p>;

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.draft;
        return (
          <button key={r.id} onClick={() => onLoad(r.id)}
            className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors duration-150"
            style={{ border: `1px solid ${BORDER}`, backgroundColor: '#fff' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = GOLD; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; }}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{r.client_name || 'Unnamed Client'}</p>
              <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                {r.title || 'Untitled project'}
                {r.investment_low != null && r.investment_high != null && ` · ${fmtWhole(r.investment_low)} – ${fmtWhole(r.investment_high)}`}
                {` · ${fmtLongDate(r.updated_at.slice(0, 10))}`}
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full capitalize" style={{ backgroundColor: st.bg, color: st.color }}>
              {r.status}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function Proposals() {
  const { isAdmin } = useAuth();
  const { state: projectState, dispatch } = useProject();

  // Draft handed over by "Generate Proposal" in the Remodel Budget; only the
  // allowlisted client-facing keys are accepted.
  const [draft] = useState(() => projectState.proposalDraft);
  const [values, setValues] = useState(() => {
    const base = proposalDefaults();
    if (!draft) return base;
    const allowed = Object.fromEntries(
      PROPOSAL_PREFILL_KEYS.filter((k) => draft.values?.[k]).map((k) => [k, String(draft.values[k])]),
    );
    return { ...base, ...allowed };
  });
  const [link, setLink] = useState(() => (draft
    ? { projectId: draft.projectId ?? null, managedClientId: draft.managedClientId ?? null, source: draft.source, budgetPrice: draft.budgetPrice }
    : null));
  const [proposalId, setProposalId] = useState(null);
  const [status, setStatus] = useState('draft');
  const [activeTab, setActiveTab] = useState('form');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: '' });
  const [listKey, setListKey] = useState(0);

  useEffect(() => {
    if (projectState.proposalDraft) dispatch({ type: 'CLEAR_PROPOSAL_DRAFT' });
  }, [projectState.proposalDraft, dispatch]);

  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = PRINT_CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
        <p className="text-sm" style={{ color: '#6B7280' }}>Proposals are admin-only.</p>
      </div>
    );
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3500);
  }

  function handleChange(key, val) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function handleNew() {
    if (!confirm('Clear all fields and start a new proposal?')) return;
    setValues(proposalDefaults());
    setProposalId(null);
    setStatus('draft');
    setLink(null);
    setActiveTab('form');
  }

  const missing = PROPOSAL_FIELDS.filter((f) => f.required && !String(values[f.key] ?? '').trim()).map((f) => f.label);
  const low = Number(values.investment_low);
  const high = Number(values.investment_high);
  const rangeError = values.investment_low && values.investment_high && low > high
    ? 'The low estimate is higher than the high estimate.' : '';

  async function handleSave() {
    if (!values.client_name?.trim()) { showToast('Enter the client name before saving.', 'error'); return; }
    if (rangeError) { showToast(rangeError, 'error'); return; }
    setSaving(true);
    const payload = {
      client_name:     values.client_name.trim(),
      title:           values.project_title?.trim() || null,
      investment_low:  values.investment_low === '' || values.investment_low == null ? null : Number(values.investment_low),
      investment_high: values.investment_high === '' || values.investment_high == null ? null : Number(values.investment_high),
      status,
      form_data:       values,
      ...(link && { project_id: link.projectId, managed_client_id: link.managedClientId }),
    };
    const { data, error } = proposalId
      ? await supabase.from('proposals').update(payload).eq('id', proposalId).select('id').single()
      : await supabase.from('proposals').insert(payload).select('id').single();
    setSaving(false);
    if (error) {
      showToast(error.code === 'PGRST116' || error.code === '42501'
        ? 'You need to be signed in as an admin to save proposals.'
        : error.code === '42P01' ? 'The proposals table is missing. Run the Supabase SQL step first.'
        : error.message || 'Save failed.', 'error');
      return;
    }
    setProposalId(data.id);
    setListKey((k) => k + 1);
    showToast(proposalId ? 'Proposal updated.' : 'Proposal saved as draft.');
  }

  async function handleLoad(id) {
    const { data, error } = await supabase.from('proposals').select('*').eq('id', id).single();
    if (error || !data) { showToast('Could not load the proposal.', 'error'); return; }
    setValues({ ...proposalDefaults(), ...(data.form_data || {}) });
    setProposalId(data.id);
    setStatus(data.status || 'draft');
    setLink(null);
    setActiveTab('form');
    showToast('Proposal loaded.');
  }

  function handlePrint() {
    setActiveTab('preview');
    setTimeout(() => window.print(), 300);
  }

  const sections = [...new Set(PROPOSAL_FIELDS.map((f) => f.section))];
  const tabStyle = (active) => ({
    padding: '0.5rem 1.25rem', fontSize: '0.78rem', fontWeight: active ? '700' : '500', borderRadius: '8px',
    cursor: 'pointer', backgroundColor: active ? NAVY : 'transparent', color: active ? GOLD : '#6B7280', border: 'none',
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>
      {toast.msg && (
        <div role="status" className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg"
          style={toast.type === 'error'
            ? { backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }
            : { backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534' }}>
          {toast.msg}
        </div>
      )}

      <div className="px-6 pt-8 pb-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: GOLD }}>Proposals</p>
            <h1 className="text-2xl font-bold" style={{ color: NAVY }}>{PROPOSAL_TITLE}</h1>
            <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>Prepare the proposal, preview it, then save or print to PDF for the client to sign.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleNew} className="px-4 py-2 rounded-xl text-xs font-bold"
              style={{ border: `1.5px solid ${BORDER}`, backgroundColor: '#fff', color: '#6B7280' }}>
              New Proposal
            </button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl text-xs font-bold"
              style={{ backgroundColor: saving ? '#E5E3DF' : NAVY, color: saving ? '#9CA3AF' : GOLD }}>
              {saving ? 'Saving…' : proposalId ? 'Update Draft' : 'Save Draft'}
            </button>
            <button onClick={handlePrint} className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
              style={{ backgroundColor: GOLD, color: NAVY }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
              </svg>
              Print / PDF
            </button>
          </div>
        </div>

        <div className="flex p-1 rounded-xl w-fit" style={{ backgroundColor: '#EDEBE6' }}>
          {[['form', 'Fill Form'], ['preview', 'Preview'], ['saved', 'Saved']].map(([key, label]) => (
            <button key={key} style={tabStyle(activeTab === key)} onClick={() => setActiveTab(key)}>{label}</button>
          ))}
        </div>

        {link?.source && activeTab === 'form' && (
          <div role="note" className="mt-4 px-4 py-3 rounded-xl text-xs"
            style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46' }}>
            <strong>Filled from the Remodel Budget for {link.source}:</strong> client details, project name, scope,
            selections and an estimated investment range ({fmtWhole(values.investment_low) || '—'} – {fmtWhole(values.investment_high) || '—'},
            based on the budget's client price of {fmtWhole(link.budgetPrice) || '—'}). Internal costs and margin are not included.
            Add the client address and timeline, and adjust the scope and range as needed.
          </div>
        )}
      </div>

      <div className="px-6 pb-16 max-w-5xl mx-auto">
        {activeTab === 'form' && (
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: `1.5px solid ${BORDER}` }}>
            {sections.map((sec) => (
              <div key={sec} className="mb-6">
                <SectionHeading label={PROPOSAL_SECTIONS[sec]} />
                <div className="grid sm:grid-cols-2 gap-4">
                  {PROPOSAL_FIELDS.filter((f) => f.section === sec).map((f) => (
                    <Field key={f.key} field={f} value={values[f.key]} onChange={handleChange} />
                  ))}
                </div>
                {sec === 'investment' && rangeError && (
                  <p role="alert" className="text-xs font-semibold mt-2" style={{ color: '#DC2626' }}>{rangeError}</p>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
              <p className="text-xs" style={{ color: missing.length ? '#B45309' : '#059669' }}>
                {missing.length ? `Still to fill in: ${missing.join(', ')}` : 'All required fields are filled in.'}
              </p>
              <button onClick={() => setActiveTab('preview')} className="px-5 py-2 rounded-xl text-xs font-bold"
                style={{ backgroundColor: NAVY, color: GOLD }}>
                Preview Proposal →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,33,71,0.08)' }}>
            <ProposalDocument v={values} id="oh-proposal-print" />
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: `1.5px solid ${BORDER}` }}>
            <p className="text-sm font-bold mb-4" style={{ color: NAVY }}>Saved Proposals</p>
            <SavedList onLoad={handleLoad} refreshKey={listKey} />
          </div>
        )}
      </div>
    </div>
  );
}
