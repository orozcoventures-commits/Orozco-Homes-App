// Subcontract Agreement for one trade on one job (Remodel Estimates → Subs &
// Materials, migration 060). The agreement is Exhibit C (this job's Scope of
// Work, filled in from the estimate) plus the Subcontractor Standards: Exhibit
// A (all trades) and the trade's Exhibit B (src/utils/subStandards.js).
//
// `terms` are the few things the estimate doesn't already know (address,
// price, payment schedule, dates…), saved on the draft. "Send for signature"
// freezes everything into `snapshot`; the subcontractor signs that copy.

import { bullets, versionLabel } from './subStandards';

export const PAYMENT_ROWS_MAX = 8;

const ROUGH_IN_TRADES = new Set(['plumbing', 'electrical', 'hvac']);

export function defaultPayments(tradeKey) {
  return ROUGH_IN_TRADES.has(tradeKey)
    ? [
      { label: 'Rough-in complete and rough-in inspection passed', pct: 50 },
      { label: 'Trade scope complete, final inspection passed, punch list done and approved by Orozco Homes', pct: 50 },
    ]
    : [{ label: 'Trade scope complete, required inspection passed, punch list done and approved by Orozco Homes', pct: 100 }];
}

export function defaultTerms(tradeKey, { amount = '', address = '' } = {}) {
  return {
    job_address: address,
    onsite_lead: '',
    amount,
    payments: defaultPayments(tradeKey),
    start_date: '',
    finish_date: '',
    dependencies: '',
    drawings: '',
    exclusions: '',
    permits: 'Orozco Homes obtains the building permit. Subcontractor obtains any trade permit its license requires, and schedules and passes the inspections for its work.',
    site_notes: 'Work hours Monday–Friday, 8:00 a.m.–5:00 p.m., unless Orozco Homes approves otherwise. Orozco Homes provides access details.',
  };
}

export const toAmount = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};
export const paymentPctTotal = (payments) => (payments ?? []).reduce((s, p) => s + (Number(p.pct) || 0), 0);

// Splits the price by the schedule's percentages; the last row takes the
// rounding so the rows always add up to the price.
export function paymentAmounts(amount, payments) {
  const total = toAmount(amount);
  let left = total;
  return (payments ?? []).map((p, i, all) => {
    const amt = i === all.length - 1 ? Math.round(left * 100) / 100 : Math.round(total * (Number(p.pct) || 0)) / 100;
    left -= amt;
    return { label: p.label, pct: Number(p.pct) || 0, amount: amt };
  });
}

// First problem that stops the agreement from being sent, or null.
export function sendProblem({ terms, sub, scope }) {
  if (!sub) return 'Pick who performs this trade ("Performed by") first.';
  if (!String(terms.job_address ?? '').trim()) return 'Enter the job address.';
  if (toAmount(terms.amount) <= 0) return 'Enter the subcontract price.';
  if (!(terms.payments ?? []).length) return 'Add at least one payment to the schedule.';
  if ((terms.payments ?? []).some((p) => !String(p.label ?? '').trim())) return 'Describe each payment in the schedule.';
  if (Math.abs(paymentPctTotal(terms.payments) - 100) > 0.001) return `The payment schedule adds up to ${paymentPctTotal(terms.payments)}% — it must be 100%.`;
  if (!String(scope ?? '').trim()) return 'Write the scope of work for this trade first.';
  return null;
}

// "Exhibit A §7" for the general section whose title matches, else "Exhibit A".
function sectionRef(general, re) {
  const i = general.findIndex((s) => re.test(s.title));
  return i >= 0 ? `Exhibit A §${i + 1} (${general[i].title})` : 'Exhibit A';
}

export function buildSnapshot({ terms, project, sub, trade, scope, items, company, standards }) {
  const s = standards.content;
  return {
    date: new Date().toISOString().slice(0, 10),
    company,
    project: { name: project.name, type: project.type, address: String(terms.job_address).trim() },
    sub,
    trade: { key: trade.key, label: trade.label },
    onsite_lead: String(terms.onsite_lead ?? '').trim(),
    scope: String(scope).trim(),
    items,
    amount: toAmount(terms.amount),
    payments: paymentAmounts(terms.amount, terms.payments),
    start_date: terms.start_date || '',
    finish_date: terms.finish_date || '',
    dependencies: String(terms.dependencies ?? '').trim(),
    drawings: String(terms.drawings ?? '').trim(),
    exclusions: String(terms.exclusions ?? '').trim(),
    permits: String(terms.permits ?? '').trim(),
    site_notes: String(terms.site_notes ?? '').trim(),
    changes_ref: sectionRef(s.general, /change/i),
    closeout_ref: sectionRef(s.general, /punch|closeout|warranty/i),
    standards: {
      version_no: standards.version_no,
      version_label: versionLabel(standards),
      intro: s.intro,
      general: s.general.map((g) => ({ title: g.title, items: bullets(g.text) })),
      trade: { title: s.trades[trade.key]?.title ?? trade.label, items: bullets(s.trades[trade.key]?.text) },
      incorporation: s.incorporation,
    },
  };
}

// Private link: /s/<64 hex characters>.
export function subAgreementRoute(pathname) {
  const m = pathname.match(/^\/s\/([0-9a-f]{64})\/?$/i);
  return m ? { token: m[1].toLowerCase() } : null;
}
export const subAgreementUrl = (token) => `${window.location.origin}/s/${token}`;

export const AGREEMENT_STATUS = {
  none:          { label: 'No agreement yet',                 color: '#6B7280', bg: '#F9F8F6', border: '#E8E6E1' },
  draft:         { label: 'Agreement draft',                  color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
  sent:          { label: 'Sent — waiting for signature',     color: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD' },
  signed:        { label: 'Signed by sub — countersign',      color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
  countersigned: { label: 'Agreement fully signed',           color: '#166534', bg: '#F0FDF4', border: '#BBF7D0' },
};
