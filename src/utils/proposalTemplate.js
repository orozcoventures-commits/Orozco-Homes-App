// src/utils/proposalTemplate.js — Orozco Homes Project Retainer Agreement (proposal)
//
// The form fields, defaults and helpers for the Proposals page. The legal
// sections (2–9) are rendered in ProposalDocument.jsx with these values.

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
  { key: 'project_overview',  label: 'Project Overview',     section: 'project', type: 'textarea', required: true,
    placeholder: 'e.g. Orozco Homes will complete three full bathroom renovations under a coordinated and phased construction schedule to maintain functionality within the home.' },
  { key: 'scope_of_work',     label: 'Scope of Work',        section: 'project', type: 'textarea', rows: 14, required: true,
    hint: 'Start a line with ## for a heading, - for a bullet, and two spaces before - for a sub-bullet.' },
  { key: 'materials_included', label: 'Materials Included (based on allowances)', section: 'project', type: 'textarea', rows: 6,
    hint: 'One item per line.' },

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
  project:    'Project & Scope',
  investment: 'Timeline & Estimated Investment',
  terms:      'Retainer Terms',
};

export const STANDARD_MATERIALS = 'All required building materials';

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function proposalDefaults() {
  const values = Object.fromEntries(PROPOSAL_FIELDS.filter((f) => f.defaultValue).map((f) => [f.key, f.defaultValue]));
  return { ...values, proposal_date: todayISO(), materials_included: STANDARD_MATERIALS };
}

// '115000' → '$115,000'; blank stays blank for the "[ ]" placeholder.
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

// Scope text → [{ heading, items: [{ text, children: [text] }] }].
export function parseScope(text) {
  const sections = [];
  let current = null;
  for (const raw of (text || '').split('\n')) {
    if (!raw.trim()) continue;
    const heading = raw.match(/^\s*#{1,3}\s*(.+)$/);
    const sub = raw.match(/^\s{2,}[-*•]\s*(.+)$/);
    const bullet = raw.match(/^\s*[-*•]\s*(.+)$/);
    if (heading) { current = { heading: heading[1].trim(), items: [] }; sections.push(current); continue; }
    if (!current) { current = { heading: '', items: [] }; sections.push(current); }
    if (sub && current.items.length) current.items[current.items.length - 1].children.push(sub[1].trim());
    else current.items.push({ text: (bullet ? bullet[1] : raw).trim(), children: [] });
  }
  return sections;
}

export const lines = (text) => (text || '').split('\n').map((l) => l.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean);
