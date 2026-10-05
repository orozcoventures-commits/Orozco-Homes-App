// src/pages/Questionnaires.jsx — Pre-Consultation Questionnaires (admin)
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import QuestionnaireForm from '../components/QuestionnaireForm';
import QuestionnaireAnswers from '../components/QuestionnaireAnswers';
import {
  BUILT_IN_QUESTIONNAIRE, QUESTION_TYPES, CORE_QUESTIONS, normalizeQuestionnaire, newId,
  validateAnswers, cleanAnswers, contactFromAnswers, formatAnswer, allQuestions,
  questionnaireLinkUrl, websiteQuestionnaireUrl,
} from '../utils/questionnaireTemplate';

const COMPANY_PHONE = '757-513-2593';

const NAVY = '#002147';
const GOLD = '#D4AF37';
const BG = '#F5F4F0';
const BORDER = '#E8E6E1';

const STATUS = {
  sent:      { label: 'Waiting for customer', bg: '#DBEAFE', color: '#1E40AF' },
  submitted: { label: 'New',                  bg: '#FEF3C7', color: '#92400E' },
  reviewed:  { label: 'Reviewed',             bg: '#D1FAE5', color: '#065F46' },
};

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #oh-questionnaire-print, #oh-questionnaire-print * { visibility: visible !important; }
  #oh-questionnaire-print { position: absolute; top: 0; left: 0; width: 100%; padding: 0 !important; }
  @page { margin: 0.6in; }
}
`;

const iconBtn = { width: 30, height: 30, borderRadius: 8, fontSize: 13, fontWeight: 700, border: `1px solid ${BORDER}`, backgroundColor: '#fff', color: NAVY, flexShrink: 0 };
const dangerBtn = { ...iconBtn, color: '#DC2626', backgroundColor: '#FEF2F2', borderColor: '#FECACA' };
const inputCls = 'px-3 py-2 rounded-lg text-sm focus:outline-none';
const inputSty = { border: `1.5px solid ${BORDER}`, color: NAVY, backgroundColor: '#fff' };

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');

function friendlyError(err) {
  const msg = err?.message ?? String(err);
  if (/questionnaire\w* (does not exist|not found)|relation .*questionnaire/i.test(msg) || err?.code === '42P01' || err?.code === 'PGRST205') {
    return 'The questionnaire tables are not set up yet. Run migration 047 in Supabase.';
  }
  return msg;
}

const moveItem = (list, i, dir) => {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

// ── Question editor ─────────────────────────────────────────────────────────
function OptionsEditor({ q, onChange }) {
  const setOptions = (options) => onChange({ options });
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold mb-1.5" style={{ color: '#6B7280' }}>Choices</p>
      <div className="space-y-2">
        {q.options.map((o, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1 grid sm:grid-cols-2 gap-2">
              <input value={o.label} onChange={(e) => setOptions(q.options.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                aria-label={`Choice ${i + 1}`} placeholder="Choice" className={inputCls} style={inputSty} />
              <input value={o.description} onChange={(e) => setOptions(q.options.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                aria-label={`Choice ${i + 1} description`} placeholder="Description (optional)" className={inputCls} style={{ ...inputSty, color: '#374151' }} />
            </div>
            <button type="button" style={iconBtn} onClick={() => setOptions(moveItem(q.options, i, -1))} disabled={i === 0} aria-label={`Move choice ${i + 1} up`}>↑</button>
            <button type="button" style={iconBtn} onClick={() => setOptions(moveItem(q.options, i, 1))} disabled={i === q.options.length - 1} aria-label={`Move choice ${i + 1} down`}>↓</button>
            <button type="button" style={dangerBtn} onClick={() => setOptions(q.options.filter((_, j) => j !== i))} aria-label={`Remove choice ${o.label || i + 1}`}>✕</button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        <button type="button" onClick={() => setOptions([...q.options, { label: '', description: '' }])}
          className="text-xs font-bold" style={{ color: NAVY }}>+ Add choice</button>
        <label className="flex items-center gap-1.5 text-xs" style={{ color: '#6B7280' }}>
          <input type="checkbox" checked={!!q.other} onChange={(e) => onChange({ other: e.target.checked })} />
          Add an “Other” choice with a text box
        </label>
      </div>
    </div>
  );
}

function QuestionEditor({ q, index, count, onChange, onMove, onRemove }) {
  const core = CORE_QUESTIONS[q.id];
  const [open, setOpen] = useState(false);
  const setType = (type) => {
    const patch = { type };
    if ((type === 'single' || type === 'multi') && !q.options) { patch.options = [{ label: 'Option 1', description: '' }]; patch.other = false; }
    if (type === 'photos' && !q.maxFiles) patch.maxFiles = 5;
    onChange(patch);
  };
  return (
    <li className="rounded-xl p-3" style={{ border: `1.5px solid ${BORDER}`, backgroundColor: '#fff' }}>
      <div className="flex items-center gap-2 flex-wrap">
        <input value={q.label} onChange={(e) => onChange({ label: e.target.value })} aria-label={`Question ${index + 1}`}
          placeholder="Question" className={`flex-1 min-w-[200px] font-semibold ${inputCls}`} style={inputSty} />
        <select value={q.type} onChange={(e) => setType(e.target.value)} disabled={!!core} aria-label={`Question ${index + 1} type`}
          className={inputCls} style={{ ...inputSty, fontSize: '0.78rem' }}>
          {Object.entries(QUESTION_TYPES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs" style={{ color: '#6B7280' }}>
          <input type="checkbox" checked={q.required} onChange={(e) => onChange({ required: e.target.checked })} />
          Required
        </label>
        <button type="button" style={iconBtn} onClick={() => setOpen((o) => !o)} aria-expanded={open}
          aria-label={`${open ? 'Hide' : 'Show'} details for question ${index + 1}`} title="Details">{open ? '▴' : '▾'}</button>
        <button type="button" style={iconBtn} onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move question ${index + 1} up`}>↑</button>
        <button type="button" style={iconBtn} onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Move question ${index + 1} down`}>↓</button>
        {core
          ? <span style={{ ...iconBtn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }} title={`${core} — used to identify the customer, so it can't be removed`}>🔒</span>
          : <button type="button" style={dangerBtn} onClick={onRemove} aria-label={`Remove question ${q.label || index + 1}`}>✕</button>}
      </div>
      {open && (
        <div className="mt-3">
          <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }} htmlFor={`qh-${q.id}`}>Help text under the question (optional)</label>
          <textarea id={`qh-${q.id}`} value={q.help} onChange={(e) => onChange({ help: e.target.value })} rows={2}
            className={`w-full ${inputCls}`} style={{ ...inputSty, color: '#374151', resize: 'vertical' }} />
          {(q.type === 'single' || q.type === 'multi') && <OptionsEditor q={q} onChange={onChange} />}
          {q.type === 'photos' && (
            <label className="flex items-center gap-2 text-xs mt-3" style={{ color: '#6B7280' }}>
              Up to
              <input type="number" min={1} max={10} value={q.maxFiles} onChange={(e) => onChange({ maxFiles: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })}
                className={`w-16 ${inputCls}`} style={inputSty} aria-label="Maximum photos" />
              photos (10 MB each)
            </label>
          )}
          {core && <p className="text-xs mt-2" style={{ color: '#92400E' }}>🔒 {core}: used to identify the customer, so it can be reworded but not removed.</p>}
        </div>
      )}
    </li>
  );
}

