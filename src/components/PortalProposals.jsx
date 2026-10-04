// src/components/PortalProposals.jsx — proposals in the PIN client portal
//
// Lists the proposals the contractor sent to this project and lets the client
// read the frozen copy, then accept & sign (typed names + agreement) or
// decline. All calls go through the PIN-guarded functions in migration 041.
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import ProposalDocument from './ProposalDocument';
import { fmtLongDate, investmentRange } from '../utils/proposalTemplate';

const NAVY = '#002147';
const GOLD = '#D4AF37';

const STATUS = {
  sent:     { label: 'Awaiting your signature', bg: '#FFFBEB', color: '#92400E', border: '#FCD34D' },
  accepted: { label: 'Signed',                  bg: '#ECFDF5', color: '#065F46', border: '#6EE7B7' },
  declined: { label: 'Declined',                bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
};

export const E_SIGN_CONSENT =
  'By typing my name and clicking “Accept & Sign”, I agree to sign this Project Retainer Agreement electronically. ' +
  'I understand my electronic signature has the same effect as my handwritten signature.';

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #oh-portal-proposal, #oh-portal-proposal * { visibility: visible !important; }
  #oh-portal-proposal { position: absolute; top: 0; left: 0; width: 100%; max-width: none !important; padding: 0 !important; }
  @page { margin: 0.6in; }
}`;

function ProposalViewer({ proposal, session, onClose, onChanged }) {
  const [names, setNames] = useState(['', '']);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const open = proposal.status === 'sent';

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
    const { data, error: err } = await supabase.rpc('sign_pin_proposal', {
      p_project_id: session.projectId, p_pin: session.pin, p_proposal_id: proposal.id,
      p_names: names.map((n) => n.trim()).filter(Boolean), p_agree: true,
      p_user_agent: navigator.userAgent.slice(0, 300),
    });
    setBusy(false);
    if (err || !data?.ok) { setError(data?.error || 'Could not sign right now. Please try again.'); return; }
    onChanged('Thank you! Your proposal is signed. Orozco Homes can see your signature right away.');
  }

  async function handleDecline() {
    setBusy(true); setError('');
    const { data, error: err } = await supabase.rpc('decline_pin_proposal', {
      p_project_id: session.projectId, p_pin: session.pin, p_proposal_id: proposal.id, p_reason: reason,
    });
    setBusy(false);
    if (err || !data?.ok) { setError(data?.error || 'Could not decline right now. Please try again.'); return; }
    onChanged('You declined the proposal. Orozco Homes will follow up with you.');
  }

  const inputStyle = { border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '0.6rem 0.85rem', fontSize: '0.9rem', color: NAVY, width: '100%' };

  return (
    <div role="dialog" aria-modal="true" aria-label="Proposal" className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#F5F4F0' }}>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ backgroundColor: NAVY }}>
        <button onClick={onClose} disabled={busy} className="text-sm font-semibold" style={{ color: GOLD }}>← Back</button>
        <p className="flex-1 text-sm font-bold text-white truncate">{proposal.snapshot?.project_title || 'Proposal'}</p>
        <button onClick={() => window.print()} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: GOLD, color: NAVY }}>
          Print / Save PDF
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-4 px-2 sm:px-4">
          <div className="rounded-xl overflow-hidden" style={{ boxShadow: '0 4px 24px rgba(0,33,71,0.10)' }}>
            <ProposalDocument v={proposal.snapshot ?? {}} signatures={proposal.signatures ?? []} id="oh-portal-proposal" />
          </div>

          {proposal.status === 'accepted' && (
            <p className="mt-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #6EE7B7' }}>
              ✓ Signed by {(proposal.signatures ?? []).map((s) => s.name).join(' and ')} on {fmtLongDate(proposal.accepted_at?.slice(0, 10))}.
            </p>
          )}
          {proposal.status === 'declined' && (
            <p className="mt-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>
              You declined this proposal on {fmtLongDate(proposal.declined_at?.slice(0, 10))}.
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
                <span>{E_SIGN_CONSENT}</span>
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
              <p className="text-base font-bold" style={{ color: '#991B1B' }}>Decline this proposal?</p>
              <label className="block">
                <span className="block text-xs font-bold mb-1" style={{ color: '#374151' }}>Reason (optional)</span>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} style={inputStyle} />
              </label>
              {error && <p role="alert" className="text-sm font-semibold" style={{ color: '#DC2626' }}>{error}</p>}
              <div className="flex gap-3">
                <button onClick={handleDecline} disabled={busy} className="px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
                  style={{ backgroundColor: '#DC2626', color: '#fff' }}>
                  {busy ? 'Sending…' : 'Decline proposal'}
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

export default function PortalProposals({ session, Section }) {
  const [proposals, setProposals] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(() => supabase
    .rpc('get_pin_proposals', { p_project_id: session.projectId, p_pin: session.pin })
    .then(({ data, error }) => { if (!error && Array.isArray(data)) setProposals(data); }),
  [session.projectId, session.pin]);

  useEffect(() => { load(); }, [load]);

  if (proposals.length === 0) return null;
  const opened = proposals.find((p) => p.id === openId);

  return (
    <Section title="Proposals">
      {notice && (
        <p role="status" className="mb-3 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #6EE7B7' }}>{notice}</p>
      )}
      <div className="space-y-3">
        {proposals.map((p) => {
          const st = STATUS[p.status] ?? STATUS.sent;
          const range = investmentRange(p.snapshot ?? {});
          return (
            <div key={p.id} className="rounded-2xl p-4 flex flex-wrap items-center gap-3"
              style={{ backgroundColor: '#fff', border: `1.5px solid ${st.border}` }}>
              <div className="flex-1 min-w-[180px]">
                <p className="text-sm font-bold" style={{ color: NAVY }}>{p.snapshot?.project_title || 'Project Retainer Agreement'}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                  Project Retainer Agreement · Sent {fmtLongDate(p.sent_at?.slice(0, 10))}{range ? ` · Estimated ${range}` : ''}
                </p>
                <span className="inline-block mt-1.5 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
              </div>
              <button onClick={() => { setOpenId(p.id); setNotice(''); }} className="px-4 py-2.5 rounded-xl text-sm font-bold"
                style={p.status === 'sent' ? { backgroundColor: GOLD, color: NAVY } : { backgroundColor: '#F3F4F6', color: NAVY }}>
                {p.status === 'sent' ? 'Review & Sign' : 'View'}
              </button>
            </div>
          );
        })}
      </div>
      {opened && (
        <ProposalViewer
          proposal={opened}
          session={session}
          onClose={() => setOpenId(null)}
          onChanged={(msg) => { setOpenId(null); setNotice(msg); load(); }}
        />
      )}
    </Section>
  );
}
