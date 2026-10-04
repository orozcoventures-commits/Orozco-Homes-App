// src/utils/proposalTemplate.js — Orozco Homes Project Retainer Agreement (proposal)
//
// A proposal = form fields (client, company, project, investment, terms) plus
// an ordered list of sections that can be edited, added, removed and moved.
// Section bodies use a small markup (see SECTION_MARKUP_HELP) and can include
// {{tokens}} that are filled from the form fields when the document renders.

export const PROPOSAL_TITLE = 'Project Retainer Agreement';

export const PROPOSAL_FIELDS = [
  // ── Client ────────────────────────────────────────────────────────────────
  { key: 'client_name',      label: 'Client Name(s)',        section: 'client',  type: 'text',  required: true,
    placeholder: 'e.g. Maria and John Johnson' },
  { key: 'client_address_1', label: 'Street Address',        section: 'client',  type: 'text',  required: true },
  { key: 'client_address_2', label: 'City, State ZIP',       section: 'client',  type: 'text',  required: true,
    placeholder: 'Virginia Beach, VA 23452' },
  { key: 'client_email',     label: 'Client Email',          section: 'client',  type: 'email', required: true },
  { key: 'client_phone',     label: 'Client Phone',          section: 'client',  type: 'text',  required: true },

  // ── Orozco Homes ──────────────────────────────────────────────────────────
  { key: 'company_rep_name',  label: 'Representative',       section: 'company', type: 'text', required: true, defaultValue: 'Mary-Blake Orozco' },
  { key: 'company_rep_title', label: 'Title',                section: 'company', type: 'text', defaultValue: 'Owner' },
  { key: 'company_license',   label: 'License Line',         section: 'company', type: 'text', defaultValue: 'Licensed & Insured Class A Contractor' },
  { key: 'company_email',     label: 'Company Email',        section: 'company', type: 'email', defaultValue: 'mborozco@orozcohomes.com' },
  { key: 'company_phone',     label: 'Company Phone',        section: 'company', type: 'text', defaultValue: '757-513-2593' },

  // ── Project ───────────────────────────────────────────────────────────────
  { key: 'proposal_date',     label: 'Proposal Date',        section: 'project', type: 'date', required: true },
  { key: 'project_title',     label: 'Project Name',         section: 'project', type: 'text', required: true,
    placeholder: 'e.g. Three Bathroom Renovations' },

  // ── Timeline & investment ─────────────────────────────────────────────────
  { key: 'estimated_timeline', label: 'Estimated Timeline',  section: 'investment', type: 'text', required: true,
    placeholder: 'e.g. 12–14 weeks; potentially starting around May 18' },
  { key: 'investment_low',     label: 'Estimated Investment — Low ($)',  section: 'investment', type: 'number', required: true },
  { key: 'investment_high',    label: 'Estimated Investment — High ($)', section: 'investment', type: 'number', required: true },

  // ── Retainer terms ────────────────────────────────────────────────────────
  { key: 'retainer_amount',    label: 'Project Retainer Deposit ($)', section: 'terms', type: 'number', required: true, defaultValue: '10000' },
  { key: 'credit_window',      label: 'Construction Agreement Window for Credit', section: 'terms', type: 'text', required: true, defaultValue: 'one (1) week' },
  { key: 'buyout_fee',         label: 'Work Product Buyout Fee ($)', section: 'terms', type: 'number', required: true, defaultValue: '1000' },
];

export const PROPOSAL_SECTIONS = {
  client:     'Client Information',
  company:    'Orozco Homes',
  project:    'Project',
  investment: 'Timeline & Estimated Investment',
  terms:      'Retainer Terms',
};

// Company and terms fields are what "Save as my default" keeps.
export const TEMPLATE_FIELD_KEYS = PROPOSAL_FIELDS
  .filter((f) => f.section === 'company' || f.section === 'terms')
  .map((f) => f.key);

// ── Tokens ──────────────────────────────────────────────────────────────────
export const TOKENS = [
  { token: '{{client_name}}',        label: 'Client name' },
  { token: '{{project_title}}',      label: 'Project name' },
  { token: '{{estimated_timeline}}', label: 'Timeline' },
  { token: '{{investment_range}}',   label: 'Investment range' },
  { token: '{{retainer_amount}}',    label: 'Retainer deposit' },
  { token: '{{credit_window}}',      label: 'Credit window' },
  { token: '{{buyout_fee}}',         label: 'Buyout fee' },
];

export const SECTION_MARKUP_HELP =
  'Each line is a paragraph. Start a line with ## for a bold sub-heading, - for a bullet, and two spaces before - for a sub-bullet. Wrap words in **double stars** for bold.';

