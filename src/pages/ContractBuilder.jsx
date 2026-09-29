// src/pages/ContractBuilder.jsx — Orozco Homes Contract Generator
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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

// ── Saved contracts list ──────────────────────────────────────────────────────
function SavedList({ onLoad }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('contracts')
      .select('id, client_name, project_address, contract_date, created_at, status')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setRows(data || []); setLoading(false); });
  }, []);

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
            style={{
              backgroundColor: r.status === 'signed' ? '#D1FAE5' : r.status === 'sent' ? '#DBEAFE' : '#F3F4F6',
              color: r.status === 'signed' ? '#065F46' : r.status === 'sent' ? '#1E40AF' : '#6B7280',
            }}
          >
            {r.status || 'draft'}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ContractBuilder() {
  const { isAdmin } = useAuth();

  const defaultValues = CONTRACT_FIELDS.reduce((acc, f) => {
    if (f.defaultValue) acc[f.key] = f.defaultValue;
    return acc;
  }, {});

  const [values,      setValues]      = useState(defaultValues);
  const [activeTab,   setActiveTab]   = useState('form');
  const [saving,      setSaving]      = useState(false);
  const [contractId,  setContractId]  = useState(null);
  const [toast,       setToast]       = useState({ msg: '', type: '' });
  const printRef = useRef();

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
    setActiveTab('form');
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        client_name:     values.client_name     || null,
        project_address: values.project_address || null,
        contract_date:   values.contract_date   || null,
        status:          'draft',
        form_data:       values,
      };
      let err;
      if (contractId) {
        ({ error: err } = await supabase.from('contracts').update(payload).eq('id', contractId));
      } else {
        const { data, error } = await supabase.from('contracts').insert(payload).select('id').single();
        err = error;
        if (data) setContractId(data.id);
      }
      if (err) throw err;
      showToast('Contract saved as draft.');
    } catch (e) {
      showToast(e.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleLoadById(id) {
    const { data, error } = await supabase.from('contracts').select('*').eq('id', id).single();
    if (error || !data) { showToast('Could not load contract.', 'error'); return; }
    setValues(data.form_data || {});
    setContractId(data.id);
    setActiveTab('form');
    showToast('Contract loaded.');
  }

  function handlePrint() {
    window.print();
  }

  const contractText = buildContractText(values);
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
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-colors duration-150"
              style={{ backgroundColor: saving ? '#E5E3DF' : NAVY, color: saving ? '#9CA3AF' : GOLD }}
            >
              {saving ? 'Saving…' : contractId ? 'Update Draft' : 'Save Draft'}
            </button>
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
      </div>

      <div className="px-6 pb-16 max-w-5xl mx-auto">

        {activeTab === 'form' && (
          <div
            className="rounded-2xl p-6 shadow-sm"
            style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}
          >
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
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-sm font-bold"
                style={{ backgroundColor: saving ? '#E5E3DF' : NAVY, color: saving ? '#9CA3AF' : GOLD }}
              >
                {saving ? 'Saving…' : contractId ? 'Update Draft' : 'Save Draft'}
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className="px-6 py-2.5 rounded-xl text-sm font-bold"
                style={{ backgroundColor: GOLD, color: NAVY }}
              >
                Preview Contract →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                Live preview — reflects current form values
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
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: GOLD }}
                >
                  <span className="font-extrabold text-xs" style={{ color: NAVY }}>OH</span>
                </div>
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
            <SavedList onLoad={(id) => handleLoadById(id)} />
          </div>
        )}
      </div>
    </div>
  );
}
