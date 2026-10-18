// The Subcontract Agreement as the subcontractor sees it (frozen snapshot from
// src/utils/subAgreement.js): Exhibit C — this job's Scope of Work — then the
// Subcontractor Standards (Exhibit A, and Exhibit B for the trade), then
// signatures. Used by the private signing page and the admin preview.
import { fmtLongDate } from '../utils/proposalTemplate';

const NAVY = '#002147';
const GOLD = '#D4AF37';
const money = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = (iso) => (iso ? new Date(iso).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

function H2({ children }) {
  return (
    <h2 className="text-xs font-extrabold uppercase mt-6 mb-2 pl-2" style={{ color: NAVY, letterSpacing: '0.1em', borderLeft: `3px solid ${GOLD}` }}>
      {children}
    </h2>
  );
}

function Row({ label, children }) {
  return (
    <div className="grid sm:grid-cols-[210px_1fr] gap-x-4 gap-y-0.5 py-2" style={{ borderTop: '1px solid #F3F4F6' }}>
      <div className="text-[11px] font-bold uppercase" style={{ color: '#6B7280', letterSpacing: '0.06em' }}>{label}</div>
      <div className="text-sm whitespace-pre-wrap" style={{ color: '#1F2937' }}>{children || <span style={{ color: '#9CA3AF' }}>None</span>}</div>
    </div>
  );
}

function Bullets({ items }) {
  return (
    <ul className="list-disc pl-5 space-y-1 text-sm" style={{ color: '#374151' }}>
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  );
}

function SignBlock({ label, sig, at, fallbackName, fallbackTitle }) {
  return (
    <div className="flex-1 min-w-[220px]">
      <div className="h-10 flex items-end pb-1 text-lg" style={{ borderBottom: '1px solid #1F2937', fontFamily: 'cursive', color: NAVY }}>
        {sig?.name ?? ''}
      </div>
      <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
        {label}: <b style={{ color: '#1F2937' }}>{sig?.name ?? fallbackName ?? ''}</b>{(sig?.title || fallbackTitle) ? `, ${sig?.title || fallbackTitle}` : ''}
      </p>
      <p className="text-xs" style={{ color: '#6B7280' }}>{at ? `Signed electronically ${when(at)}` : 'Not signed yet'}</p>
    </div>
  );
}

export default function SubAgreementDocument({ snap, record = {}, id }) {
  const s = snap.standards;
  const dates = [snap.start_date && `Start ${fmtLongDate(snap.start_date)}`, snap.finish_date && `Completion target ${fmtLongDate(snap.finish_date)}`]
    .filter(Boolean).join(' · ');
  const materials = {
    orozco: snap.items.filter((i) => i.by === 'Orozco Homes').map((i) => i.label),
    sub: snap.items.filter((i) => i.by !== 'Orozco Homes').map((i) => i.label),
  };
  return (
    <div id={id} style={{ backgroundColor: '#fff' }} data-testid="sub-agreement-document">
      <div className="px-5 py-4 flex items-center gap-3" style={{ backgroundColor: NAVY, borderBottom: `3px solid ${GOLD}` }}>
        <img src="/orozco-homes-logo.png" alt="Orozco Homes" className="h-9 rounded-lg w-auto shrink-0 object-contain" />
        <div className="min-w-0">
          <p className="text-base font-bold text-white">Subcontract Agreement — {snap.trade.label}</p>
          <p className="text-xs" style={{ color: GOLD }}>{snap.project.name} · {fmtLongDate(snap.date)}</p>
        </div>
      </div>

      <div className="px-5 sm:px-8 py-5">
        <p className="text-sm" style={{ color: '#374151' }}>
          This agreement is between <b>{snap.company.name}</b> ("Orozco Homes") and <b>{snap.sub.name}</b> ("Subcontractor").
          It consists of Exhibit C (this job's Scope of Work, below), Exhibit A (General Standards) and Exhibit B
          (Trade-Specific Expectations for {s.trade.title}) of the Orozco Homes Subcontractor Standards, {s.version_label}.
        </p>

        <H2>Exhibit C — Scope of Work / Work Order</H2>
        <Row label="Project address">{snap.project.address}</Row>
        <Row label="Project">{snap.project.name}{snap.project.type ? ` (${snap.project.type})` : ''}</Row>
        <Row label="Subcontractor / license #">
          {snap.sub.name}{snap.sub.contact && snap.sub.contact !== snap.sub.name ? ` — ${snap.sub.contact}` : ''}
          {'\n'}{snap.sub.license ? `License ${snap.sub.license}` : 'License #: to be provided'}
          {snap.sub.phone ? `\n${snap.sub.phone}` : ''}{snap.sub.email ? ` · ${snap.sub.email}` : ''}
        </Row>
        <Row label="Trade and onsite lead">{snap.trade.label}{snap.onsite_lead ? ` — onsite lead: ${snap.onsite_lead}` : ''}</Row>
        <Row label="Scope of work">{snap.scope}</Row>
        <Row label="Work items">
          {snap.items.length ? snap.items.map((i) => `• ${i.label}${i.section && i.section !== i.label ? ` (${i.section})` : ''}`).join('\n') : ''}
        </Row>
        <Row label="Drawings / selections / specs">{snap.drawings}</Row>
        <Row label="Materials furnished">
          {materials.orozco.length ? `By Orozco Homes: ${materials.orozco.join(', ')}` : ''}
          {materials.orozco.length && materials.sub.length ? '\n' : ''}
          {materials.sub.length ? `By Subcontractor: ${materials.sub.join(', ')}` : ''}
          {'\n'}Subcontractor furnishes all labor, tools, equipment and consumables (fasteners, blades, tape, caulk, etc.).
        </Row>
        <Row label="Exclusions and assumptions">{snap.exclusions}</Row>
        <Row label="Dates and dependencies">{[dates, snap.dependencies].filter(Boolean).join('\n')}</Row>
        <Row label="Permits and inspections">{snap.permits}</Row>
        <Row label="Site protection / access / hours">{snap.site_notes}</Row>
        <Row label="Subcontract price">
          <b>{money(snap.amount)}</b> for the complete scope above (labor, tools, equipment and consumables).
        </Row>
        <Row label="Payment schedule">
          <table className="w-full text-sm">
            <tbody>
              {snap.payments.map((p, i) => (
                <tr key={i} style={{ borderTop: i ? '1px solid #F3F4F6' : 'none' }}>
                  <td className="py-1 pr-2 align-top" style={{ color: '#6B7280' }}>{i + 1}.</td>
                  <td className="py-1 pr-3">{p.label}</td>
                  <td className="py-1 pr-3 text-right whitespace-nowrap" style={{ color: '#6B7280' }}>{p.pct}%</td>
                  <td className="py-1 text-right whitespace-nowrap font-semibold">{money(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <span className="block text-xs mt-1" style={{ color: '#6B7280' }}>Invoices and payment timing per Exhibit A (Invoices and payment).</span>
        </Row>
        <Row label="Change orders">Per {snap.changes_ref}: written authorization from Orozco Homes before any extra or changed work.</Row>
        <Row label="Milestones, testing, punch list">Per the payment schedule, the testing in Exhibit B, and {snap.closeout_ref}.</Row>

        <H2>Exhibit A — General Standards (All Trades)</H2>
        <p className="text-sm mb-3" style={{ color: '#374151' }}>{s.intro}</p>
        {s.general.map((g, i) => (
          <div key={i} className="mb-3">
            <p className="text-sm font-bold mb-1" style={{ color: NAVY }}>{i + 1}. {g.title}</p>
            <Bullets items={g.items} />
          </div>
        ))}

        <H2>Exhibit B — Trade-Specific Expectations: {s.trade.title}</H2>
        <Bullets items={s.trade.items} />

        <H2>Agreement</H2>
        <p className="text-sm" style={{ color: '#374151' }}>{s.incorporation}</p>
        <div className="flex flex-wrap gap-8 mt-6">
          <SignBlock label="Subcontractor" sig={record.sub_signature} at={record.sub_signed_at} fallbackName={snap.sub.name} />
          <SignBlock label="Orozco Homes" sig={record.contractor_signature} at={record.contractor_signed_at}
            fallbackName={snap.company.rep} fallbackTitle={snap.company.title} />
        </div>
        <p className="text-[11px] mt-6 text-center" style={{ color: '#9CA3AF' }}>
          {snap.company.name} · {snap.company.license} · {snap.company.phone} · {snap.company.email}
        </p>
      </div>
    </div>
  );
}
