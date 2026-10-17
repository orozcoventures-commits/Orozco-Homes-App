// ─────────────────────────────────────────────────────────────────────────────
// Renovation project types for the Remodel Budget (partial / smaller jobs).
// Regional basis: Virginia Beach / Hampton Roads, VA  |  Index year: 2026
// Rates are { standard, mid, custom } in 2026 dollars (material + labor or
// subcontract), before contingency and gross margin. Units are the same as
// the core configs; 'qty' multiplies by the "qty" input (windows, steps).
// Added to REMODEL_CONFIGS in remodelBudgetCalculator.js.
// ─────────────────────────────────────────────────────────────────────────────

const L = (wbs, label, unit, standard, mid, custom) => ({ wbs, label, unit, rates: { standard, mid, custom } });
const D = (key, num, label, items) => ({ key, num, label, items });

const MARGINS = D('divM', 'M', 'Margins & Contingency', [
  { wbs: 'M.2', label: 'Gross Margin (35%)', unit: 'pct', pctKey: 'profitPct',      pctLabel: 'Margin %' },
  { wbs: 'M.3', label: 'Contingency (10%)',  unit: 'pct', pctKey: 'contingencyPct', pctLabel: 'Reserve %' },
]);

const sqftInput = (label, def, min, max, step) => ({ key: 'sqft', label, unit: 'sqft', default: def, min, max, step });
const lfInput   = (label, def, min, max) => ({ key: 'cabinetLinearFt', label, unit: 'linear ft', default: def, min, max, step: 1 });
const qtyInput  = (label, def, min, max) => ({ key: 'qty', label, unit: 'qty', default: def, min, max, step: 1 });