function QuestionsEditor({ value, onChange }) {
  const setSections = (sections) => onChange({ ...value, sections });
  const setSection = (id, patch) => setSections(value.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSection = (s) => {
    if (s.questions.some((q) => CORE_QUESTIONS[q.id])) { alert('This section has the customer’s name or contact questions. Move or keep them before removing the section.'); return; }
    if (!confirm(`Remove the section "${s.title || 'Untitled'}" and its ${s.questions.length} question(s)?`)) return;
    setSections(value.sections.filter((x) => x.id !== s.id));
  };
  const addSection = () => setSections([...value.sections, { id: newId('s'), title: 'New Section', questions: [{ id: newId('q'), type: 'short', label: 'New question', help: '', required: false }] }]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: '#fff', border: `1.5px solid ${BORDER}` }}>
        <div>
          <label className="block text-xs font-bold mb-1" style={{ color: '#374151' }} htmlFor="qe-title">Title</label>
          <input id="qe-title" value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} className={`w-full ${inputCls}`} style={inputSty} />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1" style={{ color: '#374151' }} htmlFor="qe-intro">Welcome message (top of the form)</label>
          <textarea id="qe-intro" value={value.intro} onChange={(e) => onChange({ ...value, intro: e.target.value })} rows={3}
            className={`w-full ${inputCls}`} style={{ ...inputSty, color: '#374151', resize: 'vertical' }} />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1" style={{ color: '#374151' }} htmlFor="qe-closing">Thank-you message (after the customer submits)</label>
          <textarea id="qe-closing" value={value.closing} onChange={(e) => onChange({ ...value, closing: e.target.value })} rows={2}
            className={`w-full ${inputCls}`} style={{ ...inputSty, color: '#374151', resize: 'vertical' }} />
        </div>
      </div>

      {value.sections.map((s, si) => (
        <div key={s.id} className="rounded-2xl p-5" style={{ backgroundColor: '#FFFDF5', border: '1.5px solid #FDE68A' }}>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>Section {si + 1}</span>
            <input value={s.title} onChange={(e) => setSection(s.id, { title: e.target.value })} aria-label={`Section ${si + 1} title`}
              placeholder="Section heading" className={`flex-1 min-w-[180px] font-bold ${inputCls}`} style={inputSty} />
            <button type="button" style={iconBtn} onClick={() => setSections(moveItem(value.sections, si, -1))} disabled={si === 0} aria-label={`Move section ${s.title || si + 1} up`}>↑</button>
            <button type="button" style={iconBtn} onClick={() => setSections(moveItem(value.sections, si, 1))} disabled={si === value.sections.length - 1} aria-label={`Move section ${s.title || si + 1} down`}>↓</button>
            <button type="button" style={dangerBtn} onClick={() => removeSection(s)} aria-label={`Remove section ${s.title || si + 1}`}>✕</button>
          </div>
          <ol className="space-y-2">
            {s.questions.map((q, qi) => (
              <QuestionEditor key={q.id} q={q} index={qi} count={s.questions.length}
                onChange={(patch) => setSection(s.id, { questions: s.questions.map((x) => (x.id === q.id ? { ...x, ...patch } : x)) })}
                onMove={(dir) => setSection(s.id, { questions: moveItem(s.questions, qi, dir) })}
                onRemove={() => { if (confirm(`Remove the question "${q.label || 'Untitled'}"?`)) setSection(s.id, { questions: s.questions.filter((x) => x.id !== q.id) }); }} />
            ))}
          </ol>
          <button type="button" onClick={() => setSection(s.id, { questions: [...s.questions, { id: newId('q'), type: 'short', label: '', help: '', required: false }] })}
            className="mt-2 text-xs font-bold" style={{ color: NAVY }}>+ Add question</button>
        </div>
      ))}
      <button type="button" onClick={addSection} className="w-full px-4 py-3 rounded-xl text-xs font-bold"
        style={{ border: `1.5px dashed ${GOLD}`, color: NAVY, backgroundColor: 'transparent' }}>
        + Add section
      </button>
    </div>
  );
}

