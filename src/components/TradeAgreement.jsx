// Subcontract Agreement for one trade (Remodel Estimates → Subs & Materials,
// migration 060). Builds on what the trade already has — "Performed by", the
// selected bid, the Scope of work and the work items — and adds the job terms
// (address, price, payment schedule, dates). Send gives the subcontractor a
// private link to sign; Orozco Homes countersigns here. The Subcontractor
// Standards (Exhibit A + the trade's Exhibit B) are included automatically.
import { useEffect, useState } from 'react';
import SubAgreementDocument from './SubAgreementDocument';
import {
  AGREEMENT_STATUS, PAYMENT_ROWS_MAX, defaultTerms, paymentAmounts, paymentPctTotal, sendProblem, subAgreementUrl, toAmount,
} from '../utils/subAgreement';
import { fmtLongDate } from '../utils/proposalTemplate';

const fmt = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
const box = { border: '1px solid #D1D5DB', color: '#002147', backgroundColor: '#fff' };
const btn = (primary) => (primary
  ? { backgroundColor: '#0369A1', color: '#fff' }
  : { border: '1px solid #D1D5DB', color: '#374151', backgroundColor: '#fff' });

function Field({ label, children, wide }) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="block font-bold mb-0.5" style={{ color: '#6B7280' }}>{label}</span>
      {children}
    </label>
  );
}

function Preview({ snap, record, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Agreement preview" className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'rgba(0,33,71,0.55)' }}>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ backgroundColor: '#002147' }}>
        <button type="button" onClick={onClose} className="text-sm font-semibold" style={{ color: '#D4AF37' }}>← Close preview</button>
        <p className="flex-1 text-sm font-bold text-white truncate">What the subcontractor sees</p>
      </div>
      <div className="flex-1 overflow-y-auto py-4 px-2">
        <div className="max-w-3xl mx-auto rounded-xl overflow-hidden">
          <SubAgreementDocument snap={snap} record={record} />
        </div>
      </div>
    </div>
  );
}

