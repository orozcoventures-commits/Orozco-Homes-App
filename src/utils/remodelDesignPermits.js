// "Design & Permits" — the first section of every Remodel Budget project type.
// 2026 Hampton Roads / Virginia Beach pricing: design consultation and
// selections, permit-set drawings, structural engineering where the work is
// structural, and building permit + inspection fees.
//
// New lines are keyed 'P.n'. Permit / engineering lines that already existed
// move here from their old section (['move', wbs]) and keep their wbs, so saved
// amounts and actual costs stay on them. A section left empty by a move is
// dropped. Budgets saved before this start with the new P lines removed (see
// upgradeLayout in RemodelBudget).

const NEW_LINES = {
  consult:  ['P.1', 'Design Consultation & Selections'],
  drawings: ['P.2', 'Architectural Drawings / Permit Plans'],
  struct:   ['P.3', 'Structural Engineering'],
  permit:   ['P.4', 'Building Permit & Inspections'],
};
export const DESIGN_PERMIT_NEW_LINES = Object.values(NEW_LINES).map(([wbs]) => wbs);

const n = (kind, standard, mid, custom) => ({ kind, rates: { standard, mid, custom } });
const move = (wbs) => ({ move: wbs });

// Per project type, in display order.
const PLAN = {
  // Bathrooms
  'bathroom-small':      [n('consult', 400, 750, 1500),  n('drawings', 500, 850, 1600),   n('permit', 250, 325, 425)],
  'bathroom-medium':     [n('consult', 500, 900, 1800),  n('drawings', 600, 1000, 2000),  n('permit', 275, 375, 475)],
  'bathroom-large':      [n('consult', 650, 1200, 2400), n('drawings', 750, 1300, 2500),  n('permit', 325, 425, 575)],
  'add-shower':          [n('consult', 300, 500, 900),   n('permit', 300, 400, 550)],
  'tub-to-shower':       [n('consult', 250, 400, 750),   n('permit', 175, 250, 350)],
  'bath-refresh':        [n('consult', 150, 250, 450)],
  'aging-in-place-bath': [n('consult', 300, 500, 900),   n('permit', 300, 400, 550)],
  'double-vanity':       [n('consult', 150, 250, 450)],
  // Kitchens
  'kitchen-small':       [n('consult', 600, 1000, 2000), n('drawings', 750, 1250, 2500),  n('permit', 325, 425, 550)],
  'kitchen-medium':      [n('consult', 750, 1250, 2500), n('drawings', 900, 1500, 3000),  n('permit', 375, 475, 625)],
  'kitchen-large':       [n('consult', 950, 1600, 3200), n('drawings', 1100, 1900, 3800), n('permit', 425, 550, 725)],
  'kitchen-refresh':     [n('consult', 150, 250, 450)],
  'kitchen-island':      [n('consult', 300, 500, 900),   n('permit', 200, 275, 375)],
  // Additions & structure
  'addition':            [n('consult', 1500, 3000, 6000), n('drawings', 3500, 6000, 10000), move('1.2'), move('1.1')],
  'portico':             [n('consult', 400, 750, 1500),  n('drawings', 1200, 2000, 3500), n('struct', 600, 900, 1400), n('permit', 300, 400, 550)],
  'garage-conversion':   [n('consult', 750, 1250, 2500), n('drawings', 1800, 3000, 5000), n('permit', 600, 800, 1100)],
  'attic-conversion':    [n('consult', 1000, 2000, 4000), n('drawings', 2500, 4000, 7000), move('1.1')],
  'full-renovation':     [n('consult', 1500, 3000, 6000), n('drawings', 4000, 7500, 12000), move('1.3')],
  'wall-removal':        [n('consult', 300, 500, 900),   move('1.1'), move('1.2')],
  // Interior
  'fireplace-builtin':   [n('consult', 300, 500, 900),   n('permit', 250, 350, 500)],
  'laundry-mudroom':     [n('consult', 300, 500, 900),   n('permit', 250, 350, 450)],
  'closet-buildout':     [n('consult', 150, 250, 450)],
  'home-office-builtins':[n('consult', 150, 250, 450)],
  'staircase-remodel':   [n('consult', 150, 250, 450)],
  'trim-molding':        [n('consult', 150, 250, 450)],
  'interior-painting':   [n('consult', 150, 250, 450)],
  'popcorn-removal':     [n('consult', 150, 250, 450)],
  'flooring':            [n('consult', 150, 250, 450)],
  // Exterior & outdoor
  'deck':                [n('consult', 300, 500, 900),   move('1.1')],
  'screened-porch':      [n('consult', 300, 500, 900),   move('1.1')],
  'window-replacement':  [n('consult', 150, 250, 450)],
  'exterior-door':       [n('consult', 150, 250, 450)],
  'siding':              [n('consult', 150, 250, 450)],
  // Repairs & building health
  'crawlspace-encapsulation': [n('consult', 150, 250, 450)],
  'water-damage-repair': [n('consult', 150, 250, 450)],
};

// Sections renamed because their permit / engineering lines moved out.
const RELABEL = {
  'attic-conversion': { div1: 'Structure' },
  'deck':             { div1: 'Demo' },
};

export function withDesignPermits(configs) {
  const out = {};
  for (const [type, cfg] of Object.entries(configs)) {
    const plan = PLAN[type];
    if (!plan) { out[type] = cfg; continue; }
    const moved = new Set(plan.filter((p) => p.move).map((p) => p.move));
    const found = {};
    const divisions = cfg.divisions
      .map((d) => ({
        ...d,
        label: RELABEL[type]?.[d.key] ?? d.label,
        items: d.items.filter((it) => {
          if (!moved.has(it.wbs)) return true;
          found[it.wbs] = it;
          return false;
        }),
      }))
      .filter((d) => d.items.length > 0 || !cfg.divisions.find((o) => o.key === d.key).items.some((it) => moved.has(it.wbs)));
    const items = plan.map((p, i) => {
      const badge = `P.${i + 1}`;
      if (p.move) {
        if (!found[p.move]) throw new Error(`Design & Permits: ${type} has no line ${p.move} to move`);
        return { ...found[p.move], badge };
      }
      const [wbs, label] = NEW_LINES[p.kind];
      return { wbs, badge, label, unit: 'flat', rates: p.rates };
    });
    out[type] = { ...cfg, divisions: [{ key: 'divP', num: 'P', label: 'Design & Permits', items }, ...divisions] };
  }
  return out;
}