// ── Sending ─────────────────────────────────────────────────────────────────
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

function inviteMessage(name, url) {
  const first = (name || '').trim().split(/\s+/)[0];
  return `Hi${first ? ` ${first}` : ''},\n\nThank you for your interest in Orozco Homes! Before our consultation, please take a few minutes to fill out our Pre-Consultation Questionnaire:\n\n${url}\n\nThank you,\nOrozco Homes\n${COMPANY_PHONE}`;
}

function LinkPanel({ record, showToast }) {
  const url = questionnaireLinkUrl(record.access_token);
  const body = inviteMessage(record.respondent_name, url);
  const mailto = `mailto:${encodeURIComponent(record.respondent_email || '')}?subject=${encodeURIComponent('Orozco Homes – Pre-Consultation Questionnaire')}&body=${encodeURIComponent(body)}`;
  const sms = `sms:${(record.respondent_phone || '').replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(body)}`;
  const btn = { backgroundColor: '#fff', border: '1px solid #BFDBFE', color: '#1E40AF' };
  return (
    <div role="status" className="rounded-2xl p-4 mb-4" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
      <p className="text-sm font-bold mb-1">Waiting for {record.respondent_name || 'the customer'} to fill it out</p>
      <p className="text-xs mb-3">Send them this private link. It works once — after they submit, their answers show up here as <strong>New</strong>.</p>
      <div className="flex items-center gap-2 flex-wrap">
        <input readOnly value={url} aria-label="Questionnaire link" onFocus={(e) => e.target.select()}
          className="flex-1 min-w-[240px] px-3 py-2 rounded-lg text-xs font-mono focus:outline-none" style={{ border: '1px solid #BFDBFE', backgroundColor: '#fff', color: NAVY }} />
        <button onClick={async () => showToast(await copyText(url) ? 'Link copied.' : 'Could not copy — select the link and copy it.', 'success')}
          className="px-3 py-2 rounded-lg text-xs font-bold" style={{ backgroundColor: NAVY, color: GOLD }}>Copy link</button>
        <a href={mailto} className="px-3 py-2 rounded-lg text-xs font-bold" style={btn}>Email…</a>
        <a href={sms} className="px-3 py-2 rounded-lg text-xs font-bold" style={btn}>Text…</a>
      </div>
      <p className="text-xs mt-2" style={{ color: '#3B82F6' }}>“Email…” opens your email app with a ready-to-send message; “Text…” works from your phone.</p>
    </div>
  );
}