function Terms({ trade, terms, setTerms, api }) {
  const set = (k) => (e) => setTerms({ ...terms, [k]: e.target.value });
  const bid = api.selectedBid(trade.key);
  const rows = paymentAmounts(terms.amount, terms.payments);
  const pct = paymentPctTotal(terms.payments);
  const setPay = (i, k, v) => setTerms({ ...terms, payments: terms.payments.map((p, j) => (j === i ? { ...p, [k]: v } : p)) });
  const ta = (k, rows = 2) => (
    <textarea value={terms[k]} onChange={set(k)} rows={rows} maxLength={2000} className="w-full px-2 py-1 rounded-md focus:outline-none" style={box} />
  );
  return (
    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2.5">
      <Field label="Job address *">
        <input value={terms.job_address} onChange={set('job_address')} maxLength={300} className="w-full px-2 py-1 rounded-md focus:outline-none" style={box} />
      </Field>
      <Field label="Sub's onsite lead">
        <input value={terms.onsite_lead} onChange={set('onsite_lead')} maxLength={120} placeholder="Name and phone" className="w-full px-2 py-1 rounded-md focus:outline-none" style={box} />
      </Field>
      <Field label="Subcontract price *">
        <span className="flex flex-wrap items-center gap-2">
          <span className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9CA3AF' }}>$</span>
            <input value={terms.amount} onChange={(e) => setTerms({ ...terms, amount: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal"
              aria-label={`Subcontract price for ${trade.label}`} className="w-32 pl-5 pr-2 py-1 rounded-md text-right focus:outline-none" style={box} />
          </span>
          {bid && toAmount(terms.amount) !== toAmount(bid.amount) && (
            <button type="button" onClick={() => setTerms({ ...terms, amount: String(bid.amount) })} className="underline font-semibold" style={{ color: '#0369A1' }}>
              Use selected bid ({fmt(bid.amount)})
            </button>
          )}
          <span style={{ color: '#9CA3AF' }}>Budget {fmt(trade.total)}</span>
        </span>
      </Field>
      <Field label="Start date / completion target">
        <span className="flex flex-wrap gap-2">
          <input type="date" value={terms.start_date} onChange={set('start_date')} aria-label="Start date" className="px-2 py-1 rounded-md focus:outline-none" style={box} />
          <input type="date" value={terms.finish_date} onChange={set('finish_date')} aria-label="Completion target" className="px-2 py-1 rounded-md focus:outline-none" style={box} />
        </span>
      </Field>
      <div className="sm:col-span-2">
        <span className="block font-bold mb-0.5" style={{ color: '#6B7280' }}>Payment schedule *</span>
        <table className="w-full" data-testid={`agreement-payments-${trade.key}`}>
          <tbody>
            {terms.payments.map((p, i) => (
              <tr key={i}>
                <td className="py-0.5 pr-2 w-5" style={{ color: '#9CA3AF' }}>{i + 1}.</td>
                <td className="py-0.5 pr-2">
                  <input value={p.label} onChange={(e) => setPay(i, 'label', e.target.value.slice(0, 200))} aria-label={`Payment ${i + 1} milestone`}
                    className="w-full px-2 py-1 rounded-md focus:outline-none" style={box} />
                </td>
                <td className="py-0.5 pr-2 w-20">
                  <span className="relative block">
                    <input value={p.pct} onChange={(e) => setPay(i, 'pct', e.target.value.replace(/[^0-9.]/g, '').slice(0, 5))} inputMode="decimal"
                      aria-label={`Payment ${i + 1} percent`} className="w-full pl-2 pr-5 py-1 rounded-md text-right focus:outline-none" style={box} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9CA3AF' }}>%</span>
                  </span>
                </td>
                <td className="py-0.5 pr-2 w-24 text-right font-semibold" style={{ color: '#002147' }}>{fmt(rows[i]?.amount)}</td>
                <td className="py-0.5 w-12 text-right">
                  {terms.payments.length > 1 && (
                    <button type="button" onClick={() => setTerms({ ...terms, payments: terms.payments.filter((_, j) => j !== i) })}
                      className="underline" style={{ color: '#9CA3AF' }} aria-label={`Remove payment ${i + 1}`}>Remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <span className="flex flex-wrap items-center gap-3 mt-1">
          {terms.payments.length < PAYMENT_ROWS_MAX && (
            <button type="button" onClick={() => setTerms({ ...terms, payments: [...terms.payments, { label: '', pct: Math.max(0, 100 - pct) }] })}
              className="underline font-semibold" style={{ color: '#0369A1' }}>+ Add payment</button>
          )}
          <span style={{ color: Math.abs(pct - 100) < 0.001 ? '#059669' : '#B45309', fontWeight: 700 }}>Total {pct}%{Math.abs(pct - 100) < 0.001 ? '' : ' — must be 100%'}</span>
        </span>
      </div>
      <Field label="Dependencies (what must be done first)">{ta('dependencies')}</Field>
      <Field label="Approved drawings / selections / specs">{ta('drawings')}</Field>
      <Field label="Exclusions and assumptions">{ta('exclusions')}</Field>
      <Field label="Permits and inspections">{ta('permits')}</Field>
      <Field label="Site protection / access / work hours" wide>{ta('site_notes')}</Field>
    </div>
  );
}

export default function TradeAgreement({ trade, api, sub }) {
  const ag = api.current(trade.key);
  const status = ag?.status ?? 'none';
  const chip = AGREEMENT_STATUS[status];
  const ready = status === 'countersigned' && (sub.coi === 'active' || sub.coi === 'expiring');
  const [open, setOpen] = useState(false);
  const [termsState, setTerms] = useState(null);
  const [termsFor, setTermsFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [cs, setCs] = useState(api.rep);
  // The draft's terms being edited; reset when the agreement changes.
  const savedTerms = ag ? { ...defaultTerms(trade.key), ...ag.terms } : null;
  const switched = (ag?.id ?? null) !== termsFor;
  if (switched) { setTermsFor(ag?.id ?? null); setTerms(savedTerms); }
  const terms = switched ? savedTerms : termsState;
  const dirty = ag?.status === 'draft' && JSON.stringify(terms) !== JSON.stringify(savedTerms);
  const msg = api.msg?.trade === trade.key ? api.msg : null;
  const id = `agreement-${trade.key}`;
  const run = async (fn) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  const problem = ag?.status === 'draft' ? sendProblem({ terms, sub: sub.sub, scope: api.scopeOf(trade.key) }) : null;
  const url = ag && ag.status !== 'draft' ? subAgreementUrl(ag.access_token) : '';
  const mailto = ag && sub.sub ? `mailto:${encodeURIComponent(sub.sub.email?.[0] ?? '')}?subject=${encodeURIComponent(`Orozco Homes – Subcontract Agreement – ${trade.label}`)}&body=${encodeURIComponent(`Hello,\n\nPlease review and sign the Orozco Homes Subcontract Agreement for ${trade.label}, including our Subcontractor Standards:\n${url}\n\nThank you,\n${api.rep.name}\nOrozco Homes`)}` : '';

  return (
    <div className="px-5 py-2" style={{ borderTop: '1px solid #F3F4F6', backgroundColor: open ? '#FAFDFF' : '#fff' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={id}
        className="flex flex-wrap items-center gap-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-300 rounded" style={{ color: '#0369A1' }}>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'none' }} aria-hidden="true"><polyline points="4 1 8 6 4 11" /></svg>
        Agreement &amp; standards
        <span className="font-semibold px-1.5 py-0.5 rounded" data-agreement-status={status}
          style={{ color: chip.color, backgroundColor: chip.bg, border: `1px solid ${chip.border}` }}>{chip.label}</span>
        {ready && <span className="font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#ECFDF5', color: '#065F46' }} data-testid={`ready-${trade.key}`}>✓ Ready to start</span>}
        {status === 'countersigned' && !ready && <span className="font-semibold" style={{ color: '#B45309' }}>COI needed before start</span>}
      </button>
      {open && (
        <div id={id} className="mt-2 text-xs space-y-2.5">
          {api.missing ? (
            <p role="alert" className="font-semibold" style={{ color: '#DC2626' }}>Agreements are not set up yet — run migration 060 in Supabase first.</p>
          ) : !ag ? (
            <>
              <p style={{ color: '#4B5563' }}>
                The Subcontract Agreement for {trade.label}: Exhibit C (Scope of Work) is filled in from this trade — Performed by, the scope of work and the
                work items above — and the Subcontractor Standards (Exhibit A + the {trade.label} section of Exhibit B) are included automatically.
                You add the price, payment schedule and dates.
              </p>
              <button type="button" disabled={busy || !sub.sub} onClick={() => run(() => api.create(trade))}
                className="px-3 py-1.5 rounded-lg font-bold disabled:opacity-50" style={btn(true)}>Create agreement</button>
              {!sub.sub && <span className="ml-2" style={{ color: '#B45309' }}>Pick who performs this trade ("Performed by") first.</span>}
            </>
          ) : ag.status === 'draft' ? (
            <>
              <Terms trade={trade} terms={terms} setTerms={setTerms} api={api} />
              <p style={{ color: '#9CA3AF' }}>
                Scope of work and work items come from this trade above. Standards: the latest version from Subcontractors → Standards is added when you send.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" disabled={busy || !dirty} onClick={() => run(() => api.save(ag, terms))} className="px-3 py-1.5 rounded-lg font-bold disabled:opacity-50" style={btn(false)}>
                  {dirty ? 'Save draft' : 'Draft saved'}
                </button>
                <button type="button" disabled={busy} onClick={() => run(async () => { const snap = await api.buildSnapshot(terms, trade); if (snap) setPreview({ snap, record: {} }); })}
                  className="px-3 py-1.5 rounded-lg font-bold disabled:opacity-50" style={btn(false)}>Preview</button>
                <button type="button" disabled={busy || !!problem} onClick={() => run(() => api.send(ag, terms, trade))}
                  className="px-3 py-1.5 rounded-lg font-bold disabled:opacity-50" style={btn(true)} title={problem ?? ''}>Send for signature</button>
                <button type="button" disabled={busy} onClick={() => run(() => api.remove(ag))} className="ml-auto underline" style={{ color: '#9CA3AF' }}>Delete draft</button>
              </div>
              {problem && <p style={{ color: '#B45309' }}>Before sending: {problem}</p>}
            </>
          ) : (
            <>
              <p style={{ color: '#374151' }}>
                With <b>{ag.sub_name}</b> · {fmt(ag.snapshot?.amount)} · {ag.snapshot?.standards?.version_label} ·
                sent {fmtLongDate(ag.sent_at?.slice(0, 10))}
                {ag.sub_signed_at && <> · signed by <b>{ag.sub_signature?.name}</b>{ag.sub_signature?.title ? `, ${ag.sub_signature.title}` : ''} on {fmtLongDate(ag.sub_signed_at.slice(0, 10))}</>}
                {ag.contractor_signed_at && <> · countersigned by <b>{ag.contractor_signature?.name}</b> on {fmtLongDate(ag.contractor_signed_at.slice(0, 10))}</>}
              </p>
              {sub.pick && ag.sub_id != null && sub.pick.id !== ag.sub_id && (
                <p style={{ color: '#B45309' }}>"Performed by" is now {sub.pick.name}, but this agreement is with {ag.sub_name}.</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Agreement link" className="flex-1 min-w-[220px] px-2 py-1 rounded-md" style={{ ...box, color: '#6B7280' }} />
                <button type="button" onClick={() => api.copy(trade.key, url)} className="px-3 py-1.5 rounded-lg font-bold" style={btn(ag.status === 'sent')}>Copy link</button>
                {ag.status === 'sent' && <a href={mailto} className="px-3 py-1.5 rounded-lg font-bold" style={btn(false)}>Email…</a>}
                <a href={url} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg font-bold" style={btn(false)}>Open / print</a>
              </div>
              {ag.status === 'sent' && (
                <div className="flex flex-wrap gap-3">
                  <button type="button" disabled={busy} onClick={() => run(() => api.recall(ag))} className="underline font-semibold" style={{ color: '#0369A1' }}>Take back to edit</button>
                  <button type="button" disabled={busy} onClick={() => run(() => api.remove(ag))} className="underline" style={{ color: '#9CA3AF' }}>Cancel agreement</button>
                </div>
              )}
              {ag.status === 'signed' && (
                <form onSubmit={(e) => { e.preventDefault(); run(() => api.countersign(ag, cs)); }} className="flex flex-wrap items-end gap-2 p-3 rounded-lg" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <Field label="Countersign for Orozco Homes — your full name">
                    <input value={cs.name} onChange={(e) => setCs({ ...cs, name: e.target.value })} maxLength={100} className="w-52 px-2 py-1 rounded-md focus:outline-none" style={box} />
                  </Field>
                  <Field label="Title">
                    <input value={cs.title} onChange={(e) => setCs({ ...cs, title: e.target.value })} maxLength={100} className="w-32 px-2 py-1 rounded-md focus:outline-none" style={box} />
                  </Field>
                  <button type="submit" disabled={busy || !cs.name.trim()} className="px-3 py-1.5 rounded-lg font-bold disabled:opacity-50" style={{ backgroundColor: '#059669', color: '#fff' }}>Countersign</button>
                </form>
              )}
              {ag.status === 'countersigned' && (
                <button type="button" disabled={busy} onClick={() => { if (confirm(`Start a new agreement for ${trade.label}? Use this only for a new or changed scope — the signed agreement stays on file.`)) run(() => api.create(trade)); }}
                  className="underline" style={{ color: '#6B7280' }}>New agreement for a changed scope</button>
              )}
              {api.count(trade.key) > 1 && <p style={{ color: '#9CA3AF' }}>{api.count(trade.key) - 1} earlier signed agreement{api.count(trade.key) > 2 ? 's' : ''} for this trade on file.</p>}
            </>
          )}
          {msg && <p role={msg.status === 'error' ? 'alert' : 'status'} className="font-semibold" style={{ color: msg.status === 'error' ? '#DC2626' : '#059669' }}>{msg.text}</p>}
        </div>
      )}
      {preview && <Preview snap={preview.snap} record={preview.record} onClose={() => setPreview(null)} />}
    </div>
  );
}
