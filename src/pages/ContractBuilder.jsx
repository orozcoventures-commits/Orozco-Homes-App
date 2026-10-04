// src/pages/ContractBuilder.jsx — Orozco Homes Contract Generator
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import PaperCopyPanel from '../components/PaperCopyPanel';
import { CONTRACT_PREFILL_KEYS } from '../utils/contractPrefill';
import { PROPOSAL_TO_CONTRACT_KEYS } from '../utils/proposalTemplate';
import { supabase } from '../lib/supabase';
import {
  CONTRACT_FIELDS,
  SECTION_LABELS,
  buildContractText,
  fmtDollars,
  fmtDate,
} from '../utils/contractHelpers';

// ── Brand colors ──────────────────────────────────────────────────────────────
const NAVY  = '#002147';
const GOLD  = '#D4AF37';
const BG    = '#F5F4F0';
const CARD  = '#fff';
const BORDER = '#E8E6E1';

// ── Small helpers ─────────────────────────────────────────────────────────────
function Label({ children, required }) {
  return (
    <label className="block text-xs font-bold mb-1.5" style={{ color: '#374151' }}>
      {children}{required && <span style={{ color: '#EF4444' }}> *</span>}
    </label>
  );
}

function inputStyle(focused) {
  return {
    border: `1.5px solid ${focused ? GOLD : BORDER}`,
    borderRadius: '10px',
    padding: '0.55rem 0.85rem',
    fontSize: '0.82rem',
    color: NAVY,
    backgroundColor: '#fff',
    width: '100%',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
  };
}

function Field({ field, value, onChange }) {
  const [focused, setFocused] = useState(false);
  const shared = {
    value: value ?? '',
    onChange: (e) => onChange(field.key, e.target.value),
    onFocus: () => setFocused(true),
    onBlur:  () => setFocused(false),
    placeholder: field.placeholder || '',
    style: inputStyle(focused),
  };
  if (field.type === 'textarea')
    return <textarea rows={4} {...shared} />;
  return <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'} {...shared} />;
}

// ── Section heading chip ──────────────────────────────────────────────────────
function SectionHeading({ label }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-2">
      <div className="h-px flex-1" style={{ backgroundColor: BORDER }} />
      <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
        style={{ backgroundColor: `${NAVY}12`, color: NAVY }}>
        {label}
      </span>
      <div className="h-px flex-1" style={{ backgroundColor: BORDER }} />
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  const bg = type === 'error' ? '#FEF2F2' : '#F0FDF4';
  const border = type === 'error' ? '#FECACA' : '#BBF7D0';
  const color  = type === 'error' ? '#991B1B' : '#166534';
  return (
    <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg"
      style={{ backgroundColor: bg, border: `1px solid ${border}`, color }}>
      {msg}
    </div>
  );
}

// ── Contract preview (plain-text renderer) ────────────────────────────────────
function ContractPreview({ text }) {
  return (
    <pre
      className="whitespace-pre-wrap break-words text-xs leading-relaxed font-mono"
      style={{ color: '#1a1a2e', lineHeight: '1.75' }}
    >
      {text}
    </pre>
  );
}