// ── Sections ────────────────────────────────────────────────────────────────
// kind: 'text' (title + body), or a block filled from the form fields:
// 'client' (client & company info), 'investment' (timeline & range box,
// body shown under it), 'signatures' (signature lines, body shown above).
export const SECTION_KINDS = {
  text:       'Text section',
  client:     'Client information block',
  investment: 'Timeline & investment block',
  signatures: 'Signature block',
};

export const newSectionId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s${Date.now()}${Math.random().toString(16).slice(2)}`);

const S = (id, title, body, numbered = true, kind = 'text') => ({ id, kind, title, body, numbered });

export const BUILT_IN_SECTIONS = [
  S('intro', '', `This Project Retainer Agreement is made between Orozco Homes and the client for the purpose of initiating formal project planning and reserving placement in the construction calendar for a residential renovation project.
This Agreement outlines the scope of professional services to be performed after deposit and terms required to prepare a complete and build-ready construction plan.`, false),
  S('client', 'Client Information', '', true, 'client'),
  S('overview', 'Project Overview', 'Orozco Homes will complete {{project_title}} under a coordinated construction schedule.', false),
  S('scope', 'Scope of Work', '', false),
  S('materials', 'Materials Included', `(Based on allowances)
- All required building materials`, false),
  S('investment', 'Timeline & Estimated Investment', `**Estimated Investment Disclaimer:** The Estimated Investment Range listed above is a preliminary estimate only and is provided for general budgeting purposes. This estimate is based on limited information available prior to finalized design, material selections, engineering coordination, trade partner pricing validation and full scope confirmation. Orozco Homes will work collaboratively with the client to align scope and selections with the desired investment level while maintaining transparency throughout the development process.`, false, 'investment'),
  S('deposit', 'Purpose of Deposit & Project Initiation', `Upon execution of this Agreement and receipt of the required deposit, Client will be placed into Orozco Homes’ active project development calendar. The deposit secures contractor’s time, coordination efforts, professional resources and trade partner scheduling necessary to prepare the project for construction. Construction work will not commence until a separate Construction Agreement is executed.`),
  S('preconstruction', 'Scope of Preconstruction Services', `Contractor agrees to perform the following preconstruction services:
- Site visits and consultation
- Complete feasibility study and preliminary design assessment
- Develop a project timeline and financial investment outline based on design direction
- No demolition or construction will begin until all major selections are finalized and documented to ensure efficiency, cost control and a seamless build process.
## Client Responsibilities:
Client agrees to:
- Provide timely access to the property
- Make required design and material selections within agreed timelines
- Respond promptly to communications to avoid delays in project planning
Delays in decision-making may affect schedule placement.`),
  S('retainer', 'Project Retainer Fee', `The total Project Retainer Deposit is **{{retainer_amount}}**, due upon execution of this Agreement. This deposit is non-refundable once services begin, as it compensates designers, engineers, consultants and trade partners for early-phase planning and coordination.
## Fee Credit Toward Construction
Once Client executes a Construction Agreement with Orozco Homes within {{credit_window}} of completion of the project development phase, the full deposit amount will be credited toward the final construction contract total. This credit will be applied to the second construction payment and will be reflected in the contract total.
If a Construction Agreement is not executed within {{credit_window}}, the credit will be forfeited due to scheduling and pricing fluctuations.`),
  S('work-product', 'Work Product Ownership, Buyout Rights & Fee Credit', `## Ownership of Deliverables
All drawings, layouts, engineering documents, design concepts, renderings, estimates, and related materials (“Work Product”) prepared or coordinated by Orozco Homes remain the sole property of Orozco Homes unless otherwise agreed in writing. These materials are prepared specifically for use with Orozco Homes’ construction services.
## License Upon Construction Contract
Once Client proceeds to construction with Orozco Homes, full usage rights for permitting and construction will be granted at no additional charge.
## Buyout Option
If Client elects not to proceed with Orozco Homes for construction, Client may purchase the rights to the completed Work Product for an additional buyout fee of **{{buyout_fee}}**.
Upon receipt of full payment of the applicable buyout fee, Orozco Homes will release digital copies and grant a non-exclusive, non-transferable license for use in construction, permitting, or bidding with another contractor.
## Restrictions Without Buyout
Unless the buyout fee is paid in full, Client may not reproduce, distribute, submit for permit, share with other contractors, or otherwise use the Work Product.`),
  S('transition', 'Transition to Construction', `Upon approval of final scope, selections, pricing and scheduling:
- A separate Construction Agreement will be prepared.
- A timeline, total investment amount and payment schedule will be presented.
- A start date will be confirmed based on trade partner availability.
No construction work will begin without a fully executed Construction Agreement.`),
  S('cancellation', 'Cancellation & Termination', `Either party may terminate this Agreement in writing.