function SendDialog({ questionnaire, onClose, onCreated, showToast }) {
  const [f, setF] = useState({ name: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF((p) => ({ ...p, [k]: e.target.value })); setError(''); };

  async function handleCreate(e) {
    e.preventDefault();
    if (!f.name.trim()) { setError('Enter the customer’s name.'); return; }
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { setError('That email address doesn’t look right.'); return; }
    setBusy(true);
    const { data, error: err } = await supabase.from('questionnaires').insert({
      status: 'sent', source: 'link', questionnaire,
      respondent_name: f.name.trim(), respondent_email: f.email.trim(), respondent_phone: f.phone.trim(),
    }).select('*').single();
    setBusy(false);
    if (err) { setError(friendlyError(err)); return; }
    if (!data?.access_token) { setError('Run migration 048 in Supabase to turn on questionnaire links.'); return; }
    onCreated(data);
    showToast('Link created.');
  }

  const field = (k, label, type, extra) => (
    <div>
      <label htmlFor={`sd-${k}`} className="block text-xs font-bold mb-1" style={{ color: '#374151' }}>{label}</label>
      <input id={`sd-${k}`} type={type} value={f[k]} onChange={set(k)} className={`w-full ${inputCls}`} style={inputSty} {...extra} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,33,71,0.45)' }}
      role="dialog" aria-modal="true" aria-labelledby="sd-title" onClick={onClose}>
      <form onSubmit={handleCreate} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ backgroundColor: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div>
          <p id="sd-title" className="text-lg font-bold" style={{ color: NAVY }}>Send questionnaire</p>
          <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Creates a private link for this customer. Their name, email and phone are filled in for them.</p>
        </div>
        {field('name', 'Customer name *', 'text', { autoFocus: true, maxLength: 300 })}
        {field('email', 'Email (optional)', 'email', { maxLength: 300 })}
        {field('phone', 'Phone (optional)', 'tel', { maxLength: 50 })}
        {error && <p role="alert" className="text-xs font-semibold" style={{ color: '#DC2626' }}>{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ border: `1.5px solid ${BORDER}`, color: '#6B7280' }}>Cancel</button>
          <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ backgroundColor: NAVY, color: GOLD }}>
            {busy ? 'Creating…' : 'Create link'}
          </button>
        </div>
      </form>
    </div>
  );
}

