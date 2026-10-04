// src/pages/Proposals.jsx — Orozco Homes proposals (Project Retainer Agreements)
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { supabase } from '../lib/supabase';
import ProposalDocument from '../components/ProposalDocument';
import PaperCopyPanel from '../components/PaperCopyPanel';
import { PROPOSAL_PREFILL_KEYS } from '../utils/contractPrefill';
import {
  PROPOSAL_FIELDS, PROPOSAL_SECTIONS, PROPOSAL_TITLE, TEMPLATE_FIELD_KEYS, TOKENS, SECTION_MARKUP_HELP, SECTION_KINDS,
  BUILT_IN_SECTIONS, proposalDefaults, applyPrefillToSections, normalizeProposal, sectionNumbers, newSectionId,
  fmtWhole, fmtLongDate,
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

// '*' so saving keeps working whichever signing migrations (041, 043) have run.
const PROPOSAL_COLS = '*';

const iconBtn = { width: 30, height: 30, borderRadius: 8, fontSize: 13, fontWeight: 700, border: `1px solid ${BORDER}`, backgroundColor: '#fff', color: NAVY };

// Edit, add, remove and reorder the proposal's sections.
function SectionsEditor({ sections, onChange, onSaveTemplate, onResetTemplate, onRestoreOriginal, hasTemplate, savingTemplate }) {
  const numbers = sectionNumbers(sections);
  const update = (id, patch) => onChange(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const insertAfter = (i) => {
    const next = [...sections];
    next.splice(i + 1, 0, { id: newSectionId(), kind: 'text', title: 'New Section', body: '', numbered: true });
    onChange(next);
  };
  const remove = (s) => {
    if (!confirm(`Remove the section "${s.title || SECTION_KINDS[s.kind]}" from this proposal?`)) return;
    onChange(sections.filter((x) => x.id !== s.id));
  };
  const bodyLabel = { text: 'Text', client: 'Extra text under the client information (optional)',
    investment: 'Text under the timeline & investment boxes', signatures: 'Text above the signature lines (optional)' };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <p className="text-xs" style={{ color: '#6B7280', maxWidth: 560 }}>
          Edit any section, add new ones, remove what you don't need and move them up or down. Numbers update automatically.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={onResetTemplate} className="text-xs font-semibold underline" style={{ color: '#6B7280' }}>
            {hasTemplate ? 'Reset to my default template' : 'Reset to original template'}
          </button>
          {hasTemplate && (
            <button type="button" onClick={onRestoreOriginal} className="text-xs font-semibold underline" style={{ color: '#6B7280' }}>
              Original template
            </button>
          )}
          <button type="button" onClick={onSaveTemplate} disabled={savingTemplate}
            className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-60"
            style={{ backgroundColor: '#F5F4F0', color: NAVY, border: `1px solid ${BORDER}` }}>
            {savingTemplate ? 'Saving…' : 'Save as my default template'}
          </button>
        </div>
      </div>

      <details className="mb-4 text-xs rounded-lg px-3 py-2" style={{ backgroundColor: '#F9F8F6', color: '#6B7280' }}>
        <summary className="cursor-pointer font-semibold" style={{ color: NAVY }}>How to format text and insert details</summary>
        <p className="mt-2">{SECTION_MARKUP_HELP}</p>
        <p className="mt-1">These words are replaced with the form details: {TOKENS.map((t) => `${t.token} (${t.label})`).join(', ')}.</p>
      </details>

      <ol className="space-y-3">
        {sections.map((s, i) => (
          <li key={s.id} className="rounded-xl p-3" style={{ border: `1.5px solid ${s.kind === 'text' ? BORDER : '#FDE68A'}`, backgroundColor: s.kind === 'text' ? '#fff' : '#FFFDF5' }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold w-8 text-center shrink-0" style={{ color: GOLD }}>{numbers[s.id] ? `${numbers[s.id]}.` : '—'}</span>
              <input value={s.title} onChange={(e) => update(s.id, { title: e.target.value })}
                aria-label={`Section ${i + 1} title`} placeholder="(no heading)"
                className="flex-1 min-w-[160px] px-3 py-2 rounded-lg text-sm font-semibold focus:outline-none"
                style={{ border: `1.5px solid ${BORDER}`, color: NAVY }} />
              <label className="flex items-center gap-1.5 text-xs" style={{ color: '#6B7280' }}>
                <input type="checkbox" checked={!!s.numbered} onChange={(e) => update(s.id, { numbered: e.target.checked })} />
                Numbered
              </label>
              <button type="button" style={iconBtn} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${s.title || 'section'} up`}>↑</button>
              <button type="button" style={iconBtn} onClick={() => move(i, 1)} disabled={i === sections.length - 1} aria-label={`Move ${s.title || 'section'} down`}>↓</button>
              <button type="button" style={iconBtn} onClick={() => insertAfter(i)} aria-label={`Add a section after ${s.title || 'this section'}`} title="Add a section below">＋</button>
              <button type="button" style={{ ...iconBtn, color: '#DC2626', backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}
                onClick={() => remove(s)} aria-label={`Remove ${s.title || 'section'}`}>✕</button>
            </div>
            {s.kind !== 'text' && (
              <p className="text-xs mt-2 ml-10" style={{ color: '#92400E' }}>{SECTION_KINDS[s.kind]} — filled from the form above.</p>
            )}
            <div className="mt-2 ml-10">
              <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }} htmlFor={`sec-body-${s.id}`}>{bodyLabel[s.kind]}</label>
              <textarea id={`sec-body-${s.id}`} value={s.body} onChange={(e) => update(s.id, { body: e.target.value })}
                rows={Math.min(16, Math.max(s.kind === 'text' ? 4 : 2, s.body.split('\n').length + 1))}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ border: `1.5px solid ${BORDER}`, color: '#1F2937', resize: 'vertical' }} />
            </div>
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => insertAfter(sections.length - 1)}
        className="mt-3 w-full px-4 py-3 rounded-xl text-xs font-bold"
        style={{ border: `1.5px dashed ${GOLD}`, color: NAVY, backgroundColor: 'transparent' }}>
        + Add section
      </button>
    </div>
  );
}

export default function Proposals() {
  const { isAdmin } = useAuth();
  const { state: projectState, dispatch } = useProject();

  // Draft handed over by "Generate Proposal" in the Remodel Budget; only the
  // allowlisted client-facing keys are accepted.
  const [draft] = useState(() => projectState.proposalDraft);
  // New proposal: defaults (or the saved default template) plus the budget draft.
  const buildInitial = (template, fromDraft) => {
    const base = proposalDefaults(template);
    if (!fromDraft) return base;
    const allowed = Object.fromEntries(
      PROPOSAL_PREFILL_KEYS.filter((k) => fromDraft.values?.[k]).map((k) => [k, String(fromDraft.values[k])]),
    );
    const { project_overview, scope_of_work, materials_included, ...fields } = allowed;
    return { ...base, ...fields, sections: applyPrefillToSections(base.sections, { project_overview, scope_of_work, materials_included }) };
  };
  const [values, setValues] = useState(() => buildInitial(null, draft));
  const [template, setTemplate] = useState(null);       // saved default template, if any
  const [savingTemplate, setSavingTemplate] = useState(false);
  const editedRef = useRef(false);                        // true once the admin changes anything
  const [link, setLink] = useState(() => (draft
    ? { projectId: draft.projectId ?? null, managedClientId: draft.managedClientId ?? null, source: draft.source, budgetPrice: draft.budgetPrice }
    : null));
  const [proposalId, setProposalId] = useState(null);
  const [status, setStatus] = useState('draft');
  // Sending / signing details of the loaded proposal (migration 041).
  const [record, setRecord] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState('form');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: '' });
  const [listKey, setListKey] = useState(0);

  useEffect(() => {
    if (projectState.proposalDraft) dispatch({ type: 'CLEAR_PROPOSAL_DRAFT' });
  }, [projectState.proposalDraft, dispatch]);

  useEffect(() => {
    supabase.from('projects').select('id, project_name, managed_client_id').order('project_name')
      .then(({ data }) => setProjects(data ?? []));
  }, []);

  // Saved default template (migration 040). Applied to a new, untouched proposal.
  useEffect(() => {
    supabase.from('proposal_templates').select('fields, sections').eq('id', 'default').maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return;
        setTemplate(data);
        if (!editedRef.current) setValues(buildInitial(data, draft));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    editedRef.current = true;
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function handleSectionsChange(sections) {
    editedRef.current = true;
    setValues((prev) => ({ ...prev, sections }));
  }

  function resetSections(useOriginal) {
    const label = useOriginal || !template ? 'the original template' : 'your default template';
    if (!confirm(`Replace this proposal's sections with ${label}? Your section edits on this proposal will be lost.`)) return;
    handleSectionsChange(proposalDefaults(useOriginal ? null : template).sections);
  }

  async function handleSaveTemplate() {
    if (!confirm('Save these sections, company details and retainer terms as your default for new proposals?')) return;
    setSavingTemplate(true);
    const row = {
      id: 'default',
      fields: Object.fromEntries(TEMPLATE_FIELD_KEYS.map((k) => [k, values[k] ?? ''])),
      sections: values.sections,
    };
    const { error } = await supabase.from('proposal_templates').upsert(row, { onConflict: 'id' });
    setSavingTemplate(false);
    if (error) {
      showToast(error.code === '42P01' || error.code === 'PGRST205'
        ? 'The template table is missing. Run the Supabase SQL step first.'
        : error.message || 'Could not save the template.', 'error');
      return;
    }
    setTemplate({ fields: row.fields, sections: row.sections });
    showToast('Saved as your default template. New proposals will start from it.');
  }

  function handleNew() {
    if (!confirm('Clear all fields and start a new proposal?')) return;
    editedRef.current = false;
    setValues(proposalDefaults(template));
    setProposalId(null);
    setStatus('draft');
    setRecord(null);
    setLink(null);
    setActiveTab('form');
  }

  const locked = status === 'accepted';

  function handleProjectPick(projectId) {
    const p = projects.find((x) => x.id === projectId);
    editedRef.current = true;
    setLink((prev) => ({ ...prev, projectId: p?.id ?? null, managedClientId: p?.managed_client_id ?? null }));
  }

  function handleDuplicate() {
    setProposalId(null);
    setStatus('draft');
    setRecord(null);
    editedRef.current = true;
    setActiveTab('form');
    showToast('Copied into a new draft. The signed proposal stays unchanged.');
  }

  const missing = PROPOSAL_FIELDS.filter((f) => f.required && !String(values[f.key] ?? '').trim()).map((f) => f.label);
  const low = Number(values.investment_low);
  const high = Number(values.investment_high);
  const rangeError = values.investment_low && values.investment_high && low > high
    ? 'The low estimate is higher than the high estimate.' : '';

  // Inserts or updates the proposal; `extra` adds status / sending columns.
  // Returns the saved row (id + status fields), or null on error.
  async function persist(extra = {}) {
    if (!values.client_name?.trim()) { showToast('Enter the client name before saving.', 'error'); return null; }
    if (rangeError) { showToast(rangeError, 'error'); return null; }
    setSaving(true);
    const payload = {
      client_name:     values.client_name.trim(),
      title:           values.project_title?.trim() || null,
      investment_low:  values.investment_low === '' || values.investment_low == null ? null : Number(values.investment_low),
      investment_high: values.investment_high === '' || values.investment_high == null ? null : Number(values.investment_high),
      status,
      form_data:       values,
      ...(link && { project_id: link.projectId, managed_client_id: link.managedClientId }),
      ...extra,
    };
    const cols = PROPOSAL_COLS;
    const { data, error } = proposalId
      ? await supabase.from('proposals').update(payload).eq('id', proposalId).select(cols).single()
      : await supabase.from('proposals').insert(payload).select(cols).single();
    setSaving(false);
    if (error) {
      showToast(error.code === 'PGRST116'
        ? 'You need to be signed in as an admin to save proposals.'
        : error.code === '42P01' ? 'The proposals table is missing. Run the Supabase SQL step first.'
        : error.message || 'Save failed.', 'error');
      return null;
    }
    setProposalId(data.id);
    setStatus(data.status);
    setRecord(data);
    setListKey((k) => k + 1);
    return data;
  }

  async function handleSave() {
    const saved = await persist();
    if (!saved) return;
    showToast(saved.status === 'sent'
      ? `Saved. The client still sees the version sent on ${fmtLongDate(saved.sent_at.slice(0, 10))} — click "Re-send" to update it.`
      : proposalId ? 'Proposal updated.' : 'Proposal saved as draft.');
  }

  async function handleSend() {
    if (missing.length) { showToast(`Fill in before sending: ${missing.join(', ')}`, 'error'); setActiveTab('form'); return; }
    if (!link?.projectId) { showToast('Pick the project (client portal) before sending.', 'error'); setActiveTab('form'); return; }
    const again = status === 'sent' || status === 'declined';
    if (!confirm(again
      ? 'Send this updated version to the client? It replaces the version they can see now.'
      : 'Send this proposal to the client? They will see it in their portal and can accept and sign it.')) return;
    const saved = await persist({ status: 'sent', sent_at: new Date().toISOString(), sent_snapshot: values });
    if (saved) showToast('Sent. The client can review and sign it in their portal (Project PIN).');
  }

  // Signed on paper: mark accepted with the uploaded copy (migration 043).
  async function attachPaperCopy(path) {
    const { data, error } = await supabase.from('proposals')
      .update({ status: 'accepted', signed_file_path: path }).eq('id', proposalId).select(PROPOSAL_COLS).single();
    if (error) return error.code === '42703' || error.code === 'PGRST204'
      ? 'The signed-copy columns are missing in the database. Run the step 3 SQL in Supabase first.' : error.message || 'Could not save the signed copy.';
    setStatus(data.status);
    setRecord(data);
    setListKey((k) => k + 1);
    showToast('Signed copy uploaded. The proposal is marked accepted and locked.');
    return null;
  }

  async function handleWithdraw() {
    if (!confirm('Withdraw this proposal? The client will no longer see it in their portal.')) return;
    const saved = await persist({ status: 'draft' });
    if (saved) showToast('Withdrawn. The proposal is a draft again.');
  }

  async function handleLoad(id) {
    const { data, error } = await supabase.from('proposals').select('*').eq('id', id).single();
    if (error || !data) { showToast('Could not load the proposal.', 'error'); return; }
    editedRef.current = true;
    setValues(normalizeProposal(data.form_data, template));
    setProposalId(data.id);
    setStatus(data.status || 'draft');
    setRecord(data);
    setLink(data.project_id ? { projectId: data.project_id, managedClientId: data.managed_client_id } : null);
    setActiveTab(data.status === 'accepted' ? 'preview' : 'form');
    showToast(data.status === 'accepted' ? 'Signed proposal loaded (read-only).' : 'Proposal loaded.');
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
            {!locked && (
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl text-xs font-bold"
                style={{ backgroundColor: saving ? '#E5E3DF' : NAVY, color: saving ? '#9CA3AF' : GOLD }}>
                {saving ? 'Saving…' : proposalId ? (status === 'draft' ? 'Update Draft' : 'Save Changes') : 'Save Draft'}
              </button>
            )}
            {!locked && (
              <button onClick={handleSend} disabled={saving} className="px-4 py-2 rounded-xl text-xs font-bold"
                style={{ backgroundColor: '#059669', color: '#fff' }}>
                {status === 'sent' || status === 'declined' ? 'Re-send to Client' : 'Send to Client'}
              </button>
            )}
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

        {proposalId && status !== 'draft' && (
          <div role="status" className="mt-4 px-4 py-3 rounded-xl text-xs flex flex-wrap items-center gap-3"
            style={status === 'accepted'
              ? { backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7', color: '#065F46' }
              : status === 'declined'
                ? { backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }
                : { backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
            <p className="flex-1 min-w-[220px]">
              {status === 'sent' && <>
                <strong>Sent to the client</strong> on {fmtLongDate(record?.sent_at?.slice(0, 10))}. They can review and sign it in their portal.
                Edits you make here are not visible to them until you click <strong>Re-send to Client</strong>.
              </>}
              {status === 'accepted' && (record?.signed_on_paper ? <>
                <strong>Signed on paper</strong> — signed copy uploaded on{' '}
                {record?.accepted_at ? new Date(record.accepted_at).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }) : ''}.
                This proposal is locked.
              </> : <>
                <strong>Accepted &amp; signed</strong> by {(record?.signatures ?? []).map((x) => x.name).join(' and ')} on{' '}
                {record?.accepted_at ? new Date(record.accepted_at).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }) : ''}.
                This proposal is locked; the Preview shows the signed copy.
              </>)}
              {status === 'declined' && <>
                <strong>Declined by the client</strong> on {fmtLongDate(record?.declined_at?.slice(0, 10))}
                {record?.decline_reason ? <>: “{record.decline_reason}”</> : '.'} You can edit it and re-send.
              </>}
            </p>
            {status === 'sent' && (
              <button onClick={handleWithdraw} disabled={saving} className="px-3 py-1.5 rounded-lg font-bold"
                style={{ backgroundColor: '#fff', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
                Withdraw
              </button>
            )}
            {locked && (
              <button onClick={handleDuplicate} className="px-3 py-1.5 rounded-lg font-bold"
                style={{ backgroundColor: '#fff', border: '1px solid #6EE7B7', color: '#065F46' }}>
                Duplicate as new draft
              </button>
            )}
          </div>
        )}

        <PaperCopyPanel
          kind="proposals" docLabel="proposal" docId={proposalId}
          filePath={record?.signed_file_path}
          canUpload={status !== 'accepted'}
          onAttach={attachPaperCopy}
          onMessage={showToast}
        />

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
          <fieldset disabled={locked} className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: `1.5px solid ${BORDER}`, opacity: locked ? 0.7 : 1 }}>
            <div className="mb-6">
              <SectionHeading label="Project (Client Portal)" />
              <label htmlFor="pf-project" className="block text-xs font-bold mb-1.5" style={{ color: '#374151' }}>
                Project <span style={{ color: '#EF4444' }}>*</span>
                <span className="font-normal" style={{ color: '#9CA3AF' }}> — the client sees and signs the proposal in this project's portal (PIN)</span>
              </label>
              <select id="pf-project" value={link?.projectId ?? ''} onChange={(e) => handleProjectPick(e.target.value)}
                className="w-full sm:w-1/2" style={{ border: `1.5px solid ${BORDER}`, borderRadius: '10px', padding: '0.55rem 0.85rem', fontSize: '0.82rem', color: NAVY, backgroundColor: '#fff' }}>
                <option value="">— Pick a project —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
              </select>
            </div>
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
            <div className="mb-6">
              <SectionHeading label="Proposal Sections" />
              <SectionsEditor
                sections={values.sections ?? BUILT_IN_SECTIONS}
                onChange={handleSectionsChange}
                onSaveTemplate={handleSaveTemplate}
                onResetTemplate={() => resetSections(false)}
                onRestoreOriginal={() => resetSections(true)}
                hasTemplate={!!template}
                savingTemplate={savingTemplate}
              />
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3 pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
              <p className="text-xs" style={{ color: missing.length ? '#B45309' : '#059669' }}>
                {missing.length ? `Still to fill in: ${missing.join(', ')}` : 'All required fields are filled in.'}
              </p>
              <button onClick={() => setActiveTab('preview')} className="px-5 py-2 rounded-xl text-xs font-bold"
                style={{ backgroundColor: NAVY, color: GOLD }}>
                Preview Proposal →
              </button>
            </div>
          </fieldset>
        )}

        {activeTab === 'preview' && (
          <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,33,71,0.08)' }}>
            {locked && record?.sent_snapshot
              ? <ProposalDocument v={record.sent_snapshot} signatures={record.signatures ?? []} id="oh-proposal-print" />
              : <ProposalDocument v={values} id="oh-proposal-print" />}
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