// ── Print stylesheet injected once ────────────────────────────────────────────
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #oh-contract-print, #oh-contract-print * { visibility: visible !important; }
  #oh-contract-print {
    position: fixed; top: 0; left: 0; width: 100%; height: auto;
    padding: 36px 48px; background: white;
    font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.7;
    color: #000; white-space: pre-wrap; word-wrap: break-word;
  }
}
`;

const STATUS_BADGE = {
  draft:         { label: 'Draft',          bg: '#F3F4F6', color: '#6B7280' },
  sent:          { label: 'Sent',           bg: '#DBEAFE', color: '#1E40AF' },
  client_signed: { label: 'Client signed',  bg: '#EDE9FE', color: '#5B21B6' },
  signed:        { label: 'Fully signed',   bg: '#D1FAE5', color: '#065F46' },
  declined:      { label: 'Declined',       bg: '#FEE2E2', color: '#991B1B' },
  voided:        { label: 'Voided',         bg: '#F3F4F6', color: '#6B7280' },
};

const fmtWhen = (iso) => (iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }) : '');

// ── Saved contracts list ──────────────────────────────────────────────────────
function SavedList({ onLoad, refreshKey }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('contracts')
      .select('id, client_name, project_address, contract_date, created_at, status')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setRows(data || []); setLoading(false); });
  }, [refreshKey]);

  if (loading) return <p className="text-xs text-center py-6" style={{ color: '#9CA3AF' }}>Loading…</p>;
  if (!rows.length) return <p className="text-xs text-center py-6" style={{ color: '#9CA3AF' }}>No contracts saved yet.</p>;

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <button
          key={r.id}
          onClick={() => onLoad(r.id)}
          className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors duration-150"
          style={{ border: `1px solid ${BORDER}`, backgroundColor: '#fff' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = GOLD; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${NAVY}12` }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{r.client_name || 'Unnamed Client'}</p>
            <p className="text-xs truncate" style={{ color: '#6B7280' }}>{r.project_address} · {fmtDate(r.contract_date)}</p>
          </div>
          <span
            className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: (STATUS_BADGE[r.status] ?? STATUS_BADGE.draft).bg, color: (STATUS_BADGE[r.status] ?? STATUS_BADGE.draft).color }}
          >
            {(STATUS_BADGE[r.status] ?? STATUS_BADGE.draft).label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function ContractBuilder() {
  const { isAdmin } = useAuth();
  const { state: projectState, dispatch } = useProject();

  const defaultValues = CONTRACT_FIELDS.reduce((acc, f) => {
    if (f.defaultValue) acc[f.key] = f.defaultValue;
    return acc;
  }, {});

  // A draft handed over by "Generate Contract" in the Remodel Budget or by
  // "Create Contract from this proposal". Only the allowlisted client-facing
  // keys are accepted, whatever the draft contains.
  const [draft] = useState(() => projectState.contractDraft);
  const [values,      setValues]      = useState(() => {
    if (!draft) return defaultValues;
    const keys = draft.kind === 'proposal' ? PROPOSAL_TO_CONTRACT_KEYS : CONTRACT_PREFILL_KEYS;
    const allowed = Object.fromEntries(
      keys.filter((k) => draft.values?.[k]).map((k) => [k, String(draft.values[k])]),
    );
    return { ...defaultValues, ...allowed, contract_date: todayISO() };
  });
  const [link,        setLink]        = useState(() => (draft
    ? {
      projectId: draft.projectId ?? null, managedClientId: draft.managedClientId ?? null, source: draft.source,
      kind: draft.kind ?? 'budget', proposalId: draft.proposalId ?? null, reminders: draft.reminders ?? null,
    }
    : null));
  const [activeTab,   setActiveTab]   = useState('form');
  const [saving,      setSaving]      = useState(false);
  const [contractId,  setContractId]  = useState(null);
  // Sending / signing details of the loaded contract (migration 042).
  const [status,      setStatus]      = useState('draft');
  const [record,      setRecord]      = useState(null);
  const [projects,    setProjects]    = useState([]);
  const [listKey,     setListKey]     = useState(0);
  const [csName,      setCsName]      = useState('');
  const [csAgree,     setCsAgree]     = useState(false);
  const [toast,       setToast]       = useState({ msg: '', type: '' });
  const printRef = useRef();

  // The draft is used once; clear it so reopening Contracts starts blank.
  useEffect(() => {
    if (projectState.contractDraft) dispatch({ type: 'CLEAR_CONTRACT_DRAFT' });
  }, [projectState.contractDraft, dispatch]);

  useEffect(() => {
    supabase.from('projects').select('id, project_name, managed_client_id').order('project_name')
      .then(({ data }) => setProjects(data ?? []));
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
        <p className="text-sm" style={{ color: '#6B7280' }}>Contracts are admin-only.</p>
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

  function handleReset() {
    if (!confirm('Clear all fields and start a new contract?')) return;
    setValues(defaultValues);
    setContractId(null);
    setStatus('draft');
    setRecord(null);
    setLink(null);
    setActiveTab('form');
  }

  const locked = status === 'client_signed' || status === 'signed';
  const missingRequired = CONTRACT_FIELDS.filter((f) => f.required && !values[f.key]?.toString().trim()).map((f) => f.label);

  function handleProjectPick(projectId) {
    const p = projects.find((x) => x.id === projectId);
    setLink((prev) => ({ ...prev, projectId: p?.id ?? null, managedClientId: p?.managed_client_id ?? null }));
  }

  function applyRow(row) {
    setContractId(row.id);
    setStatus(row.status || 'draft');
    setRecord(row);
    setListKey((k) => k + 1);
  }

  function handleDuplicate() {
    setContractId(null);
    setStatus('draft');
    setRecord(null);
    setActiveTab('form');
    showToast('Copied into a new draft. The signed contract stays unchanged.');
  }

  // '*' so saving keeps working whichever signing migrations (042, 043) have run.
  const ROW_COLS = '*';

  // Signed on paper: mark fully signed with the uploaded copy (migration 043).
  async function attachPaperCopy(path) {
    const { data, error } = await supabase.from('contracts')
      .update({ status: 'signed', signed_file_path: path }).eq('id', contractId).select(ROW_COLS).single();
    if (error) return error.code === '42703' || error.code === 'PGRST204'
      ? 'The signed-copy columns are missing in the database. Run the step 3 SQL in Supabase first.' : error.message || 'Could not save the signed copy.';
    applyRow(data);
    showToast('Signed copy uploaded. The contract is marked fully signed and locked.');
    return null;
  }

  // Inserts or updates the contract; `extra` adds status / sending columns.
  async function persist(extra = {}) {
    setSaving(true);
    const payload = {
      client_name:     values.client_name     || null,
      project_address: values.project_address || null,
      contract_date:   values.contract_date   || null,
      status,
      form_data:       values,
      ...(link && { project_id: link.projectId, managed_client_id: link.managedClientId }),
      ...(link?.proposalId && { proposal_id: link.proposalId }),
      ...extra,
    };
    const write = (body) => (contractId
      ? supabase.from('contracts').update(body).eq('id', contractId).select(ROW_COLS).single()
      : supabase.from('contracts').insert(body).select(ROW_COLS).single());
    let { data, error } = await write(payload);
    // Before migration 044 there is no proposal_id column: save without the link.
    if (error && payload.proposal_id && /proposal_id/.test(error.message || '')) {
      const rest = { ...payload };
      delete rest.proposal_id;
      ({ data, error } = await write(rest));
    }
    setSaving(false);
    if (error) { showToast(error.message || 'Save failed.', 'error'); return null; }
    applyRow(data);
    return data;
  }

  async function handleSave() {
    const saved = await persist();
    if (!saved) return;
    showToast(saved.status === 'sent'
      ? 'Saved. The client still sees the version you sent — click "Re-send to Client" to update it.'
      : 'Contract saved as draft.');
  }

  async function handleSend() {
    if (missingRequired.length) { showToast(`Fill in before sending: ${missingRequired.join(', ')}`, 'error'); setActiveTab('form'); return; }
    if (!link?.projectId) { showToast('Pick the project (client portal) before sending.', 'error'); setActiveTab('form'); return; }
    const again = status === 'sent' || status === 'declined';
    if (!confirm(again
      ? 'Send this updated version to the client? It replaces the version they can see now.'
      : 'Send this contract to the client? They will see it in their portal and can sign it.')) return;
    const saved = await persist({ status: 'sent', sent_at: new Date().toISOString(), sent_snapshot: { ...values, _prepared_on: todayISO() } });
    if (saved) showToast('Sent. The client can review and sign it in their portal (Project PIN).');
  }

  async function handleWithdraw() {
    if (!confirm('Withdraw this contract? The client will no longer see it in their portal.')) return;
    const saved = await persist({ status: 'draft' });
    if (saved) showToast('Withdrawn. The contract is a draft again.');
  }

  async function handleCountersign(e) {
    e.preventDefault();
    const name = (csName || values.contractor_name || '').trim();
    if (!name) { showToast('Type your full name to countersign.', 'error'); return; }
    if (!csAgree) { showToast('Check the box to agree to sign electronically.', 'error'); return; }
    setSaving(true);
    const { data, error } = await supabase.from('contracts')
      .update({ status: 'signed', contractor_signature: { name, title: values.contractor_title || '' } })
      .eq('id', contractId).select(ROW_COLS).single();
    setSaving(false);
    if (error) { showToast(error.message || 'Could not countersign.', 'error'); return; }
    applyRow(data);
    showToast('Countersigned. The contract is fully signed and locked.');
  }

  async function handleLoadById(id) {
    const { data, error } = await supabase.from('contracts').select('*').eq('id', id).single();
    if (error || !data) { showToast('Could not load contract.', 'error'); return; }
    setValues(data.form_data || {});
    applyRow(data);
    setLink(data.project_id || data.proposal_id
      ? { projectId: data.project_id ?? null, managedClientId: data.managed_client_id ?? null, proposalId: data.proposal_id ?? null }
      : null);
    setCsName(''); setCsAgree(false);
    const isLocked = data.status === 'client_signed' || data.status === 'signed';
    setActiveTab(isLocked ? 'preview' : 'form');
    showToast(isLocked ? 'Signed contract loaded (read-only).' : 'Contract loaded.');
  }

  function handlePrint() {
    window.print();
  }

  const contractText = locked && record?.sent_snapshot
    ? buildContractText(record.sent_snapshot, { clients: record.client_signatures ?? [], contractor: record.contractor_signature })
    : buildContractText(values);
  const sections     = [...new Set(CONTRACT_FIELDS.map((f) => f.section))];

  const tabStyle = (active) => ({
    padding: '0.5rem 1.25rem',
    fontSize: '0.78rem',
    fontWeight: active ? '700' : '500',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    backgroundColor: active ? NAVY : 'transparent',
    color: active ? GOLD : '#6B7280',
    border: 'none',
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>
      <Toast msg={toast.msg} type={toast.type} />

      <pre
        id="oh-contract-print"
        ref={printRef}
        style={{ display: 'none', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
      >
        {contractText}
      </pre>

      <div className="px-6 pt-8 pb-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: GOLD }}>Contract Generator</p>
            <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Residential Remodeling Agreement</h1>
            <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>Fill in the fields, preview the contract, then save or print to PDF.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-colors duration-150"
              style={{ border: `1.5px solid ${BORDER}`, backgroundColor: '#fff', color: '#6B7280' }}
            >
              New Contract
            </button>
            {!locked && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-colors duration-150"
                style={{ backgroundColor: saving ? '#E5E3DF' : NAVY, color: saving ? '#9CA3AF' : GOLD }}
              >
                {saving ? 'Saving…' : contractId ? (status === 'draft' ? 'Update Draft' : 'Save Changes') : 'Save Draft'}
              </button>
            )}
            {!locked && (
              <button onClick={handleSend} disabled={saving} className="px-4 py-2 rounded-xl text-xs font-bold"
                style={{ backgroundColor: '#059669', color: '#fff' }}>
                {status === 'sent' || status === 'declined' ? 'Re-send to Client' : 'Send to Client'}
              </button>
            )}
            <button
              onClick={() => { setActiveTab('preview'); setTimeout(handlePrint, 300); }}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors duration-150"
              style={{ backgroundColor: GOLD, color: NAVY }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print / PDF
            </button>
          </div>
        </div>

        <div className="flex p-1 rounded-xl w-fit" style={{ backgroundColor: '#EDEBE6' }}>
          {[['form','Fill Form'],['preview','Preview'],['saved','Saved']].map(([key, label]) => (
            <button key={key} style={tabStyle(activeTab === key)} onClick={() => setActiveTab(key)}>
              {label}
            </button>
          ))}
        </div>

        {contractId && status !== 'draft' && (
          <div role="status" className="mt-4 px-4 py-3 rounded-xl text-xs"
            style={status === 'signed'
              ? { backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7', color: '#065F46' }
              : status === 'client_signed'
                ? { backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', color: '#5B21B6' }
                : status === 'declined'
                  ? { backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }
                  : { backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
            <div className="flex flex-wrap items-center gap-3">
              <p className="flex-1 min-w-[220px]">
                {status === 'sent' && <><strong>Sent to the client</strong> on {fmtWhen(record?.sent_at)}. They can review and sign it in their portal. Edits here are not visible to them until you click <strong>Re-send to Client</strong>.</>}
                {status === 'client_signed' && <><strong>Signed by the client</strong> ({(record?.client_signatures ?? []).map((x) => x.name).join(' and ')}) on {fmtWhen(record?.client_signed_at)}. Countersign below to complete the contract.</>}
                {status === 'signed' && (record?.signed_on_paper
                  ? <><strong>Fully signed on paper</strong> — signed copy uploaded on {fmtWhen(record?.contractor_signed_at)}. This contract is locked.</>
                  : <><strong>Fully signed.</strong> Client: {(record?.client_signatures ?? []).map((x) => x.name).join(' and ')} ({fmtWhen(record?.client_signed_at)}). Orozco Homes: {record?.contractor_signature?.name} ({fmtWhen(record?.contractor_signed_at)}). This contract is locked.</>)}
                {status === 'declined' && <><strong>Declined by the client</strong> on {fmtWhen(record?.declined_at)}{record?.decline_reason ? <>: “{record.decline_reason}”</> : '.'} You can edit it and re-send.</>}
              </p>
              {status === 'sent' && (
                <button onClick={handleWithdraw} disabled={saving} className="px-3 py-1.5 rounded-lg font-bold"
                  style={{ backgroundColor: '#fff', border: '1px solid #BFDBFE', color: '#1E40AF' }}>Withdraw</button>
              )}
              {locked && (
                <button onClick={handleDuplicate} className="px-3 py-1.5 rounded-lg font-bold"
                  style={{ backgroundColor: '#fff', border: '1px solid #C4B5FD', color: '#5B21B6' }}>Duplicate as new draft</button>
              )}
            </div>
            {status === 'client_signed' && (
              <form onSubmit={handleCountersign} className="mt-3 pt-3 flex flex-wrap items-end gap-3" style={{ borderTop: '1px solid #DDD6FE' }}>
                <label className="flex-1 min-w-[200px]">
                  <span className="block font-bold mb-1">Your full name (Orozco Homes)</span>
                  <input value={csName || values.contractor_name || ''} onChange={(e) => setCsName(e.target.value)} maxLength={100}
                    aria-label="Countersigner name"
                    className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1.5px solid #DDD6FE', color: NAVY, backgroundColor: '#fff' }} />
                </label>
                <label className="flex items-start gap-2 flex-[2] min-w-[240px]">
                  <input type="checkbox" checked={csAgree} onChange={(e) => setCsAgree(e.target.checked)} className="mt-0.5" />
                  <span>I agree to sign this contract electronically for Orozco Homes LLC.</span>
                </label>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-60"
                  style={{ backgroundColor: '#5B21B6', color: '#fff' }}>{saving ? 'Signing…' : 'Countersign'}</button>
              </form>
            )}
          </div>
        )}

        <PaperCopyPanel
          kind="contracts" docLabel="contract" docId={contractId}
          filePath={record?.signed_file_path}
          canUpload={status !== 'signed'}
          onAttach={attachPaperCopy}
          onMessage={showToast}
        />

        {link?.source && link.kind === 'proposal' && (
          <div role="status" className="mt-4 px-4 py-3 rounded-xl text-xs space-y-1"
            style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46' }}>
            <p>
              <strong>Filled from the signed proposal for {link.source}:</strong> client name, email, phone and address,
              project, scope of work (with the overview and any sections you added) and materials. The proposal's
              retainer terms and signatures are not copied; the client signs this contract separately.
            </p>
            <p><strong>Still to fill in (numbers):</strong> contract price, deposit, payment schedule, start and completion dates{values.contractor_license ? '' : ', and your VA license #'}.</p>
            <ul className="list-disc pl-5">
              {link.reminders?.range && <li>Accepted estimated range: <strong>{link.reminders.range}</strong></li>}
              {link.reminders?.timeline && <li>Proposal timeline: <strong>{link.reminders.timeline}</strong></li>}
              {link.reminders?.retainer && <li>Retainer of <strong>{link.reminders.retainer}</strong> is credited on the <strong>second construction payment</strong> (per the retainer agreement).</li>}
            </ul>
          </div>
        )}

        {link?.source && link.kind !== 'proposal' && (
          <div role="status" className="mt-4 px-4 py-3 rounded-xl text-xs"
            style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46' }}>
            <strong>Filled from the Remodel Budget for {link.source}:</strong> client name, email and phone,
            project type, scope, selections and the total contract price. Internal costs and margin are not included.
            Please add the client mailing address, project address, payment schedule and dates, then review the scope.
            {!values.client_name && ' This project has no client in Manage Clients, so enter the client details too.'}
          </div>
        )}
      </div>

      <div className="px-6 pb-16 max-w-5xl mx-auto">

        {activeTab === 'form' && (
          <fieldset
            disabled={locked}
            className="rounded-2xl p-6 shadow-sm"
            style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, opacity: locked ? 0.7 : 1 }}
          >
            <div className="mb-6">
              <SectionHeading label="Project (Client Portal)" />
              <Label required>Project — the client sees and signs the contract in this project's portal (PIN)</Label>
              <select value={link?.projectId ?? ''} onChange={(e) => handleProjectPick(e.target.value)} aria-label="Project"
                className="w-full sm:w-1/2" style={inputStyle(false)}>
                <option value="">— Pick a project —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
              </select>
            </div>
            {(() => {
              const required = CONTRACT_FIELDS.filter((f) => f.required);
              const filled   = required.filter((f) => values[f.key]?.toString().trim()).length;
              const pct      = Math.round((filled / required.length) * 100);
              return (
                <div className="mb-6">
                  <div className="flex justify-between text-xs mb-1.5" style={{ color: '#6B7280' }}>
                    <span>{filled} / {required.length} required fields</span>
                    <span className="font-bold" style={{ color: pct === 100 ? '#059669' : NAVY }}>{pct}% complete</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#EDEBE6' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#059669' : GOLD }}
                    />
                  </div>
                </div>
              );
            })()}

            {sections.map((section) => {
              const fields = CONTRACT_FIELDS.filter((f) => f.section === section);
              return (
                <div key={section} className="mb-6">
                  <SectionHeading label={SECTION_LABELS[section]} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {fields.map((f) => (
                      <div
                        key={f.key}
                        className={f.type === 'textarea' ? 'sm:col-span-2' : ''}
                      >
                        <Label required={f.required}>{f.label}</Label>
                        <Field field={f} value={values[f.key]} onChange={handleChange} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="mt-4 flex justify-end gap-3">
              {!locked && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: saving ? '#E5E3DF' : NAVY, color: saving ? '#9CA3AF' : GOLD }}
                >
                  {saving ? 'Saving…' : contractId ? (status === 'draft' ? 'Update Draft' : 'Save Changes') : 'Save Draft'}
                </button>
              )}
              <button
                onClick={() => setActiveTab('preview')}
                className="px-6 py-2.5 rounded-xl text-sm font-bold"
                style={{ backgroundColor: GOLD, color: NAVY }}
              >
                Preview Contract →
              </button>
            </div>
          </fieldset>
        )}

        {activeTab === 'preview' && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                {locked ? 'Signed copy — exactly what the client signed' : 'Live preview — reflects current form values'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('form')}
                  className="px-4 py-2 rounded-xl text-xs font-bold"
                  style={{ border: `1.5px solid ${BORDER}`, backgroundColor: '#fff', color: NAVY }}
                >
                  ← Edit Fields
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  style={{ backgroundColor: GOLD, color: NAVY }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Save as PDF
                </button>
              </div>
            </div>

            <div
              className="rounded-2xl shadow-sm overflow-hidden"
              style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}
            >
              <div
                className="px-8 py-5 flex items-center gap-4"
                style={{ backgroundColor: NAVY, borderBottom: `3px solid ${GOLD}` }}
              >
                <img src="/orozco-homes-logo.png" alt="Orozco Homes" className="h-10 rounded-xl w-auto shrink-0 object-contain" />
                <div>
                  <p className="font-bold text-white text-base tracking-wide">Orozco Homes LLC</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Licensed General Contractor · Commonwealth of Virginia</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs font-semibold" style={{ color: GOLD }}>RESIDENTIAL REMODELING CONTRACT</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{values.client_name ? `Client: ${values.client_name}` : ''}</p>
                </div>
              </div>

              <div className="px-8 py-8 overflow-x-auto">
                <ContractPreview text={contractText} />
              </div>

              <div
                className="px-8 py-4 flex items-center justify-between"
                style={{ borderTop: `1px solid ${BORDER}`, backgroundColor: '#FAFAF8' }}
              >
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Orozco Homes LLC — orozcoventures@gmail.com</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  {values.client_name && values.project_address
                    ? `${values.client_name} · ${values.project_address}`
                    : 'Draft contract'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { label: 'Total Price',   value: fmtDollars(values.total_cost) },
                { label: 'Deposit',       value: fmtDollars(values.deposit_amount) },
                { label: 'Start Date',    value: fmtDate(values.start_date) },
                { label: 'Completion',    value: fmtDate(values.substantial_completion) },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl px-4 py-3"
                  style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}
                >
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>{label}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: NAVY }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'saved' && (
          <div
            className="rounded-2xl p-6 shadow-sm"
            style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ color: NAVY }}>Saved Contracts</h2>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl text-xs font-bold"
                style={{ backgroundColor: NAVY, color: GOLD }}
              >
                + New Contract
              </button>
            </div>
            <SavedList onLoad={(id) => handleLoadById(id)} refreshKey={listKey} />
          </div>
        )}
      </div>
    </div>
  );
}
