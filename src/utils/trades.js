// Subcontractor trades used by Remodel Estimates → Subs & Materials, the
// Subcontractor Standards (Exhibit B has one section per trade) and the
// Subcontract Agreements. Listed in construction order.
export const TRADES = [
  { key: 'demolition', label: 'Demolition' },
  { key: 'concrete',   label: 'Concrete / Foundation' },
  { key: 'framing',    label: 'Framing' },
  { key: 'roofing',    label: 'Roofing' },
  { key: 'windows',    label: 'Windows & Doors' },
  { key: 'siding',     label: 'Siding & Exterior' },
  { key: 'plumbing',   label: 'Plumbing (Rough-In + Finish)' },
  { key: 'hvac',       label: 'HVAC' },
  { key: 'electrical', label: 'Electrical (Rough-In + Finish)' },
  { key: 'insulation', label: 'Insulation' },
  { key: 'drywall',    label: 'Drywall' },
  { key: 'tiling',     label: 'Tiling' },
  { key: 'flooring',   label: 'Flooring' },
  { key: 'carpentry',  label: 'Finish Carpentry / Cabinets' },
  { key: 'painting',   label: 'Painting' },
  { key: 'other',      label: 'Other sub work' },
];

// Directory subcontractors that usually do each trade, matched on their
// trade/specialty text (Subs & Materials "Performed by", Subcontractors list).
const TRADE_MATCH = {
  demolition: /demo|haul|junk|debris/i,
  concrete:   /concrete|foundation|mason|footing|sidewalk|driveway|paver/i,
  framing:    /fram|carpent|structur/i,
  roofing:    /roof/i,
  windows:    /window|door/i,
  siding:     /siding|exterior|gutter/i,
  plumbing:   /plumb/i,
  hvac:       /hvac|heat|air cond|mechanical|mini-split|duct/i,
  electrical: /electric/i,
  insulation: /insulat|spray foam/i,
  drywall:    /drywall|sheetrock/i,
  tiling:     /tile/i,
  flooring:   /floor|carpet/i,
  carpentry:  /carpent|cabinet|trim|finish|millwork|countertop/i,
  painting:   /paint/i,
  other:      /glass/i,
};
export const subMatchesTrade = (sub, trade) => !!TRADE_MATCH[trade]?.test(`${sub.service ?? ''} ${sub.specialty ?? ''}`);

// Subcontractors → Directory groups, in the order of a job. A sub is listed
// once, under the first group its trade ("service") matches, else its
// specialty.
const tradeGroup = (t) => ({ key: t.key, label: t.key === 'other' ? 'Glass & Specialty Work' : t.label.replace(/ \(.*\)$/, ''), re: TRADE_MATCH[t.key] });
export const DIRECTORY_GROUPS = [
  { key: 'design', label: 'Design, Engineering & Survey', re: /architect|design|engineer|survey/i },
  ...TRADES.map(tradeGroup),
  { key: 'general', label: 'General Contractors & Multi-Trade', re: /general|various|remodel|kitchen|handyman/i },
  { key: 'suppliers', label: 'Suppliers & Materials', re: /material|lumber|hardware|supply|appliance|stone/i },
  { key: 'site', label: 'Site & Outdoor Services', re: /dumpster|portable|toilet|clean|landscap|tree|fence|\bwell\b|wildlife|pest|septic|irrigation/i },
  { key: 'environmental', label: 'Environmental & Remediation', re: /mold|environment|asbestos|abatement|remediat/i },
];
export const UNGROUPED = { key: 'unsorted', label: 'Other' };

// Finish carpentry is checked before framing, so "Carpentry, Trims" isn't
// filed under Framing.
const MATCH_ORDER = DIRECTORY_GROUPS.filter((g) => g.key !== 'carpentry');
MATCH_ORDER.splice(MATCH_ORDER.findIndex((g) => g.key === 'framing'), 0, DIRECTORY_GROUPS.find((g) => g.key === 'carpentry'));

export function directoryGroupOf(sub) {
  for (const text of [sub.service, sub.specialty]) {
    const g = text && MATCH_ORDER.find((x) => x.re.test(text));
    if (g) return g;
  }
  return UNGROUPED;
}
