// src/pages/PublicSubAgreement.jsx — the Subcontract Agreement a
// subcontractor opens from their private link /s/<code> (no login): read the
// frozen copy (Scope of Work + Subcontractor Standards) and sign it
// (migration 060). The same link later shows the signed copy.
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import SubAgreementDocument from '../components/SubAgreementDocument';
import { fmtLongDate } from '../utils/proposalTemplate';

const NAVY = '#002147';
const GOLD = '#D4AF37';
const PHONE = '757-513-2593';
const PRINT_ID = 'oh-sub-agreement';
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #${PRINT_ID}, #${PRINT_ID} * { visibility: visible !important; }
  #${PRINT_ID} { position: absolute; top: 0; left: 0; width: 100%; }
  @page { margin: 0.6in; }
}`;
const CONSENT = 'By typing my name and clicking “Accept & Sign”, I agree to sign this Subcontract Agreement, including the Orozco Homes Subcontractor Standards (Exhibits A and B), electronically on behalf of the subcontractor named above. I understand my electronic signature has the same effect as my handwritten signature.';

export default function PublicSubAgreement({ route }) {
  const [state, setState] = useState({ phase: 'loading' });
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    document.title = 'Subcontract Agreement · Orozco Homes';
    const el = document.createElement('style');
    el.textContent = PRINT_CSS;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);

  useEffect(() => {
    supabase.rpc('get_sub_agreement_by_token', { p_token: route.token }).then(({ data, error: err }) => {
      if (err) setState({ phase: 'error' });
      else if (!data?.snapshot) setState({ phase: 'invalid' });
      else setState({ phase: 'ready', record: data });
    });
  }, [route.token, reload]);

  async function handleSign(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Type your full name to sign.'); return; }
    if (!agree) { setError('Please check the box to agree to sign electronically.'); return; }
    setBusy(true); setError('');
    const { data, error: err } = await supabase.rpc('sign_sub_agreement_by_token', {
      p_token: route.token, p_name: name.trim(), p_title: title.trim(), p_agree: true,
      p_user_agent: navigator.userAgent.slice(0, 300),
    });
    setBusy(false);
    if (err || !data?.ok) { setError(data?.error || 'Could not sign right now. Please try again.'); return; }
    window.scrollTo({ top: 0 });
    setReload((n) => n + 1);
  }

  const shell = (children) => (
    <div className="min-h-screen px-2 sm:px-4 py-6" style={{ backgroundColor: '#F5F4F0' }}>
      <div className="max-w-3xl mx-auto">{children}</div>
      <p className="text-center text-xs mt-8" style={{ color: '#9CA3AF' }}>
        Orozco Homes · Questions? Call <a href={`tel:${PHONE.replace(/-/g, '')}`} style={{ color: NAVY }}>{PHONE}</a>
      </p>
    </div>
  );

  if (state.phase === 'loading') return shell(<p className="text-center text-sm py-20" style={{ color: '#9CA3AF' }}>Loading…</p>);
  if (state.phase !== 'ready') {
    return shell(
      <div className="rounded-2xl p-6 text-sm" style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', color: '#374151' }}>
        {state.phase === 'invalid'
          ? 'This agreement link is not valid or is no longer active. Please contact Orozco Homes for a new link.'
          : 'We could not load the agreement. Please check your connection and try again.'}
      </div>,
    );
  }

  const r = state.record;
  const inputStyle = { border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '0.6rem 0.85rem', fontSize: '0.9rem', color: NAVY, width: '100%' };
  return shell(
    <>
      <div className="flex items-center justify-end mb-3">
        <button onClick={() => window.print()} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: NAVY, color: GOLD }}>
          Print / Save PDF
        </button>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ boxShadow: '0 4px 24px rgba(0,33,71,0.10)' }}>
        <SubAgreementDocument snap={r.snapshot} record={r} id={PRINT_ID} />
      </div>

      {r.status !== 'sent' && (
        <p role="status" className="mt-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #6EE7B7' }}>
          ✓ Signed by {r.sub_signature?.name} on {fmtLongDate(r.sub_signed_at?.slice(0, 10))}.
          {r.status === 'countersigned'
            ? ` Countersigned by ${r.contractor_signature?.name} for Orozco Homes. Keep a copy with “Print / Save PDF”.`
            : ' Orozco Homes will countersign next.'}
        </p>
      )}

      {r.status === 'sent' && (
        <form onSubmit={handleSign} className="mt-4 rounded-xl p-5 space-y-4" style={{ backgroundColor: '#fff', border: `1.5px solid ${GOLD}` }}>
          <p className="text-base font-bold" style={{ color: NAVY }}>Accept &amp; Sign</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-bold mb-1" style={{ color: '#374151' }}>Your full name <span style={{ color: '#EF4444' }}>*</span></span>
              <input value={name} onChange={(e) => { setName(e.target.value); setError(''); }} maxLength={100} autoComplete="name" style={inputStyle} />
            </label>
            <label className="block">
              <span className="block text-xs font-bold mb-1" style={{ color: '#374151' }}>Your title (e.g. Owner)</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} style={inputStyle} />
            </label>
          </div>
          {name.trim() && (
            <p className="text-2xl" style={{ fontFamily: '"Brush Script MT", "Segoe Script", cursive', color: NAVY }}>{name.trim()}</p>
          )}
          <label className="flex items-start gap-2 text-sm" style={{ color: '#374151' }}>
            <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setError(''); }} className="mt-1" />
            <span>{CONSENT}</span>
          </label>
          {error && <p role="alert" className="text-sm font-semibold" style={{ color: '#DC2626' }}>{error}</p>}
          <button type="submit" disabled={busy} className="px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
            style={{ backgroundColor: '#059669', color: '#fff' }}>
            {busy ? 'Signing…' : 'Accept & Sign'}
          </button>
          <p className="text-xs" style={{ color: '#6B7280' }}>Questions or changes needed? Call Orozco Homes before signing.</p>
        </form>
      )}
    </>,
  );
}