export const RENOVATION_CONFIGS = {

  // ── BATHROOM PROJECTS ────────────────────────────────────────────────────
  'add-shower': {
    label: 'Add a Shower (Toilet + Sink Bath)',
    icon: 'bath',
    inputFields: [sqftInput('Shower Size', 15, 9, 60, 1)],
    divisions: [
      D('div1', '1', 'Demo & Framing', [
        L('1.1', 'Selective Demo & Haul',                 'flat', 1200, 1600, 2200),
        L('1.2', 'Floor & Wall Protection',               'flat',  250,  350,  500),
        L('1.3', 'Shower Wall Framing & Blocking',        'flat',  650,  900, 1400),
      ]),
      D('div2', '2', 'Plumbing Rough-In', [
        L('2.1', 'New Drain & Vent Tie-In',               'flat', 1800, 2400, 3400),
        L('2.2', 'Shower Valve & Supply Rough-In',        'flat',  900, 1200, 1800),
      ]),
      D('divE', 'E', 'Electrical Rough-In', [
        L('E.1', 'Exhaust Fan, GFCI & Light',             'flat',  650,  900, 1400),
      ]),
      D('div3', '3', 'Shower & Tile', [
        L('3.1', 'Shower Pan & Waterproofing',            'sqft',  100,  160,  280),
        L('3.2', 'Shower Wall Tile (Mat + Labor)',        'flat', 2800, 4200, 7000),
        L('3.3', 'Glass Door / Enclosure',                'flat',  900, 1800, 3800),
      ]),
      D('div4', '4', 'Fixtures', [
        L('4.1', 'Shower Trim Kit & Head',                'flat',  350,  700, 1600),
      ]),
      D('div5', '5', 'Finish Work', [
        L('5.1', 'Drywall Patch & Paint',                 'flat',  700,  900, 1300),
        L('5.2', 'Plumbing Final Set',                    'flat',  400,  550,  800),
      ]),
      MARGINS,
    ],
  },

  'tub-to-shower': {
    label: 'Tub-to-Shower Conversion',
    icon: 'bath',
    inputFields: [sqftInput('Shower Size', 15, 9, 60, 1)],
    divisions: [
      D('div1', '1', 'Demo', [
        L('1.1', 'Tub Removal & Haul',                    'flat',  700,  900, 1200),
      ]),
      D('divS', 'S', 'Site Prep', [
        L('S.1', 'Dumpster (Roll-Off, Haul & Disposal)',  'flat',  395,  450,  525),
        L('S.2', 'Porta Potty (Rental + Weekly Service)', 'flat',  185,  210,  265),
        { ...L('1.2', 'Floor & Wall Protection',               'flat',  200,  300,  450), badge: 'S.3' },   // moved from Demo & Prep (same wbs)
      ]),
      D('div2', '2', 'Plumbing Rough-In', [
        L('2.1', 'Valve Relocation & Drain Conversion',   'flat',  900, 1300, 2000),
      ]),
      D('div3', '3', 'Shower & Tile', [
        L('3.1', 'Shower Pan & Waterproofing',            'sqft',  100,  150,  270),
        L('3.2', 'Shower Wall Tile (Mat + Labor)',        'flat', 2600, 3800, 6500),
        L('3.3', 'Glass Door / Enclosure',                'flat',  900, 1800, 3800),
      ]),
      D('div4', '4', 'Fixtures', [
        L('4.1', 'Shower Trim Kit & Head',                'flat',  350,  700, 1600),
      ]),
      D('div5', '5', 'Finish Work', [
        L('5.1', 'Drywall Patch & Paint',                 'flat',  500,  700, 1000),
        L('5.2', 'Plumbing Final Set',                    'flat',  350,  450,  700),
      ]),
      MARGINS,
    ],
  },

  'bath-refresh': {
    label: 'Bathroom Refresh (No Tile / Plumbing Moves)',
    icon: 'bath',
    inputFields: [sqftInput('Bathroom Size', 50, 20, 200, 5)],
    divisions: [
      D('div1', '1', 'Demo', [
        L('1.1', 'Remove Old Fixtures & Haul',            'flat',  400,  600,  900),
      ]),
      D('divS', 'S', 'Site Prep', [
        L('S.1', 'Dumpster (Roll-Off, Haul & Disposal)',  'flat',  350,  395,  450),
        L('S.2', 'Porta Potty (Rental + Weekly Service)', 'flat',  185,  210,  265),
        L('S.3', 'Site Protection & Dust Barriers',       'flat',  150,  200,  275),
      ]),
      D('div2', '2', 'Fixtures & Finishes', [
        L('2.1', 'Vanity + Top',                          'flat', 1200, 2200, 4500),
        L('2.2', 'Faucet',                                'flat',  200,  400,  900),
        L('2.3', 'Toilet',                                'flat',  450,  700, 1400),
        L('2.4', 'Mirror / Medicine Cabinet',             'flat',  200,  400,  900),
        L('2.5', 'Lighting',                              'flat',  300,  600, 1200),
        L('2.6', 'Accessories Package',                   'flat',  150,  300,  700),
      ]),
      D('div3', '3', 'Install & Hookups', [
        L('3.1', 'Plumbing Hookups (Same Locations)',     'flat',  450,  600,  900),
        L('3.2', 'Electrical Fixture Swap',               'flat',  250,  350,  500),
      ]),
      D('div4', '4', 'Finish Work', [
        L('4.1', 'Paint',                                 'sqft',    5,    7,   10),
        L('4.2', 'Drywall Touch-Up',                      'flat',  200,  300,  500),
      ]),
      MARGINS,
    ],
  },

  'aging-in-place-bath': {
    label: 'Aging-in-Place / Accessible Bath',
    icon: 'bath',
    inputFields: [sqftInput('Bathroom Size', 60, 30, 200, 5)],
    divisions: [
      D('div1', '1', 'Demo', [
        L('1.1', 'Demo & Haul',                           'sqft',   14,   16,   20),
      ]),
      D('divS', 'S', 'Site Prep', [
        L('S.1', 'Dumpster (Roll-Off, Haul & Disposal)',  'flat',  475,  550,  650),
        L('S.2', 'Porta Potty (Rental + Weekly Service)', 'flat',  185,  210,  265),
        L('S.3', 'Site Protection & Dust Barriers',       'flat',  250,  325,  450),
      ]),
      D('div2', '2', 'Plumbing Rough-In', [
        L('2.1', 'Curbless Drain, Valve & Supply',        'flat', 2500, 3400, 5000),
      ]),
      D('divE', 'E', 'Electrical Rough-In', [
        L('E.1', 'Lighting, GFCI & Exhaust Fan',          'flat', 1000, 1500, 2400),
      ]),
      D('div3', '3', 'Framing & Access', [
        L('3.1', 'Widen Doorway (36")',                   'flat',  900, 1300, 2000),
        L('3.2', 'Grab-Bar Blocking',                     'flat',  300,  450,  700),
      ]),
      D('div4', '4', 'Shower & Tile', [
        L('4.1', 'Curbless Shower Pan & Waterproofing',   'flat', 2800, 4000, 6500),
        L('4.2', 'Non-Slip Floor Tile (Mat + Labor)',     'sqft',   20,   30,   48),
        L('4.3', 'Shower Wall Tile (Mat + Labor)',        'flat', 2800, 4000, 6500),
      ]),
      D('div5', '5', 'Fixtures & Safety', [
        L('5.1', 'Grab Bars (Installed)',                 'flat',  450,  700, 1200),
        L('5.2', 'Comfort-Height Toilet',                 'flat',  600,  900, 1600),
        L('5.3', 'Accessible Vanity',                     'flat', 1200, 2000, 3800),
        L('5.4', 'Handheld Shower & Trim',                'flat',  450,  800, 1600),
        L('5.5', 'Glass Panel / Curtain Rod',             'flat',  600, 1200, 2800),
        L('5.6', 'Paint & Trim',                          'flat',  500,  700, 1000),
      ]),
      MARGINS,
    ],
  },

  'double-vanity': {
    label: 'Second Vanity / Double Sink',
    icon: 'bath',
    inputFields: [],
    divisions: [
      D('div1', '1', 'Demo', [
        L('1.1', 'Remove Old Vanity & Haul',              'flat',  300,  400,  600),
      ]),
      D('divS', 'S', 'Site Prep', [
        L('S.1', 'Dumpster (Roll-Off, Haul & Disposal)',  'flat',  350,  395,  450),
        L('S.2', 'Porta Potty (Rental + Weekly Service)', 'flat',  185,  210,  265),
        L('S.3', 'Site Protection & Dust Barriers',       'flat',  150,  200,  275),
      ]),
      D('div2', '2', 'Plumbing Rough-In', [
        L('2.1', 'Plumbing Branch for Second Sink',       'flat',  900, 1300, 1900),
      ]),
      D('divE', 'E', 'Electrical Rough-In', [
        L('E.1', 'Light / Outlet Relocation',             'flat',  350,  550,  900),
      ]),
      D('div3', '3', 'Vanity & Fixtures', [
        L('3.1', 'Double Vanity Cabinet',                 'flat', 1100, 1600, 4000),
        L('3.2', 'Countertop with Two Sinks',             'flat',  700, 1000, 2400),
        L('3.3', 'Two Faucets',                           'flat',  300,  600, 1400),
        L('3.4', 'Mirrors',                               'flat',  250,  450, 1000),
        L('3.5', 'Light Fixture',                         'flat',  250,  450, 1000),
      ]),
      D('div4', '4', 'Finish Work', [
        L('4.1', 'Plumbing Final Set',                    'flat',  300,  400,  600),
        L('4.2', 'Drywall Touch-Up & Paint',              'flat',  250,  350,  550),
      ]),
      MARGINS,
    ],
  },

  // ── KITCHEN PROJECTS ─────────────────────────────────────────────────────
  'kitchen-refresh': {
    label: 'Kitchen Refresh (Paint Cabinets + Counters)',
    icon: 'kitchen',
    inputFields: [lfInput('Cabinet Length', 20, 6, 60)],
    divisions: [
      D('div1', '1', 'Demo', [
        { ...L('1.2', 'Countertop Tear-Out & Haul',            'flat',  400,  600,  900), badge: '1.1' },
      ]),
      D('divS', 'S', 'Site Prep', [
        L('S.1', 'Dumpster (Roll-Off, Haul & Disposal)',  'flat',  395,  450,  525),
        L('S.2', 'Porta Potty (Rental + Weekly Service)', 'flat',  185,  210,  265),
        { ...L('1.1', 'Protection & Prep',                     'flat',  300,  400,  600), badge: 'S.3' },   // moved from Demo & Prep (same wbs)
      ]),
      D('div2', '2', 'Cabinets', [
        L('2.1', 'Cabinet Painting (Doors + Boxes)',      'linear_ft', 120, 170, 260),
        L('2.2', 'New Hardware',                          'linear_ft',  12,  20,  40),
      ]),
      D('div3', '3', 'Countertops & Backsplash', [
        L('3.1', 'Countertops (Fabricated + Installed)',  'countertop_sqft', 60, 85, 140),
        L('3.2', 'Backsplash Tile (Mat + Labor)',         'backsplash_sqft', 28, 40,  65),
      ]),
      D('div4', '4', 'Fixtures', [
        L('4.1', 'Sink',                                  'flat',  300,  550, 1200),
        L('4.2', 'Faucet',                                'flat',  250,  500, 1100),
        L('4.3', 'Plumbing Reconnect',                    'flat',  400,  550,  800),
        L('4.4', 'Under-Cabinet Lighting',                'flat',  500,  800, 1500),
      ]),
      D('div5', '5', 'Finish Work', [
        L('5.1', 'Wall Paint',                            'flat',  500,  700, 1000),
      ]),
      MARGINS,
    ],
  },

  'kitchen-island': {
    label: 'Kitchen Island Addition',
    icon: 'kitchen',
    inputFields: [],
    divisions: [
      D('div1', '1', 'Prep', [
        L('1.1', 'Flooring Prep / Patch at Island',       'flat',  600,  900, 1500),
      ]),
      D('div2', '2', 'Island', [
        L('2.1', 'Island Cabinets',                       'flat', 2000, 3200, 6000),
        L('2.2', 'Island Countertop',                     'flat', 1500, 2400, 4500),
      ]),
      D('divE', 'E', 'Electrical', [
        L('E.1', 'Island Outlets & Circuit',              'flat',  600,  900, 1400),
        L('E.2', 'Pendant Lights (Installed)',            'flat',  450,  800, 1600),
      ]),
      D('div3', '3', 'Finish Work', [
        L('3.1', 'End Panels & Trim',                     'flat',  300,  500,  900),
        L('3.2', 'Paint / Touch-Up',                      'flat',  200,  300,  500),
      ]),
      MARGINS,
    ],
  },

  // ── INTERIOR RENOVATIONS ─────────────────────────────────────────────────
  'fireplace-builtin': {
    label: 'Fireplace Removal + Built-In',
    icon: 'renovation',
    inputFields: [lfInput('Built-In Length', 8, 2, 30)],
    divisions: [
      D('div1', '1', 'Demo', [
        L('1.1', 'Fireplace & Hearth Demo + Haul',        'flat', 2500, 3500, 5000),
      ]),
      D('divS', 'S', 'Site Prep', [
        L('S.1', 'Dumpster (Roll-Off, Haul & Disposal)',  'flat',  475,  550,  650),
        L('S.2', 'Porta Potty (Rental + Weekly Service)', 'flat',  185,  210,  265),
        { ...L('1.2', 'Dust Protection',                       'flat',  250,  350,  500), badge: 'S.3' },   // moved from Demo & Prep (same wbs)
      ]),
      D('div2', '2', 'Structure & Framing', [
        L('2.1', 'Chimney Cap & Roof Patch',              'flat', 1200, 1800, 2800),
        L('2.2', 'Framing Infill',                        'flat',  800, 1100, 1600),
      ]),
      D('divE', 'E', 'Electrical', [
        L('E.1', 'Outlets & Built-In Lighting',           'flat',  500,  800, 1400),
      ]),
      D('div3', '3', 'Built-In Cabinetry', [
        L('3.1', 'Built-In Cabinets & Shelving',          'linear_ft', 350, 550, 900),
      ]),
      D('div4', '4', 'Finish Work', [
        L('4.1', 'Drywall Patch',                         'flat',  600,  800, 1100),
        L('4.2', 'Flooring Patch',                        'flat',  600,  900, 1500),
        L('4.3', 'Paint & Trim',                          'flat',  500,  700, 1000),
      ]),
      MARGINS,
    ],
  },

  'wall-removal': {
    label: 'Wall Removal / Open Concept',
    icon: 'renovation',
    inputFields: [lfInput('Wall Length', 12, 4, 40)],
    divisions: [
      D('div1', '1', 'Engineering & Permits', [
        L('1.1', 'Structural Engineering',                'flat',  800, 1200, 1800),
        L('1.2', 'Building Permit',                       'flat',  400,  600,  900),
      ]),
      D('div2', '2', 'Demo & Structure', [
        L('2.1', 'Wall Demo & Haul',                      'flat', 1000, 1400, 2000),
        L('2.2', 'Beam + Temporary Shoring (Load-Bearing)', 'linear_ft', 300, 450, 700),
      ]),
      D('divE', 'E', 'Electrical', [
        L('E.1', 'Relocate Switches, Outlets & Lights',   'flat',  600, 1000, 1800),
      ]),
      D('div3', '3', 'Finish Work', [
        L('3.1', 'Drywall & Ceiling Patch',               'flat', 1000, 1400, 2000),
        L('3.2', 'Flooring Patch',                        'flat',  800, 1200, 2000),
        L('3.3', 'Paint',                                 'flat',  700,  900, 1300),
      ]),
      MARGINS,
    ],
  },

  'flooring': {
    label: 'Flooring Replacement',
    icon: 'renovation',
    inputFields: [sqftInput('Floor Area', 500, 100, 5000, 50)],
    divisions: [
      D('div1', '1', 'Removal & Prep', [
        L('1.1', 'Remove & Haul Old Flooring',            'sqft',  2,   2.5,  3.5),
        L('1.2', 'Subfloor Prep & Leveling',              'sqft',  1.5, 2,    3),
      ]),
      D('div2', '2', 'Flooring', [
        L('2.1', 'Flooring Material + Install (LVP / Engineered / Hardwood)', 'sqft', 6, 10, 16),
      ]),
      D('div3', '3', 'Trim', [
        L('3.1', 'Baseboard & Shoe Molding',              'sqft',  1.2, 1.6,  2.5),
        L('3.2', 'Transitions & Thresholds',              'flat',  200,  300,  500),
      ]),
      MARGINS,
    ],
  },

  'attic-conversion': {
    label: 'Attic Conversion',
    icon: 'renovation',
    inputFields: [sqftInput('Attic Floor Area', 300, 150, 1200, 10)],
    divisions: [
      D('div1', '1', 'Permits & Structure', [
        L('1.1', 'Permits + Engineering',                 'flat', 1500, 2200, 3200),
        L('1.2', 'Joist Reinforcement',                   'sqft',   14,   18,   24),
        L('1.3', 'Subfloor',                              'sqft',    4,    5,    7),
      ]),
      D('div2', '2', 'Access & Egress', [
        L('2.1', 'Staircase to Code',                     'flat', 6500, 9500, 15000),
        L('2.2', 'Egress Window',                         'flat', 2200, 3000, 4500),
      ]),
      D('divE', 'E', 'Electrical', [
        L('E.1', 'Electrical (Circuits, Outlets, Lighting)', 'sqft', 9, 12, 16),
      ]),
      D('div3', '3', 'Insulation & HVAC', [
        L('3.1', 'Spray Foam at Roofline',                'sqft',    8,   10,   13),
        L('3.2', 'HVAC Mini-Split (Supply + Install)',    'flat', 4200, 5800, 8500),
      ]),
      D('div4', '4', 'Drywall', [
        L('4.1', 'Drywall (Walls + Sloped Ceiling)',      'sqft',   10,   13,   17),
      ]),
      D('div5', '5', 'Finishes', [
        L('5.1', 'Flooring',                              'sqft',    7,   10,   15),
        L('5.2', 'Paint & Trim',                          'sqft',    5,    7,   10),
        L('5.3', 'Lighting Fixtures',                     'flat',  800, 1500, 3000),
      ]),
      MARGINS,
    ],
  },

  'interior-painting': {
    label: 'Interior Painting',
    icon: 'renovation',
    inputFields: [sqftInput('Home / Area Size', 1500, 200, 8000, 50)],
    divisions: [
      D('div1', '1', 'Prep', [
        L('1.1', 'Protection, Patching & Caulk',          'sqft',  0.5,  0.7,  1),
      ]),
      D('div2', '2', 'Painting', [
        L('2.1', 'Walls (2 Coats)',                       'sqft',  1.8,  2.2,  3),
        L('2.2', 'Ceilings',                              'sqft',  0.6,  0.8,  1.1),
        L('2.3', 'Trim & Doors',                          'sqft',  0.6,  0.8,  1.2),
      ]),
      MARGINS,
    ],
  },

  'popcorn-removal': {
    label: 'Popcorn Ceiling Removal',
    icon: 'renovation',
    inputFields: [sqftInput('Ceiling Area', 1000, 100, 5000, 50)],
    divisions: [
      D('div1', '1', 'Testing & Prep', [
        L('1.1', 'Asbestos Test',                         'flat',  150,  250,  400),
        L('1.2', 'Protection & Masking',                  'sqft',  0.4,  0.5,  0.7),
      ]),
      D('div2', '2', 'Removal & Skim', [
        L('2.1', 'Scrape & Haul',                         'sqft',  1.5,  2,    2.6),
        L('2.2', 'Skim Coat & Sand',                      'sqft',  1.2,  1.6,  2.2),
      ]),
      D('div3', '3', 'Finish', [
        L('3.1', 'Prime & Paint',                         'sqft',  0.8,  1,    1.4),
      ]),
      MARGINS,
    ],
  },

  'trim-molding': {
    label: 'Trim & Molding Package',
    icon: 'renovation',
    inputFields: [lfInput('Room Perimeter (Total)', 200, 20, 1500)],
    divisions: [
      D('div1', '1', 'Prep', [
        L('1.1', 'Remove Old Trim',                       'linear_ft', 0.6, 0.8, 1.1),
      ]),
      D('div2', '2', 'Trim & Molding', [
        L('2.1', 'Baseboard',                             'linear_ft', 5, 7, 11),
        L('2.2', 'Crown Molding',                         'linear_ft', 8, 11, 18),
        L('2.3', 'Door & Window Casing',                  'flat',  900, 1300, 2200),
      ]),
      D('div3', '3', 'Accent Work', [
        L('3.1', 'Accent Wall / Wainscoting',             'flat',  900, 1400, 2600),
      ]),
      D('div4', '4', 'Finish', [
        L('4.1', 'Caulk, Fill & Paint',                   'linear_ft', 2, 2.5, 3.5),
      ]),
      MARGINS,
    ],
  },

  'laundry-mudroom': {
    label: 'Laundry Room / Mudroom',
    icon: 'renovation',
    inputFields: [sqftInput('Room Size', 60, 20, 300, 5)],
    divisions: [
      D('div1', '1', 'Demo', [
        L('1.1', 'Demo & Haul',                           'sqft',    8,   10,   14),
      ]),
      D('divS', 'S', 'Site Prep', [
        L('S.1', 'Dumpster (Roll-Off, Haul & Disposal)',  'flat',  425,  475,  550),
        L('S.2', 'Porta Potty (Rental + Weekly Service)', 'flat',  185,  210,  265),
        L('S.3', 'Site Protection & Dust Barriers',       'flat',  200,  275,  375),
      ]),
      D('div2', '2', 'Plumbing Rough-In', [
        L('2.1', 'Utility Sink & Washer Box',             'flat', 1000, 1500, 2400),
      ]),
      D('divE', 'E', 'Electrical Rough-In', [
        L('E.1', 'Dryer Circuit, Outlets & Lighting',     'flat',  600,  900, 1500),
      ]),
      D('div3', '3', 'Cabinets & Storage', [
        L('3.1', 'Cabinets',                              'flat', 1800, 3000, 5500),
        L('3.2', 'Countertop',                            'flat',  600,  900, 1800),
        L('3.3', 'Bench, Hooks & Cubbies',                'flat',  900, 1500, 3000),
        L('3.4', 'Utility Sink & Faucet',                 'flat',  400,  700, 1400),
      ]),
      D('div4', '4', 'Finishes', [
        L('4.1', 'Tile Floor (Mat + Labor)',              'sqft',   18,   26,   40),
        L('4.2', 'Paint & Trim',                          'sqft',    6,    8,   12),
      ]),
      MARGINS,
    ],
  },

  'closet-buildout': {
    label: 'Closet Build-Out',
    icon: 'renovation',
    inputFields: [sqftInput('Closet Size', 40, 10, 200, 5)],
    divisions: [
      D('div1', '1', 'Prep', [
        L('1.1', 'Remove Old Shelving',                   'flat',  150,  250,  400),
      ]),
      D('div2', '2', 'Closet System', [
        L('2.1', 'Custom Shelving & Rods',                'sqft',   45,   70,  130),
        L('2.2', 'Drawers & Accessories',                 'flat',  400,  700, 1500),
      ]),
      D('divE', 'E', 'Electrical', [
        L('E.1', 'Closet Lighting',                       'flat',  250,  400,  800),
      ]),
      D('div3', '3', 'Finish', [
        L('3.1', 'Paint',                                 'sqft',    6,    8,   12),
      ]),
      MARGINS,
    ],
  },

  'home-office-builtins': {
    label: 'Home Office / Built-Ins',
    icon: 'renovation',
    inputFields: [lfInput('Built-In Length', 10, 3, 40)],
    divisions: [
      D('div1', '1', 'Prep', [
        L('1.1', 'Prep & Protection',                     'flat',  200,  300,  450),
      ]),
      D('div2', '2', 'Built-Ins', [
        L('2.1', 'Desk, Cabinets & Shelving',             'linear_ft', 380, 580, 950),
        L('2.2', 'Desktop / Countertop',                  'flat',  500,  800, 1600),
      ]),
      D('divE', 'E', 'Electrical & Data', [
        L('E.1', 'Outlets & Data Lines',                  'flat',  500,  800, 1400),
        L('E.2', 'Lighting',                              'flat',  400,  700, 1400),
      ]),
      D('div3', '3', 'Finish', [
        L('3.1', 'Paint & Trim',                          'flat',  400,  600,  900),
      ]),
      MARGINS,
    ],
  },

  'staircase-remodel': {
    label: 'Staircase Remodel',
    icon: 'renovation',
    inputFields: [qtyInput('Number of Steps', 14, 3, 40)],
    divisions: [
      D('div1', '1', 'Demo', [
        L('1.1', 'Remove Old Treads / Carpet',            'flat',  400,  600,  900),
      ]),
      D('divS', 'S', 'Site Prep', [
        L('S.1', 'Dumpster (Roll-Off, Haul & Disposal)',  'flat',  350,  395,  450),
        L('S.2', 'Porta Potty (Rental + Weekly Service)', 'flat',  185,  210,  265),
        L('S.3', 'Site Protection & Dust Barriers',       'flat',  150,  200,  275),
      ]),
      D('div2', '2', 'Stairs & Railing', [
        L('2.1', 'Treads & Risers (per step)',            'qty',   220,  320,  520),
        L('2.2', 'Railing & Balusters',                   'flat', 2200, 3500, 6500),
        L('2.3', 'Newel Posts',                           'flat',  400,  700, 1400),
      ]),
      D('div3', '3', 'Finish', [
        L('3.1', 'Paint / Stain',                         'flat',  700,  900, 1400),
      ]),
      MARGINS,
    ],
  },

  // ── EXTERIOR & OUTDOOR ───────────────────────────────────────────────────
  'deck': {
    label: 'Deck (New or Rebuild)',
    icon: 'exterior',
    inputFields: [sqftInput('Deck Size', 300, 60, 1500, 10)],
    divisions: [
      D('div1', '1', 'Permits & Demo', [
        L('1.1', 'Permit & Layout',                       'flat',  400,  600,  900),
        L('1.2', 'Demo Old Deck (if any)',                'sqft',    3,    4,    5),
      ]),
      D('div2', '2', 'Structure', [
        L('2.1', 'Footings & Posts',                      'sqft',    6,    8,   11),
        L('2.2', 'Framing (Pressure-Treated)',            'sqft',   12,   15,   20),
      ]),
      D('div3', '3', 'Decking & Railing', [
        L('3.1', 'Decking (PT / Composite)',              'sqft',   10,   18,   30),
        L('3.2', 'Railing',                               'flat', 2000, 3200, 6000),
        L('3.3', 'Stairs',                                'flat',  900, 1400, 2400),
      ]),
      MARGINS,
    ],
  },

  'screened-porch': {
    label: 'Screened Porch Conversion',
    icon: 'exterior',
    inputFields: [sqftInput('Porch Size', 200, 60, 800, 10)],
    divisions: [
      D('div1', '1', 'Prep & Permit', [
        L('1.1', 'Prep & Permit',                         'flat',  400,  600,  900),
      ]),
      D('div2', '2', 'Screen System', [
        L('2.1', 'Screen Framing System',                 'sqft',   18,   26,   40),
        L('2.2', 'Screen Door',                           'flat',  400,  700, 1400),
      ]),
      D('divE', 'E', 'Electrical', [
        L('E.1', 'Ceiling Fan & Lighting',                'flat',  900, 1400, 2400),
      ]),
      D('div3', '3', 'Finishes', [
        L('3.1', 'Beadboard Ceiling',                     'sqft',    8,   11,   16),
        L('3.2', 'Flooring / Deck Coating',               'sqft',    6,   10,   18),
        L('3.3', 'Paint / Stain',                         'flat',  800, 1200, 1800),
      ]),
      MARGINS,
    ],
  },

  'window-replacement': {
    label: 'Window Replacement',
    icon: 'exterior',
    inputFields: [qtyInput('Number of Windows', 10, 1, 60)],
    divisions: [
      D('div1', '1', 'Removal', [
        L('1.1', 'Remove & Haul Old Windows',             'qty',    60,   80,  110),
      ]),
      D('div2', '2', 'Windows', [
        L('2.1', 'New Vinyl Window (per window)',         'qty',   450,  600, 1100),
        L('2.2', 'Install, Flash & Insulate',             'qty',   120,  160,  220),
      ]),
      D('div3', '3', 'Trim', [
        L('3.1', 'Interior Trim & Caulk',                 'qty',    60,   90,  150),
        L('3.2', 'Exterior Trim / Capping',               'qty',    50,   80,  130),
      ]),
      MARGINS,
    ],
  },

  'exterior-door': {
    label: 'Exterior / Patio Door',
    icon: 'exterior',
    inputFields: [],
    divisions: [
      D('div1', '1', 'Removal', [
        L('1.1', 'Remove Old Door & Haul',                'flat',  200,  300,  450),
      ]),
      D('div2', '2', 'Door', [
        L('2.1', 'Door Unit (Entry / Patio)',             'flat', 1400, 2200, 4500),
        L('2.2', 'Framing Adjustments',                   'flat',  300,  500,  900),
        L('2.3', 'Install, Flash & Sill Pan',             'flat',  400,  550,  800),
      ]),
      D('div3', '3', 'Finish', [
        L('3.1', 'Hardware & Lockset',                    'flat',  150,  300,  700),
        L('3.2', 'Interior / Exterior Trim & Paint',      'flat',  300,  450,  700),
      ]),
      MARGINS,
    ],
  },

  'siding': {
    label: 'Siding Repair / Replacement',
    icon: 'exterior',
    inputFields: [sqftInput('Wall Area', 1200, 100, 6000, 50)],
    divisions: [
      D('div1', '1', 'Removal & Repair', [
        L('1.1', 'Remove & Haul Old Siding',              'sqft',  1.2,  1.5,  2),
        L('1.2', 'Sheathing Repair Allowance',            'flat',  500,  800, 1500),
      ]),
      D('div2', '2', 'Weather Barrier', [
        L('2.1', 'Housewrap & Flashing',                  'sqft',  0.8,  1,    1.4),
      ]),
      D('div3', '3', 'Siding & Trim', [
        L('3.1', 'Siding (Vinyl / Fiber Cement)',         'sqft',    5,    8,   12),
        L('3.2', 'Trim, Corners & Soffit',                'flat', 1200, 1800, 3200),
        L('3.3', 'Caulk & Paint (Fiber Cement)',          'flat',    0,  600, 1500),
      ]),
      MARGINS,
    ],
  },

  // ── REPAIRS & BUILDING HEALTH ────────────────────────────────────────────
  'crawlspace-encapsulation': {
    label: 'Crawlspace Encapsulation',
    icon: 'renovation',
    inputFields: [sqftInput('Crawlspace Area', 1200, 200, 5000, 50)],
    divisions: [
      D('div1', '1', 'Prep', [
        L('1.1', 'Debris Removal & Prep',                 'sqft',  0.5,  0.7,  1),
      ]),
      D('div2', '2', 'Encapsulation', [
        L('2.1', 'Vapor Barrier (Walls + Floor)',         'sqft',    3,    4,  5.5),
        L('2.2', 'Seal Vents & Rim Joists',               'flat',  600,  900, 1400),
      ]),
      D('div3', '3', 'Moisture Control', [
        L('3.1', 'Dehumidifier (Installed)',              'flat', 1500, 2000, 2800),
        L('3.2', 'Rim / Wall Insulation',                 'sqft',  0.6,  0.9,  1.3),
      ]),
      D('div4', '4', 'Access', [
        L('4.1', 'Sealed Access Door',                    'flat',  200,  350,  600),
      ]),
      MARGINS,
    ],
  },

  'water-damage-repair': {
    label: 'Water Damage / Mold Repair',
    icon: 'renovation',
    inputFields: [sqftInput('Affected Area', 200, 20, 3000, 10)],
    divisions: [
      D('div1', '1', 'Mitigation', [
        L('1.1', 'Tear-Out & Haul',                       'sqft',    4,    5,  6.5),
        L('1.2', 'Drying & Dehumidification',             'flat',  800, 1200, 1800),
        L('1.3', 'Mold Treatment',                        'sqft',    3,    4,  5.5),
      ]),
      D('div2', '2', 'Structural Repair', [
        L('2.1', 'Framing / Subfloor Repair',             'flat',  800, 1200, 2000),
      ]),
      D('div3', '3', 'Rebuild', [
        L('3.1', 'Insulation & Drywall',                  'sqft',    6,    8,   11),
        L('3.2', 'Flooring',                              'sqft',    6,    9,   14),
      ]),
      D('div4', '4', 'Finish', [
        L('4.1', 'Paint & Trim',                          'sqft',    2,  2.5,  3.5),
      ]),
      MARGINS,
    ],
  },
};
