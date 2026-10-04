// src/components/ProposalDocument.jsx — printable Orozco Homes Project Retainer Agreement
import { Fragment } from 'react';
import {
  PROPOSAL_TITLE, fmtLongDate, investmentRange, fillTokens, parseBody, sectionNumbers,
} from '../utils/proposalTemplate';

const NAVY = '#002147';
const GOLD = '#B8962E';

const blank = (v, width = '10rem') => (v
  ? v
  : <span style={{ display: 'inline-block', minWidth: width, borderBottom: '1px solid #9CA3AF' }}>&nbsp;</span>);

// **bold** → <strong>; everything else stays plain text (React escapes it).
function Inline({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') && p.length > 4
    ? <strong key={i}>{p.slice(2, -2)}</strong>
    : <Fragment key={i}>{p}</Fragment>));
}

function Body({ text, v }) {
  const blocks = parseBody(fillTokens(text, v));
  return blocks.map((b, i) => {
    if (b.type === 'heading') return <p key={i} style={{ margin: '10px 0 2px', fontWeight: 700, color: NAVY }}><Inline text={b.text} /></p>;
    if (b.type === 'para') return <p key={i} style={{ margin: '0 0 8px' }}><Inline text={b.text} /></p>;
    return (
      <ul key={i} style={{ margin: '2px 0 8px', paddingLeft: '20px', listStyle: 'disc' }}>
        {b.items.map((it, j) => (
          <li key={j} style={{ margin: '2px 0' }}>
            <Inline text={it.text} />
            {it.children.length > 0 && (
              <ul style={{ margin: '2px 0', paddingLeft: '18px', listStyle: 'circle' }}>
                {it.children.map((c, k) => <li key={k}><Inline text={c} /></li>)}
              </ul>
            )}
          </li>
        ))}
      </ul>
    );
  });
}

function Heading({ number, title }) {
  if (!title) return null;
  return (
    <h2 style={{ color: NAVY, fontSize: '13px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
      borderBottom: `2px solid ${GOLD}`, paddingBottom: '4px', margin: '22px 0 10px', breakAfter: 'avoid' }}>
      {number ? `${number}. ` : ''}{title}
    </h2>
  );
}

function ClientBlock({ v }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '8px' }}>
      <div>
        <div style={{ fontWeight: 700 }}>{blank(v.client_name, '12rem')}</div>
        <div>{blank(v.client_address_1, '12rem')}</div>
        <div>{blank(v.client_address_2, '12rem')}</div>
        <div>{blank(v.client_email, '12rem')}</div>
        <div>{blank(v.client_phone, '8rem')}</div>
      </div>
      <div>
        <div style={{ fontWeight: 700, color: NAVY, letterSpacing: '0.05em' }}>OROZCO HOMES</div>
        {v.company_license && <div>{v.company_license}</div>}
        <div>{v.company_rep_name}{v.company_rep_title ? ` (${v.company_rep_title})` : ''}</div>
        {v.company_email && <div>{v.company_email}</div>}
        {v.company_phone && <div>{v.company_phone}</div>}
      </div>
    </div>
  );
}

function InvestmentBlock({ v }) {
  const box = { borderRadius: '8px', padding: '10px 14px' };
  const label = { fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280' };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '6px 0 10px', breakInside: 'avoid' }}>
      <div style={{ ...box, border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
        <div style={label}>Estimated Timeline</div>
        <div style={{ fontWeight: 700, color: NAVY }}>{blank(v.estimated_timeline)}</div>
      </div>
      <div style={{ ...box, border: `1px solid ${GOLD}`, backgroundColor: '#FFFBEB' }}>
        <div style={label}>Estimated Investment Amount</div>
        <div style={{ fontWeight: 800, color: NAVY, fontSize: '15px' }}>{blank(investmentRange(v))}</div>
      </div>
    </div>
  );
}

const fmtSignedAt = (iso) => new Date(iso).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

// `signed` = { name, signed_at } when the client signed electronically.
function SignatureLines({ label, signed }) {
  const row = (text, value, script) => (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', margin: '18px 0 0' }}>
      <span style={{ whiteSpace: 'nowrap' }}>{text}</span>
      <span style={{ flex: 1, borderBottom: '1px solid #374151', minHeight: '1.2em', paddingLeft: '6px',
        fontFamily: script ? '"Brush Script MT", "Segoe Script", cursive' : 'inherit', fontSize: script ? '20px' : 'inherit',
        color: script ? NAVY : 'inherit', lineHeight: 1.1 }}>
        {value || ''}
      </span>
    </div>
  );
  return (
    <div style={{ breakInside: 'avoid', marginBottom: '14px' }}>
      {row(label, signed?.name, true)}
      {row('Name Printed:', signed?.name)}
      <div style={{ width: signed ? '100%' : '50%' }}>{row('Date:', signed ? fmtSignedAt(signed.signed_at) : '')}</div>
      {signed && <div style={{ fontSize: '10.5px', color: '#059669', marginTop: '4px' }}>✓ Signed electronically</div>}
    </div>
  );
}

// `signatures`: [{ name, signed_at }] typed by the client in the portal.
export default function ProposalDocument({ v, id, signatures = [] }) {
  const sections = v.sections ?? [];
  const numbers = sectionNumbers(sections);

  return (
    <article id={id} style={{ backgroundColor: '#fff', color: '#1F2937', fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '12.5px', lineHeight: 1.6, padding: '40px 48px', maxWidth: '820px', margin: '0 auto' }}>

      <header style={{ display: 'flex', alignItems: 'center', gap: '18px', borderBottom: `3px solid ${NAVY}`, paddingBottom: '14px', marginBottom: '16px' }}>
        <img src="/orozco-homes-logo.png" alt="Orozco Homes" style={{ height: '64px', width: 'auto', borderRadius: '6px' }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ color: NAVY, fontSize: '22px', fontWeight: 800, margin: 0, fontFamily: 'inherit' }}>Orozco Homes {PROPOSAL_TITLE}</h1>
          <p style={{ color: GOLD, fontStyle: 'italic', margin: '2px 0 0' }}>Curated Remodels from Design to Build</p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '11px', color: '#4B5563' }}>
          {v.proposal_date && <div>{fmtLongDate(v.proposal_date)}</div>}
          {v.project_title && <div style={{ fontWeight: 700, color: NAVY }}>{v.project_title}</div>}
        </div>
      </header>

      {sections.map((s) => (
        <section key={s.id} style={{ breakInside: s.kind === 'text' ? 'auto' : 'avoid' }}>
          <Heading number={numbers[s.id]} title={s.title} />
          {s.kind === 'client' && <ClientBlock v={v} />}
          {s.kind === 'investment' && <InvestmentBlock v={v} />}
          {s.body && (
            <div style={s.kind === 'investment' ? { fontSize: '11.5px', color: '#4B5563' } : undefined}>
              <Body text={s.body} v={v} />
            </div>
          )}
          {s.kind === 'signatures' && (
            <>
              <SignatureLines label="Client Signature:" signed={signatures[0]} />
              {(signatures.length !== 1) && <SignatureLines label="Client Signature:" signed={signatures[1]} />}
              <SignatureLines label="Orozco Homes Representative:" />
            </>
          )}
        </section>
      ))}
    </article>
  );
}