If Client terminates this Agreement after services have commenced:
- The Project Retainer Deposit remains non-refundable.
- Client shall be responsible for payment of any third-party expenses incurred on Client’s behalf prior to termination, including but not limited to design fees, engineering fees, consultations, permit research costs, or trade partner mobilization expenses.
- Any outstanding balance for completed professional services beyond the retainer amount shall be due upon receipt of invoice.
If Contractor terminates this Agreement due to lack of Client responsiveness, failure to provide required information, or conduct that materially delays project development, the retainer shall remain non-refundable.
Termination of this Agreement does not transfer ownership rights to any Work Product unless the applicable buyout fee has been paid in full.`),
  S('unforeseen', 'Unforeseen Conditions & Remodel Risk Disclosure', `Client acknowledges that residential renovation and remodeling projects involve existing structures, concealed conditions and unknown site variables.
Conditions that may not be visible at the time of project development may include, but are not limited to:
- Water damage or hidden moisture intrusion
- Structural deficiencies
- Improper prior installations
- Outdated or non-compliant electrical, plumbing, or mechanical systems
- Termite or pest damage
- Asbestos or hazardous materials
- Foundation irregularities
- Inconsistent framing dimensions
Any such unforeseen conditions discovered during further investigation, engineering review, permitting, or construction may require:
- Scope modifications
- Additional work
- Engineering revisions
- Price adjustments
- Timeline extensions
While Orozco Homes works to identify risks during the project development phase, not all concealed conditions can be identified without destructive investigation.
Client understands that final construction pricing may be adjusted to address verified unforeseen conditions discovered after walls, floors, ceilings, or structural elements are opened.`),
  S('signatures', 'Signatures', '', true, 'signatures'),
];

const copySections = (list) => list.map((s) => ({ ...s }));

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Starting values for a new proposal: built-in defaults, then the saved
// default template (company/terms fields and sections) when there is one.
export function proposalDefaults(template = null) {
  const builtIn = Object.fromEntries(PROPOSAL_FIELDS.filter((f) => f.defaultValue).map((f) => [f.key, f.defaultValue]));
  const fields = Object.fromEntries(TEMPLATE_FIELD_KEYS
    .filter((k) => template?.fields?.[k] != null)
    .map((k) => [k, String(template.fields[k])]));
  const sections = Array.isArray(template?.sections) && template.sections.length
    ? template.sections
    : BUILT_IN_SECTIONS;
  return { ...builtIn, ...fields, proposal_date: todayISO(), sections: copySections(sections) };
}

// Puts budget text (overview, scope, materials) into the matching sections,
// adding a section when the template doesn't have one.
export function applyPrefillToSections(sections, { project_overview, scope_of_work, materials_included }) {
  const next = copySections(sections);
  const put = (id, title, body, afterId) => {
    if (!body) return;
    const found = next.find((s) => s.id === id);
    if (found) { found.body = body; return; }
    const at = next.findIndex((s) => s.id === afterId);
    next.splice(at >= 0 ? at + 1 : next.length, 0, { id, kind: 'text', title, body, numbered: false });
  };
  put('overview', 'Project Overview', project_overview, 'client');
  put('scope', 'Scope of Work', scope_of_work, 'overview');
  if (materials_included) {
    const items = materials_included.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => `- ${l.replace(/^[-*•]\s*/, '')}`);
    put('materials', 'Materials Included', ['(Based on allowances)', ...items].join('\n'), 'scope');
  }
  return next;
}

// Proposals saved before sections existed kept overview/scope/materials as
// fields; rebuild their sections from the built-in list.
export function normalizeProposal(formData, template = null) {
  const base = proposalDefaults(template);
  const values = { ...base, ...(formData || {}) };
  if (!Array.isArray(formData?.sections)) {
    values.sections = applyPrefillToSections(copySections(BUILT_IN_SECTIONS), formData || {});
  }
  return values;
}

// ── Formatting ──────────────────────────────────────────────────────────────
// '115000' → '$115,000'; blank stays blank.
export function fmtWhole(val) {
  const n = Number(val);
  if (val === '' || val == null || !Number.isFinite(n)) return '';
  return '$' + Math.round(n).toLocaleString('en-US');
}

export function fmtLongDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function investmentRange(v) {
  const low = fmtWhole(v.investment_low);
  const high = fmtWhole(v.investment_high);
  return low && high ? `${low} – ${high}` : low || high || '';
}

// Fills {{tokens}}; an empty value shows as a blank line to fill in by hand.
export function fillTokens(text, v) {
  const map = {
    client_name: v.client_name, project_title: v.project_title, estimated_timeline: v.estimated_timeline,
    investment_range: investmentRange(v), retainer_amount: fmtWhole(v.retainer_amount),
    credit_window: v.credit_window, buyout_fee: fmtWhole(v.buyout_fee),
  };
  return (text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (all, key) =>
    (key in map ? (map[key] ? String(map[key]) : '________') : all));
}

// Section body → blocks: { type: 'heading'|'para', text } | { type: 'list', items: [{ text, children }] }.
export function parseBody(text) {
  const blocks = [];
  for (const raw of (text || '').split('\n')) {
    if (!raw.trim()) continue;
    const heading = raw.match(/^\s*#{1,3}\s*(.+)$/);
    const sub = raw.match(/^\s{2,}[-*•]\s*(.+)$/);
    const bullet = raw.match(/^\s*[-*•]\s+(.+)$/);
    const last = blocks[blocks.length - 1];
    if (heading) blocks.push({ type: 'heading', text: heading[1].trim() });
    else if (sub && last?.type === 'list') last.items[last.items.length - 1].children.push(sub[1].trim());
    else if (bullet || sub) {
      const item = { text: (bullet ?? sub)[1].trim(), children: [] };
      if (last?.type === 'list') last.items.push(item); else blocks.push({ type: 'list', items: [item] });
    } else blocks.push({ type: 'para', text: raw.trim() });
  }
  return blocks;
}

// Display numbers for numbered sections, in order: { [id]: n }.
export function sectionNumbers(sections) {
  let n = 0;
  return Object.fromEntries(sections.filter((s) => s.numbered).map((s) => [s.id, ++n]));
}

// ── Proposal → Construction Agreement ───────────────────────────────────────
// Section ids whose text belongs to the retainer agreement only (fees,
// buyout, cancellation, risk disclosure) and must not be copied into the
// contract, which has its own terms.
const RETAINER_ONLY_SECTIONS = new Set([
  'intro', 'deposit', 'preconstruction', 'retainer', 'work-product', 'transition', 'cancellation', 'unforeseen',
]);

// Section body → plain contract text: headings stay as lines, bullets become
// "•", sub-bullets "◦", **bold** markers are removed and {{tokens}} filled.
function sectionToPlainText(body, v) {
  const unbold = (t) => t.replace(/\*\*([^*]+)\*\*/g, '$1');
  const out = [];
  for (const b of parseBody(fillTokens(body, v))) {
    if (b.type === 'heading') out.push('', unbold(b.text));
    else if (b.type === 'para') out.push(unbold(b.text));
    else for (const it of b.items) {
      out.push(`• ${unbold(it.text)}`);
      for (const c of it.children) out.push(`    ◦ ${unbold(c)}`);
    }
  }
  return out.join('\n').replace(/^\n+/, '').trim();
}

// Values for the Contracts form from a signed proposal (its frozen copy).
// Numbers (price, deposit, payments, dates) are left for the admin.
export function proposalToContractValues(v) {
  const sections = v.sections ?? [];
  const byId = (id) => sections.find((s) => s.id === id && s.kind === 'text');
  const address = [v.client_address_1, v.client_address_2].map((x) => (x || '').trim()).filter(Boolean).join(', ');

  const scopeParts = [];
  const overview = byId('overview');
  if (overview?.body) scopeParts.push(sectionToPlainText(overview.body, v));
  const scope = byId('scope');
  if (scope?.body) scopeParts.push(sectionToPlainText(scope.body, v));
  // Sections the admin added to this proposal (Permits, Exclusions, …).
  for (const s of sections) {
    if (s.kind !== 'text' || !s.body || RETAINER_ONLY_SECTIONS.has(s.id) || ['overview', 'scope', 'materials'].includes(s.id)) continue;
    const text = sectionToPlainText(s.body, v);
    if (text) scopeParts.push(s.title ? `${s.title.toUpperCase()}\n${text}` : text);
  }

  const materials = byId('materials');
  return {
    client_name:     (v.client_name || '').trim(),
    client_email:    (v.client_email || '').trim(),
    client_phone:    (v.client_phone || '').trim(),
    client_address:  address,
    project_address: address,
    project_type:    (v.project_title || '').trim(),
    scope_of_work:   scopeParts.filter(Boolean).join('\n\n'),
    materials_spec:  materials?.body ? sectionToPlainText(materials.body, v) : '',
  };
}

// Keys a proposal may fill on the contract (no prices or dates).
export const PROPOSAL_TO_CONTRACT_KEYS = [
  'client_name', 'client_email', 'client_phone', 'client_address', 'project_address',
  'project_type', 'scope_of_work', 'materials_spec',
];
