// Allowance helpers for Designer Workspace: which allowance a selection
// counts toward, and how the selections compare with each allowance.
// Allowances come from the Remodel Budget (get_project_allowances, migration
// 052) as [{ key, label, amount }]. A selection's allowance cost is its
// material price (unit price × quantity), not installation labor.

export const specMaterialCost = (spec) => (Number(spec?.unit_price) || 0) * (Number(spec?.quantity) || 0);

const STOP = new Set(['and', 'the', 'with', 'for', 'mat', 'labor', 'package', 'new', 'installed']);
const SYNONYMS = { cabinetry: 'cabinet', cabinets: 'cabinet', counters: 'countertop', countertops: 'countertop', tiles: 'tile',
  fixtures: 'fixture', lights: 'lighting', light: 'lighting', sconces: 'lighting', pendants: 'pendant', faucets: 'faucet',
  sinks: 'sink', mirrors: 'mirror', appliances: 'appliance', floors: 'floor', flooring: 'floor', vanities: 'vanity', toilets: 'toilet' };
const words = (text) => String(text ?? '').toLowerCase().split(/[^a-z]+/)
  .filter((w) => w.length >= 3 && !STOP.has(w)).map((w) => SYNONYMS[w] ?? w);

// The allowance whose name shares the most words with the selection's name, or ''.
export function suggestAllowanceKey(text, allowances = []) {
  const mine = new Set(words(text));
  let best = ''; let score = 0;
  for (const a of allowances) {
    const s = words(a.label).filter((w) => mine.has(w)).length;
    if (s > score) { best = a.key; score = s; }
  }
  return best;
}

// One row per allowance: selections that count toward it (declined ones don't).
export function compareAllowances(allowances = [], specs = []) {
  return allowances.map((a) => {
    const mine = specs.filter((s) => s.allowance_key === a.key && s.status !== 'declined');
    const approved = mine.filter((s) => s.status === 'approved').reduce((t, s) => t + specMaterialCost(s), 0);
    const pending = mine.filter((s) => s.status !== 'approved').reduce((t, s) => t + specMaterialCost(s), 0);
    const selected = approved + pending;
    return { ...a, approved, pending, selected, count: mine.length, diff: (Number(a.amount) || 0) - selected };
  });
}