function WebsiteLinkCard({ enabled, onToggle, busy, showToast }) {
  const url = websiteQuestionnaireUrl();
  return (
    <div className="rounded-2xl p-4 mb-4 flex items-center gap-3 flex-wrap" style={{ backgroundColor: '#fff', border: `1.5px solid ${BORDER}` }}>
      <div className="flex-1 min-w-[240px]">
        <p className="text-sm font-bold" style={{ color: NAVY }}>Website link {enabled ? <span style={{ color: '#059669' }}>· On</span> : <span style={{ color: '#9CA3AF' }}>· Off</span>}</p>
        <p className="text-xs" style={{ color: '#6B7280' }}>
          {enabled
            ? 'Anyone with this link can fill out the questionnaire — put it on your website or social media.'
            : 'Turn on to get one link anyone can use (for your website or social media), without sending it first.'}
        </p>
        {enabled && <p className="text-xs font-mono mt-1 break-all" style={{ color: NAVY }}>{url}</p>}
      </div>
      {enabled && (
        <button onClick={async () => showToast(await copyText(url) ? 'Website link copied.' : 'Could not copy — select the link and copy it.')}
          className="px-3 py-2 rounded-lg text-xs font-bold" style={{ backgroundColor: NAVY, color: GOLD }}>Copy link</button>
      )}
      <button onClick={onToggle} disabled={busy} className="px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
        style={enabled ? { border: `1px solid ${BORDER}`, color: '#6B7280', backgroundColor: '#fff' } : { backgroundColor: '#059669', color: '#fff' }}>
        {enabled ? 'Turn off' : 'Turn on'}
      </button>
    </div>
  );
}

