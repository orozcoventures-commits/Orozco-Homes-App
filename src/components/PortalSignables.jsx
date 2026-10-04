// src/components/PortalSignables.jsx — proposals and contracts in the PIN client portal
//
// Lists the documents the contractor sent to this project and lets the client
// read the frozen copy, then accept & sign (typed names + agreement) or
// decline. All calls go through the PIN-guarded functions in migrations
// 041 (proposals) and 042 (contracts).
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import ProposalDocument from './ProposalDocument';
import { fmtLongDate, investmentRange } from '../utils/proposalTemplate';
import { buildContractText, fmtDollars } from '../utils/contractHelpers';

const NAVY = '#002147';
const GOLD = '#D4AF37';

const AWAITING = { label: 'Awaiting your signature', bg: '#FFFBEB', color: '#92400E', border: '#FCD34D' };
const SIGNED   = { label: 'Signed',                  bg: '#ECFDF5', color: '#065F46', border: '#6EE7B7' };
const DECLINED = { label: 'Declined',                bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' };

const consent = (docName) =>
  `By typing my name and clicking “Accept & Sign”, I agree to sign this ${docName} electronically. ` +
  'I understand my electronic signature has the same effect as my handwritten signature.';

function ContractDocument({ doc, id }) {
  const text = buildContractText(doc.snapshot ?? {}, { clients: doc.signatures ?? [], contractor: doc.contractor_signature });
  return (
    <div id={id} style={{ backgroundColor: '#fff' }}>
      <div className="px-5 py-4 flex items-center gap-3" style={{ backgroundColor: NAVY, borderBottom: `3px solid ${GOLD}` }}>
        <img src="/orozco-homes-logo.png" alt="Orozco Homes" className="h-9 rounded-lg w-auto shrink-0 object-contain" />
        <div>
          <p className="font-bold text-white text-sm tracking-wide">Orozco Homes LLC</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Residential Remodeling Contract</p>
        </div>
      </div>
      <pre className="whitespace-pre-wrap break-words px-5 py-6 text-xs font-mono" style={{ color: '#1a1a2e', lineHeight: 1.75 }}>{text}</pre>
    </div>
  );
}

const KINDS = {
  proposal: {
    section: 'Proposals',
    docName: 'Project Retainer Agreement',
    listFn: 'get_pin_proposals', signFn: 'sign_pin_proposal', declineFn: 'decline_pin_proposal', idParam: 'p_proposal_id',
    status: { sent: AWAITING, accepted: SIGNED, declined: DECLINED },
    title: (d) => d.snapshot?.project_title || 'Project Retainer Agreement',
    detail: (d) => { const r = investmentRange(d.snapshot ?? {}); return r ? `Estimated ${r}` : ''; },
    signedNote: (d) => `✓ Signed by ${(d.signatures ?? []).map((s) => s.name).join(' and ')} on ${fmtLongDate(d.accepted_at?.slice(0, 10))}.`,
    render: (d, id) => <ProposalDocument v={d.snapshot ?? {}} signatures={d.signatures ?? []} id={id} />,
  },
  contract: {
    section: 'Contracts',
    docName: 'Residential Remodeling Contract',
    listFn: 'get_pin_contracts', signFn: 'sign_pin_contract', declineFn: 'decline_pin_contract', idParam: 'p_contract_id',
    status: {
      sent: AWAITING,
      client_signed: { label: 'Signed by you · awaiting Orozco Homes', bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
      signed: { ...SIGNED, label: 'Fully signed' },
      declined: DECLINED,
    },
    title: (d) => d.snapshot?.project_type || 'Residential Remodeling Contract',
    detail: (d) => (d.snapshot?.total_cost ? `Contract price ${fmtDollars(d.snapshot.total_cost)}` : ''),
    signedNote: (d) => `✓ Signed by ${(d.signatures ?? []).map((s) => s.name).join(' and ')} on ${fmtLongDate(d.accepted_at?.slice(0, 10))}.` +
      (d.contractor_signature ? ` Countersigned by ${d.contractor_signature.name} for Orozco Homes.` : ' Orozco Homes will countersign next.'),
    render: (d, id) => <ContractDocument doc={d} id={id} />,
  },
};

const PRINT_ID = 'oh-portal-document';
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #${PRINT_ID}, #${PRINT_ID} * { visibility: visible !important; }
  #${PRINT_ID} { position: absolute; top: 0; left: 0; width: 100%; max-width: none !important; padding: 0 !important; }
  @page { margin: 0.6in; }
}`;

function Viewer({ kind, doc, session, onClose, onChanged }) {
  const cfg = KINDS[kind];
  const [names, setNames] = useState(['', '']);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const open = doc.status === 'sent';
  const signed = doc.status !== 'sent' && doc.status !== 'declined';

  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = PRINT_CSS;
    document.head.appendChild(el);
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.head.removeChild(el); document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose, busy]);

  async function handleSign(e) {
    e.preventDefault();
    if (!names[0].trim()) { setError('Type your full name to sign.'); return; }
    if (!agree) { setError('Please check the box to agree to sign electronically.'); return; }
    setBusy(true); setError('');
    const { data, error: err } = await supabase.rpc(cfg.signFn, {
      p_project_id: session.projectId, p_pin: session.pin, [cfg.idParam]: doc.id,
      p_names: names.map((n) => n.trim()).filter(Boolean), p_agree: true,
      p_user_agent: navigator.userAgent.slice(0, 300),
    });
    setBusy(false);
    if (err || !data?.ok) { setError(data?.error || 'Could not sign right now. Please try again.'); return; }
    onChanged(`Thank you! Your ${cfg.docName} is signed. Orozco Homes can see your signature right away.`);
  }

  async function handleDecline() {
    setBusy(true); setError('');
    const { data, error: err } = await supabase.rpc(cfg.declineFn, {
      p_project_id: session.projectId, p_pin: session.pin, [cfg.idParam]: doc.id, p_reason: reason,
    });
    setBusy(false);
    if (err || !data?.ok) { setError(data?.error || 'Could not decline right now. Please try again.'); return; }
    onChanged(`You declined the ${cfg.docName}. Orozco Homes will follow up with you.`);
  }

  const inputStyle = { border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '0.6rem 0.85rem', fontSize: '0.9rem', color: NAVY, width: '100%' };

  return (
    <div role="dialog" aria-modal="true" aria-label={cfg.docName} className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#F5F4F0' }}>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ backgroundColor: NAVY }}>
        <button onClick={onClose} disabled={busy} className="text-sm font-semibold" style={{ color: GOLD }}>← Back</button>
        <p className="flex-1 text-sm font-bold text-white truncate">{cfg.title(doc)}</p>
        <button onClick={() => window.print()} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: GOLD, color: NAVY }}>
          Print / Save PDF
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-4 px-2 sm:px-4">
          <div className="rounded-xl overflow-hidden" style={{ boxShadow: '0 4px 24px rgba(0,33,71,0.10)' }}>
            {cfg.render(doc, PRINT_ID)}
          </div>

          {signed && (
            <p className="mt-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #6EE7B7' }}>
              {cfg.signedNote(doc)}
            </p>
          )}
          {doc.status === 'declined' && (
            <p className="mt-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>
              You declined this {cfg.docName} on {fmtLongDate(doc.declined_at?.slice(0, 10))}.
            </p>
          )}

          {open && !declining && (
            <form onSubmit={handleSign} className="mt-4 rounded-xl p-5 space-y-4" style={{ backgroundColor: '#fff', border: `1.5px solid ${GOLD}` }}>
              <p className="text-base font-bold" style={{ color: NAVY }}>Accept &amp; Sign</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs font-bold mb-1" style={{ color: '#374151' }}>Your full name <span style={{ color: '#EF4444' }}>*</span></span>
                  <input value={names[0]} onChange={(e) => { setNames([e.target.value, names[1]]); setError(''); }} maxLength={100} autoComplete="name" style={inputStyle} />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold mb-1" style={{ color: '#374151' }}>Second signer's full name (optional)</span>
                  <input value={names[1]} onChange={(e) => { setNames([names[0], e.target.value]); setError(''); }} maxLength={100} style={inputStyle} />
                </label>
              </div>
              {names[0].trim() && (
                <p className="text-2xl" style={{ fontFamily: '"Brush Script MT", "Segoe Script", cursive', color: NAVY }}>
                  {[names[0], names[1]].map((n) => n.trim()).filter(Boolean).join('  ·  ')}
                </p>
              )}
              <label className="flex items-start gap-2 text-sm" style={{ color: '#374151' }}>
                <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setError(''); }} className="mt-1" />
                <span>{consent(cfg.docName)}</span>
              </label>
              {error && <p role="alert" className="text-sm font-semibold" style={{ color: '#DC2626' }}>{error}</p>}
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={busy} className="px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
                  style={{ backgroundColor: '#059669', color: '#fff' }}>
                  {busy ? 'Signing…' : 'Accept & Sign'}
                </button>
                <button type="button" onClick={() => { setDeclining(true); setError(''); }} disabled={busy}
                  className="text-sm font-semibold underline" style={{ color: '#6B7280' }}>
                  Decline
                </button>
              </div>
            </form>
          )}

          {open && declining && (
            <div className="mt-4 rounded-xl p-5 space-y-3" style={{ backgroundColor: '#fff', border: '1.5px solid #FECACA' }}>
              <p className="text-base font-bold" style={{ color: '#991B1B' }}>Decline this {cfg.docName}?</p>
              <label className="block">
                <span className="block text-xs font-bold mb-1" style={{ color: '#374151' }}>Reason (optional)</span>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} style={inputStyle} />
              </label>
              {error && <p role="alert" className="text-sm font-semibold" style={{ color: '#DC2626' }}>{error}</p>}
              <div className="flex gap-3">
                <button onClick={handleDecline} disabled={busy} className="px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
                  style={{ backgroundColor: '#DC2626', color: '#fff' }}>
                  {busy ? 'Sending…' : 'Decline'}
                </button>
                <button onClick={() => setDeclining(false)} disabled={busy} className="px-5 py-2.5 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>
                  Go back
                </button>
              </div>
            </div>
          )}
          <div className="h-10" />
        </div>
      </div>
    </div>
  );
}

function PortalSignables({ kind, session, Section }) {
  const cfg = KINDS[kind];
  const [docs, setDocs] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(() => supabase
    .rpc(cfg.listFn, { p_project_id: session.projectId, p_pin: session.pin })
    .then(({ data, error }) => { if (!error && Array.isArray(data)) setDocs(data); }),
  [cfg.listFn, session.projectId, session.pin]);

  useEffect(() => { load(); }, [load]);

  if (docs.length === 0) return null;
  const opened = docs.find((d) => d.id === openId);

  return (
    <Section title={cfg.section}>
      {notice && (
        <p role="status" className="mb-3 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #6EE7B7' }}>{notice}</p>
      )}
      <div className="space-y-3">
        {docs.map((d) => {
          const st = cfg.status[d.status] ?? AWAITING;
          const detail = cfg.detail(d);
          return (
            <div key={d.id} className="rounded-2xl p-4 flex flex-wrap items-center gap-3"
              style={{ backgroundColor: '#fff', border: `1.5px solid ${st.border}` }}>
              <div className="flex-1 min-w-[180px]">
                <p className="text-sm font-bold" style={{ color: NAVY }}>{cfg.title(d)}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                  {cfg.docName} · Sent {fmtLongDate(d.sent_at?.slice(0, 10))}{detail ? ` · ${detail}` : ''}
                </p>
                <span className="inline-block mt-1.5 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
              </div>
              <button onClick={() => { setOpenId(d.id); setNotice(''); }} className="px-4 py-2.5 rounded-xl text-sm font-bold"
                style={d.status === 'sent' ? { backgroundColor: GOLD, color: NAVY } : { backgroundColor: '#F3F4F6', color: NAVY }}>
                {d.status === 'sent' ? 'Review & Sign' : 'View'}
              </button>
            </div>
          );
        })}
      </div>
      {opened && (
        <Viewer
          kind={kind}
          doc={opened}
          session={session}
          onClose={() => setOpenId(null)}
          onChanged={(msg) => { setOpenId(null); setNotice(msg); load(); }}
        />
      )}
    </Section>
  );
}

export function PortalProposals(props) { return <PortalSignables kind="proposal" {...props} />; }
export function PortalContracts(props) { return <PortalSignables kind="contract" {...props} />; }
