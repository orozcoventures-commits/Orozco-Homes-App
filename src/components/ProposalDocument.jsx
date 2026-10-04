// src/components/ProposalDocument.jsx — printable Orozco Homes Project Retainer Agreement
import { PROPOSAL_TITLE, fmtWhole, fmtLongDate, parseScope, lines } from '../utils/proposalTemplate';

const NAVY = '#002147';
const GOLD = '#B8962E';

const blank = (v, width = '10rem') => (v
  ? v
  : <span style={{ display: 'inline-block', minWidth: width, borderBottom: '1px solid #9CA3AF' }}>&nbsp;</span>);

function H2({ children }) {
  return (
    <h2 style={{ color: NAVY, fontSize: '13px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
      borderBottom: `2px solid ${GOLD}`, paddingBottom: '4px', margin: '22px 0 10px', breakAfter: 'avoid' }}>
      {children}
    </h2>
  );
}

function Bullets({ items }) {
  return (
    <ul style={{ margin: '4px 0 8px', paddingLeft: '20px', listStyle: 'disc' }}>
      {items.map((it, i) => (
        <li key={i} style={{ margin: '2px 0' }}>
          {typeof it === 'string' ? it : it.text}
          {typeof it !== 'string' && it.children?.length > 0 && (
            <ul style={{ margin: '2px 0', paddingLeft: '18px', listStyle: 'circle' }}>
              {it.children.map((c, j) => <li key={j}>{c}</li>)}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function SignatureBlock({ label }) {
  const row = (text) => (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', margin: '18px 0 0' }}>
      <span style={{ whiteSpace: 'nowrap' }}>{text}</span>
      <span style={{ flex: 1, borderBottom: '1px solid #374151', height: '1px' }} />
    </div>
  );
  return (
    <div style={{ breakInside: 'avoid', marginBottom: '14px' }}>
      {row(label)}
      {row('Name Printed:')}
      <div style={{ width: '50%' }}>{row('Date:')}</div>
    </div>
  );
}

export default function ProposalDocument({ v, id }) {
  const scope = parseScope(v.scope_of_work);
  const materials = lines(v.materials_included);
  const low = fmtWhole(v.investment_low);
  const high = fmtWhole(v.investment_high);
  const retainer = fmtWhole(v.retainer_amount);
  const buyout = fmtWhole(v.buyout_fee);
  const creditWindow = v.credit_window || 'one (1) week';

  return (
    <article id={id} style={{ backgroundColor: '#fff', color: '#1F2937', fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '12.5px', lineHeight: 1.6, padding: '40px 48px', maxWidth: '820px', margin: '0 auto' }}>

      {/* Letterhead */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '18px', borderBottom: `3px solid ${NAVY}`, paddingBottom: '14px' }}>
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

      <p style={{ marginTop: '16px' }}>
        This Project Retainer Agreement is made between Orozco Homes and the client for the purpose of initiating formal
        project planning and reserving placement in the construction calendar for a residential renovation project.
      </p>
      <p>
        This Agreement outlines the scope of professional services to be performed after deposit and terms required to
        prepare a complete and build-ready construction plan.
      </p>

      <H2>1. Client Information</H2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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

      <H2>Project Overview</H2>
      <p style={{ whiteSpace: 'pre-line' }}>{blank(v.project_overview, '100%')}</p>

      <H2>Scope of Work</H2>
      {scope.length === 0 ? <p>{blank('', '100%')}</p> : scope.map((s, i) => (
        <div key={i} style={{ breakInside: 'avoid-page' }}>
          {s.heading && <h3 style={{ color: NAVY, fontSize: '13px', fontWeight: 700, margin: '10px 0 2px', fontFamily: 'inherit' }}>{s.heading}</h3>}
          <Bullets items={s.items} />
        </div>
      ))}

      <H2>Materials Included</H2>
      <p style={{ margin: 0, fontStyle: 'italic', color: '#4B5563' }}>(Based on allowances)</p>
      <Bullets items={materials.length ? materials : ['All required building materials']} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '18px 0 6px', breakInside: 'avoid' }}>
        <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px 14px', backgroundColor: '#F9FAFB' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280' }}>Estimated Timeline</div>
          <div style={{ fontWeight: 700, color: NAVY }}>{blank(v.estimated_timeline)}</div>
        </div>
        <div style={{ border: `1px solid ${GOLD}`, borderRadius: '8px', padding: '10px 14px', backgroundColor: '#FFFBEB' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280' }}>Estimated Investment Amount</div>
          <div style={{ fontWeight: 800, color: NAVY, fontSize: '15px' }}>{low && high ? `${low} – ${high}` : blank('')}</div>
        </div>
      </div>
      <p style={{ fontSize: '11.5px', color: '#4B5563' }}>
        <strong>Estimated Investment Disclaimer:</strong> The Estimated Investment Range listed above is a preliminary
        estimate only and is provided for general budgeting purposes. This estimate is based on limited information
        available prior to finalized design, material selections, engineering coordination, trade partner pricing
        validation and full scope confirmation. Orozco Homes will work collaboratively with the client to align scope and
        selections with the desired investment level while maintaining transparency throughout the development process.
      </p>

      <H2>2. Purpose of Deposit &amp; Project Initiation</H2>
      <p>
        Upon execution of this Agreement and receipt of the required deposit, Client will be placed into Orozco Homes’
        active project development calendar. The deposit secures contractor’s time, coordination efforts, professional
        resources and trade partner scheduling necessary to prepare the project for construction. Construction work will
        not commence until a separate Construction Agreement is executed.
      </p>

      <H2>3. Scope of Preconstruction Services</H2>
      <p style={{ margin: 0 }}>Contractor agrees to perform the following preconstruction services:</p>
      <Bullets items={[
        'Site visits and consultation',
        'Complete feasibility study and preliminary design assessment',
        'Develop a project timeline and financial investment outline based on design direction',
        'No demolition or construction will begin until all major selections are finalized and documented to ensure efficiency, cost control and a seamless build process.',
      ]} />
      <p style={{ margin: '8px 0 0', fontWeight: 700 }}>Client Responsibilities:</p>
      <p style={{ margin: 0 }}>Client agrees to:</p>
      <Bullets items={[
        'Provide timely access to the property',
        'Make required design and material selections within agreed timelines',
        'Respond promptly to communications to avoid delays in project planning',
      ]} />
      <p>Delays in decision-making may affect schedule placement.</p>

      <H2>4. Project Retainer Fee</H2>
      <p>
        The total Project Retainer Deposit is <strong>{blank(retainer, '6rem')}</strong>, due upon execution of this
        Agreement. This deposit is non-refundable once services begin, as it compensates designers, engineers, consultants
        and trade partners for early-phase planning and coordination.
      </p>
      <p style={{ margin: '8px 0 0', fontWeight: 700 }}>Fee Credit Toward Construction</p>
      <p>
        Once Client executes a Construction Agreement with Orozco Homes within {creditWindow} of completion of the project
        development phase, the full deposit amount will be credited toward the final construction contract total. This
        credit will be applied to the second construction payment and will be reflected in the contract total.
      </p>
      <p>
        If a Construction Agreement is not executed within {creditWindow}, the credit will be forfeited due to scheduling and
        pricing fluctuations.
      </p>

      <H2>5. Work Product Ownership, Buyout Rights &amp; Fee Credit</H2>
      <p style={{ margin: '0', fontWeight: 700 }}>Ownership of Deliverables</p>
      <p>
        All drawings, layouts, engineering documents, design concepts, renderings, estimates, and related materials
        (“Work Product”) prepared or coordinated by Orozco Homes remain the sole property of Orozco Homes unless otherwise
        agreed in writing. These materials are prepared specifically for use with Orozco Homes’ construction services.
      </p>
      <p style={{ margin: '8px 0 0', fontWeight: 700 }}>License Upon Construction Contract</p>
      <p>
        Once Client proceeds to construction with Orozco Homes, full usage rights for permitting and construction will be
        granted at no additional charge.
      </p>
      <p style={{ margin: '8px 0 0', fontWeight: 700 }}>Buyout Option</p>
      <p>
        If Client elects not to proceed with Orozco Homes for construction, Client may purchase the rights to the
        completed Work Product for an additional buyout fee of <strong>{blank(buyout, '5rem')}</strong>.
      </p>
      <p>
        Upon receipt of full payment of the applicable buyout fee, Orozco Homes will release digital copies and grant a
        non-exclusive, non-transferable license for use in construction, permitting, or bidding with another contractor.
      </p>
      <p style={{ margin: '8px 0 0', fontWeight: 700 }}>Restrictions Without Buyout</p>
      <p>
        Unless the buyout fee is paid in full, Client may not reproduce, distribute, submit for permit, share with other
        contractors, or otherwise use the Work Product.
      </p>

      <H2>6. Transition to Construction</H2>
      <p style={{ margin: 0 }}>Upon approval of final scope, selections, pricing and scheduling:</p>
      <Bullets items={[
        'A separate Construction Agreement will be prepared.',
        'A timeline, total investment amount and payment schedule will be presented.',
        'A start date will be confirmed based on trade partner availability.',
      ]} />
      <p>No construction work will begin without a fully executed Construction Agreement.</p>

      <H2>7. Cancellation &amp; Termination</H2>
      <p>Either party may terminate this Agreement in writing.</p>
      <p style={{ margin: 0 }}>If Client terminates this Agreement after services have commenced:</p>
      <Bullets items={[
        'The Project Retainer Deposit remains non-refundable.',
        'Client shall be responsible for payment of any third-party expenses incurred on Client’s behalf prior to termination, including but not limited to design fees, engineering fees, consultations, permit research costs, or trade partner mobilization expenses.',
        'Any outstanding balance for completed professional services beyond the retainer amount shall be due upon receipt of invoice.',
      ]} />
      <p>
        If Contractor terminates this Agreement due to lack of Client responsiveness, failure to provide required
        information, or conduct that materially delays project development, the retainer shall remain non-refundable.
      </p>
      <p>
        Termination of this Agreement does not transfer ownership rights to any Work Product unless the applicable buyout
        fee has been paid in full.
      </p>

      <H2>8. Unforeseen Conditions &amp; Remodel Risk Disclosure</H2>
      <p>
        Client acknowledges that residential renovation and remodeling projects involve existing structures, concealed
        conditions and unknown site variables.
      </p>
      <p style={{ margin: 0 }}>Conditions that may not be visible at the time of project development may include, but are not limited to:</p>
      <Bullets items={[
        'Water damage or hidden moisture intrusion', 'Structural deficiencies', 'Improper prior installations',
        'Outdated or non-compliant electrical, plumbing, or mechanical systems', 'Termite or pest damage',
        'Asbestos or hazardous materials', 'Foundation irregularities', 'Inconsistent framing dimensions',
      ]} />
      <p style={{ margin: 0 }}>
        Any such unforeseen conditions discovered during further investigation, engineering review, permitting, or
        construction may require:
      </p>
      <Bullets items={['Scope modifications', 'Additional work', 'Engineering revisions', 'Price adjustments', 'Timeline extensions']} />
      <p>
        While Orozco Homes works to identify risks during the project development phase, not all concealed conditions can
        be identified without destructive investigation.
      </p>
      <p>
        Client understands that final construction pricing may be adjusted to address verified unforeseen conditions
        discovered after walls, floors, ceilings, or structural elements are opened.
      </p>

      <H2>9. Signatures</H2>
      <SignatureBlock label="Client Signature:" />
      <SignatureBlock label="Client Signature:" />
      <SignatureBlock label="Orozco Homes Representative:" />
    </article>
  );
}