// ── Responses ───────────────────────────────────────────────────────────────
function ResponseList({ rows, onOpen, filter, setFilter }) {
  const counts = rows.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {});
  const shown = filter === 'all' ? rows : rows.filter((r) => r.status === filter);
  const chips = [['all', `All (${rows.length})`], ['submitted', `New (${counts.submitted ?? 0})`], ['reviewed', `Reviewed (${counts.reviewed ?? 0})`]];
  if (counts.sent) chips.push(['sent', `Waiting (${counts.sent})`]);
  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-4">
        {chips.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={filter === k ? { backgroundColor: NAVY, color: GOLD } : { backgroundColor: '#fff', color: '#6B7280', border: `1px solid ${BORDER}` }}>
            {label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="text-xs text-center py-10" style={{ color: '#9CA3AF' }}>
          {rows.length === 0 ? 'No questionnaires yet.' : 'Nothing here.'}
        </p>
      ) : (
        <div className="space-y-2">
          {shown.map((r) => {
            const st = STATUS[r.status] ?? STATUS.submitted;
            const typeQ = allQuestions(r.questionnaire).find((q) => q.id === 'project_type');
            const projectType = typeQ ? formatAnswer(typeQ, r.answers) : '';
            return (
              <button key={r.id} onClick={() => onOpen(r)}
                className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3"
                style={{ border: `1px solid ${r.status === 'submitted' ? '#FCD34D' : BORDER}`, backgroundColor: '#fff' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{r.respondent_name || 'Unnamed customer'}</p>
                  <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                    {[projectType, r.project_address, r.submitted_at ? `Submitted ${fmtDate(r.submitted_at)}` : `Link created ${fmtDate(r.created_at)}`,
                      { public: 'from website link', admin: 'entered by you' }[r.source]].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResponseDetail({ record, onBack, onChanged, onDeleted, showToast }) {
  const [notes, setNotes] = useState(record.admin_notes ?? '');
  const [busy, setBusy] = useState(false);

  async function update(patch, okMsg) {
    setBusy(true);
    const { data, error } = await supabase.from('questionnaires').update(patch).eq('id', record.id).select('*').single();
    setBusy(false);
    if (error) { showToast(friendlyError(error), 'error'); return; }
    onChanged(data);
    if (okMsg) showToast(okMsg);
  }

  async function handleDelete() {
    if (!confirm(`Delete ${record.respondent_name || 'this customer'}'s questionnaire? This cannot be undone.`)) return;
    setBusy(true);
    const { error } = await supabase.from('questionnaires').delete().eq('id', record.id);
    setBusy(false);
    if (error) { showToast(friendlyError(error), 'error'); return; }
    onDeleted(record.id);
    showToast('Questionnaire deleted.');
  }

  const reviewed = record.status === 'reviewed';
  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <button onClick={onBack} className="text-xs font-bold" style={{ color: NAVY }}>← All questionnaires</button>
        <div className="flex items-center gap-2 flex-wrap">
          {record.status !== 'sent' && (
            <button onClick={() => update(reviewed ? { status: 'submitted', reviewed_at: null } : { status: 'reviewed', reviewed_at: new Date().toISOString() },
              reviewed ? 'Marked as new.' : 'Marked as reviewed.')}
              disabled={busy} className="px-4 py-2 rounded-xl text-xs font-bold"
              style={reviewed ? { border: `1.5px solid ${BORDER}`, backgroundColor: '#fff', color: '#6B7280' } : { backgroundColor: '#059669', color: '#fff' }}>
              {reviewed ? 'Mark as new' : '✓ Mark as reviewed'}
            </button>
          )}
          {record.status !== 'sent' && (
            <button onClick={() => window.print()} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ backgroundColor: GOLD, color: NAVY }}>
              Print / PDF
            </button>
          )}
          <button onClick={handleDelete} disabled={busy} className="px-4 py-2 rounded-xl text-xs font-bold"
            style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
            Delete
          </button>
        </div>
      </div>

      {record.status === 'sent' && record.access_token && <LinkPanel record={record} showToast={showToast} />}

      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: '#fff', border: `1.5px solid ${BORDER}` }}>
        <label htmlFor="q-notes" className="block text-xs font-bold mb-1" style={{ color: '#374151' }}>
          Your notes for the consultation <span className="font-normal" style={{ color: '#9CA3AF' }}>— only you see these</span>
        </label>
        <textarea id="q-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={5000}
          className={`w-full ${inputCls}`} style={{ ...inputSty, color: '#374151', resize: 'vertical' }} />
        <div className="flex justify-end mt-2">
          <button onClick={() => update({ admin_notes: notes.trim() }, 'Notes saved.')} disabled={busy || notes.trim() === (record.admin_notes ?? '')}
            className="px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50" style={{ backgroundColor: NAVY, color: GOLD }}>
            Save notes
          </button>
        </div>
      </div>

      {record.status !== 'sent' && (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,33,71,0.08)' }}>
          <QuestionnaireAnswers record={record} id="oh-questionnaire-print" />
        </div>
      )}
    </div>
  );
}

function ManualEntry({ questionnaire, onCancel, onSaved, showToast }) {
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    // Answers taken over the phone may be incomplete: only the name is required,
    // but whatever is filled in must be valid.
    const all = validateAnswers(questionnaire, answers);
    const errs = Object.fromEntries(Object.entries(all).filter(([id, msg]) => id === 'full_name' || msg !== 'This question is required.'));
    if (!answers.full_name?.trim()) errs.full_name = 'Enter the customer’s name.';
    setErrors(errs);
    if (Object.keys(errs).length) { showToast('Please fix the highlighted answers.', 'error'); return; }
    setSaving(true);
    const clean = cleanAnswers(questionnaire, answers);
    const { data, error } = await supabase.from('questionnaires').insert({
      status: 'submitted', source: 'admin', questionnaire, answers: clean, ...contactFromAnswers(clean),
      submitted_at: new Date().toISOString(),
    }).select('*').single();
    setSaving(false);
    if (error) { showToast(friendlyError(error), 'error'); return; }
    onSaved(data);
    showToast('Questionnaire saved.');
  }

  return (
    <div>
      <div role="note" className="mb-4 px-4 py-3 rounded-xl text-xs" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
        <strong>Entering answers for a customer</strong> (for example, over the phone). Only the customer’s name is required here.
      </div>
      <QuestionnaireForm questionnaire={questionnaire} answers={answers} onChange={setAnswers} errors={errors}
        footer={(
          <div className="flex items-center justify-end gap-2 pb-4">
            <button onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-bold" style={{ border: `1.5px solid ${BORDER}`, backgroundColor: '#fff', color: '#6B7280' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-bold" style={{ backgroundColor: NAVY, color: GOLD }}>
              {saving ? 'Saving…' : 'Save answers'}
            </button>
          </div>
        )} />
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function Questionnaires() {
  const [activeTab, setActiveTab] = useState('responses');
  const [saved, setSaved] = useState(null);          // saved default questionnaire, or null
  const [publicEnabled, setPublicEnabled] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState(() => normalizeQuestionnaire(BUILT_IN_QUESTIONNAIRE));
  const [dirty, setDirty] = useState(false);
  const [savingTpl, setSavingTpl] = useState(false);
  const [rows, setRows] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('all');
  const [openRecord, setOpenRecord] = useState(null);
  const [entering, setEntering] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState({});
  const [previewErrors, setPreviewErrors] = useState({});
  const [toast, setToast] = useState({ msg: '', type: '' });

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3500);
  }, []);

  useEffect(() => {
    supabase.from('questionnaire_templates').select('*').eq('id', 'default').maybeSingle()
      .then(({ data }) => {
        setPublicEnabled(!!data?.public_enabled);
        if (data?.questionnaire) {
          const q = normalizeQuestionnaire(data.questionnaire);
          setSaved(q);
          setDraft(q);
        }
      });
    supabase.from('questionnaires').select('*').order('created_at', { ascending: false }).limit(200)
      .then(({ data, error }) => {
        if (error) setLoadError(friendlyError(error));
        setRows(data ?? []);
      });
  }, []);

  const current = saved ?? normalizeQuestionnaire(BUILT_IN_QUESTIONNAIRE);

  function editDraft(next) { setDraft(next); setDirty(true); }

  async function handleSaveTemplate() {
    const q = normalizeQuestionnaire(draft);
    const blank = allQuestions(q).find((x) => !x.label.trim());
    if (blank) { showToast('Every question needs wording before saving.', 'error'); return; }
    const noChoices = allQuestions(q).find((x) => (x.type === 'single' || x.type === 'multi') && x.options.length === 0);
    if (noChoices) { showToast(`"${noChoices.label}" needs at least one choice.`, 'error'); return; }
    setSavingTpl(true);
    const { error } = await supabase.from('questionnaire_templates').upsert({ id: 'default', questionnaire: q });
    setSavingTpl(false);
    if (error) { showToast(friendlyError(error), 'error'); return; }
    setSaved(q); setDraft(q); setDirty(false);
    showToast('Questions saved. New questionnaires will use them.');
  }

  async function handleTogglePublic() {
    const next = !publicEnabled;
    if (next && !confirm('Turn on the website link? Anyone with the link will be able to fill out the questionnaire.')) return;
    setTogglingPublic(true);
    // Saves the current questions too, so the website link has them.
    const { error } = await supabase.from('questionnaire_templates').upsert({ id: 'default', questionnaire: current, public_enabled: next });
    setTogglingPublic(false);
    if (error) { showToast(/public_enabled/.test(error.message) ? 'Run migration 048 in Supabase to turn on the website link.' : friendlyError(error), 'error'); return; }
    if (!saved) setSaved(current);
    setPublicEnabled(next);
    showToast(next ? 'Website link is on.' : 'Website link is off.');
  }

  function handleResetOriginal() {
    if (!confirm('Replace your questions with the original Orozco Homes questionnaire? Click Save afterwards to keep it.')) return;
    editDraft(normalizeQuestionnaire(BUILT_IN_QUESTIONNAIRE));
  }

  function handleUndo() {
    setDraft(current); setDirty(false);
  }

  const tabStyle = (active) => ({
    padding: '0.5rem 1.25rem', fontSize: '0.78rem', fontWeight: active ? '700' : '500', borderRadius: '8px',
    cursor: 'pointer', backgroundColor: active ? NAVY : 'transparent', color: active ? GOLD : '#6B7280', border: 'none',
  });
  const newCount = (rows ?? []).filter((r) => r.status === 'submitted').length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>
      <style>{PRINT_CSS}</style>
      {sending && (
        <SendDialog questionnaire={current} onClose={() => setSending(false)} showToast={showToast}
          onCreated={(r) => { setSending(false); setRows((p) => [r, ...(p ?? [])]); setOpenRecord(r); setActiveTab('responses'); }} />
      )}
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
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: GOLD }}>Questionnaires</p>
            <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Pre-Consultation Questionnaire</h1>
            <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>Review what customers tell you before the consultation meeting.</p>
          </div>
          {activeTab === 'responses' && !entering && !openRecord && (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setEntering(true)} className="px-4 py-2 rounded-xl text-xs font-bold"
                style={{ border: `1.5px solid ${BORDER}`, backgroundColor: '#fff', color: NAVY }}>
                + Enter answers for a customer
              </button>
              <button onClick={() => setSending(true)} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ backgroundColor: NAVY, color: GOLD }}>
                Send questionnaire
              </button>
            </div>
          )}
        </div>
        <div className="flex p-1 rounded-xl w-fit" style={{ backgroundColor: '#EDEBE6' }}>
          {[['responses', `Responses${newCount ? ` (${newCount} new)` : ''}`], ['questions', 'Questions'], ['preview', 'Preview']].map(([key, label]) => (
            <button key={key} style={tabStyle(activeTab === key)} onClick={() => setActiveTab(key)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="px-6 pb-16 max-w-5xl mx-auto">
        {activeTab === 'responses' && (
          entering ? (
            <ManualEntry questionnaire={current} onCancel={() => setEntering(false)} showToast={showToast}
              onSaved={(r) => { setRows((p) => [r, ...(p ?? [])]); setEntering(false); setOpenRecord(r); }} />
          ) : openRecord ? (
            <ResponseDetail key={openRecord.id} record={openRecord} onBack={() => setOpenRecord(null)} showToast={showToast}
              onChanged={(r) => { setOpenRecord(r); setRows((p) => p.map((x) => (x.id === r.id ? r : x))); }}
              onDeleted={(id) => { setOpenRecord(null); setRows((p) => p.filter((x) => x.id !== id)); }} />
          ) : (
            <div>
            <WebsiteLinkCard enabled={publicEnabled} onToggle={handleTogglePublic} busy={togglingPublic} showToast={showToast} />
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: `1.5px solid ${BORDER}` }}>
              {loadError && <p role="alert" className="text-xs font-semibold mb-4" style={{ color: '#DC2626' }}>{loadError}</p>}
              {rows ? <ResponseList rows={rows} onOpen={setOpenRecord} filter={filter} setFilter={setFilter} />
                : <p className="text-xs text-center py-6" style={{ color: '#9CA3AF' }}>Loading…</p>}
            </div>
            </div>
          )
        )}

        {activeTab === 'questions' && (
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4 px-4 py-3 rounded-xl"
              style={{ backgroundColor: dirty ? '#FFFBEB' : '#fff', border: `1px solid ${dirty ? '#FCD34D' : BORDER}` }}>
              <p className="text-xs" style={{ color: dirty ? '#92400E' : '#6B7280', maxWidth: 520 }}>
                {dirty ? 'You have unsaved changes.' : 'Edit, add, remove or reorder questions. Click ▾ for help text and choices.'}
                {' '}Questionnaires already sent or answered keep the questions they had.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={handleResetOriginal} className="text-xs font-semibold underline" style={{ color: '#6B7280' }}>Original questions</button>
                {dirty && <button onClick={handleUndo} className="text-xs font-semibold underline" style={{ color: '#6B7280' }}>Undo changes</button>}
                <button onClick={handleSaveTemplate} disabled={savingTpl || !dirty} className="px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                  style={{ backgroundColor: NAVY, color: GOLD }}>
                  {savingTpl ? 'Saving…' : 'Save questions'}
                </button>
              </div>
            </div>
            <QuestionsEditor value={draft} onChange={editDraft} />
          </div>
        )}

        {activeTab === 'preview' && (
          <div>
            <div role="note" className="mb-4 px-4 py-3 rounded-xl text-xs max-w-2xl mx-auto" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
              This is what customers will see{dirty ? ' (including your unsaved changes)' : ''}. Try it out — nothing is saved.
            </div>
            <QuestionnaireForm questionnaire={normalizeQuestionnaire(draft)} answers={previewAnswers} onChange={setPreviewAnswers} errors={previewErrors}
              footer={(
                <div className="flex items-center justify-end gap-3 pb-4">
                  {Object.keys(previewErrors).length === 0 && Object.keys(previewAnswers).length > 0 && (
                    <span className="text-xs font-semibold" style={{ color: '#059669' }}>Everything required is filled in.</span>
                  )}
                  <button onClick={() => setPreviewErrors(validateAnswers(normalizeQuestionnaire(draft), previewAnswers))}
                    className="px-6 py-3 rounded-xl text-sm font-bold" style={{ backgroundColor: NAVY, color: GOLD }}>
                    Submit (preview)
                  </button>
                </div>
              )} />
          </div>
        )}
      </div>
    </div>
  );
}
