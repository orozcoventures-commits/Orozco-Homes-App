// ─────────────────────────────────────────────────────────────────────────────
// Remodel Budget Estimation Engine
// Regional basis: Virginia Beach / Hampton Roads, VA  |  Index year: 2026
// Covers: Bathrooms (S/M/L), Kitchens (S/M/L), Addition, Portico,
//         Garage Conversion, Full Renovation
// Overhead 18% + Net Profit 12% per CLAUDE.md remodel rule
// ─────────────────────────────────────────────────────────────────────────────

export const SPEC_LEVELS = ['standard', 'mid', 'custom'];
export const SPEC_LABELS = { standard: 'Standard', mid: 'Mid-Range', custom: 'Custom/Luxury' };

// ─────────────────────────────────────────────────────────────────────────────
// REMODEL_CONFIGS
// ─────────────────────────────────────────────────────────────────────────────

export const REMODEL_CONFIGS = {

  // ── BATHROOM SMALL (up to 50 sqft) ───────────────────────────────────────
  'bathroom-small': {
    label: 'Bathroom — Small (≤ 50 sqft)',
    icon: 'bath',
    inputFields: [
      { key: 'sqft', label: 'Bathroom Size', unit: 'sqft', default: 35, min: 15, max: 300, step: 5 },
    ],
    divisions: [
      {
        key: 'div1', num: '1', label: 'Demo & Prep',
        items: [
          { wbs: '1.1', label: 'Demo & Haul',                       unit: 'sqft',   rates: { standard: 12,    mid: 14,    custom: 17    } },
          { wbs: '1.2', label: 'Waterproofing Membrane',            unit: 'sqft',   rates: { standard:  5,    mid:  7,    custom:  9    } },
          { wbs: '1.3', label: 'Cement Board & Drywall Prep',       unit: 'sqft',   rates: { standard:  5.50, mid:  7,    custom:  9    } },
        ],
      },
      {
        key: 'div2', num: '2', label: 'Plumbing & Electrical Rough-In',
        items: [
          { wbs: '2.1', label: 'Plumbing Rough-In',                 unit: 'flat',   rates: { standard: 2500,  mid: 3400,  custom: 5000  } },
          { wbs: '2.2', label: 'Electrical (GFCI / Exhaust / Circuits)', unit: 'flat', rates: { standard: 1200, mid: 1700,  custom: 2600  } },
        ],
      },
      {
        key: 'div3', num: '3', label: 'Tile & Shower',
        items: [
          { wbs: '3.1', label: 'Floor Tile (Mat + Labor)',           unit: 'sqft',      rates: { standard: 18,    mid: 30,    custom: 50    } },
          { wbs: '3.2', label: 'Wall Tile (Mat + Labor)',            unit: 'wall_sqft', rates: { standard: 15,    mid: 24,    custom: 42    } },
          { wbs: '3.3', label: 'Shower Pan + Glass Enclosure',       unit: 'flat',      rates: { standard: 2400,  mid: 5000,  custom: 10000 } },
        ],
      },
      {
        key: 'div4', num: '4', label: 'Fixtures & Finishes',
        items: [
          { wbs: '4.1', label: 'Vanity + Sink',                     unit: 'flat', rates: { standard: 1900,  mid: 3800,  custom: 8500  } },
          { wbs: '4.2', label: 'Toilet',                            unit: 'flat', rates: { standard:  700,  mid: 1200,  custom: 2500  } },
          { wbs: '4.3', label: 'Plumbing Fixtures (Faucet/Valve/Trim)', unit: 'flat', rates: { standard: 950, mid: 2100, custom: 5500 } },
          { wbs: '4.4', label: 'Lighting',                          unit: 'flat', rates: { standard:  500,  mid: 1000,  custom: 2600  } },
          { wbs: '4.5', label: 'Mirror / Medicine Cabinet',         unit: 'flat', rates: { standard:  380,  mid:  820,  custom: 2200  } },
          { wbs: '4.6', label: 'Accessories Package',               unit: 'flat', rates: { standard:  300,  mid:  620,  custom: 1500  } },
        ],
      },
      {
        key: 'div5', num: '5', label: 'Finish Work',
        items: [
          { wbs: '5.1', label: 'Paint',                             unit: 'sqft', rates: { standard:  4,    mid:  5,    custom:  7    } },
          { wbs: '5.2', label: 'Trim & Baseboard',                  unit: 'flat', rates: { standard:  520,  mid:  780,  custom: 1400  } },
          { wbs: '5.3', label: 'Plumbing Final Set',                unit: 'flat', rates: { standard:  880,  mid: 1100,  custom: 1700  } },
        ],
      },
      {
        key: 'divM', num: 'M', label: 'Margins & Contingency',
        items: [
          { wbs: 'M.1', label: 'Overhead (18%)',      unit: 'pct', pctKey: 'overheadPct',     pctLabel: 'OH %'   },
          { wbs: 'M.2', label: 'Net Profit (12%)',    unit: 'pct', pctKey: 'profitPct',        pctLabel: 'Profit %' },
          { wbs: 'M.3', label: 'Contingency (10%)',   unit: 'pct', pctKey: 'contingencyPct',  pctLabel: 'Reserve %' },
        ],
      },
    ],
  },

  // ── BATHROOM MEDIUM (50–100 sqft) ────────────────────────────────────────
  'bathroom-medium': {
    label: 'Bathroom — Medium (50–100 sqft)',
    icon: 'bath',
    inputFields: [
      { key: 'sqft', label: 'Bathroom Size', unit: 'sqft', default: 75, min: 15, max: 300, step: 5 },
    ],
    divisions: [
      {
        key: 'div1', num: '1', label: 'Demo & Prep',
        items: [
          { wbs: '1.1', label: 'Demo & Haul',                       unit: 'sqft',   rates: { standard: 12,    mid: 14,    custom: 17    } },
          { wbs: '1.2', label: 'Waterproofing Membrane',            unit: 'sqft',   rates: { standard:  5,    mid:  7,    custom:  9    } },
          { wbs: '1.3', label: 'Cement Board & Drywall Prep',       unit: 'sqft',   rates: { standard:  5.50, mid:  7,    custom:  9    } },
        ],
      },
      {
        key: 'div2', num: '2', label: 'Plumbing & Electrical Rough-In',
        items: [
          { wbs: '2.1', label: 'Plumbing Rough-In',                 unit: 'flat', rates: { standard: 2500,  mid: 3400,  custom: 5000  } },
          { wbs: '2.2', label: 'Electrical (GFCI / Exhaust / Circuits)', unit: 'flat', rates: { standard: 1200, mid: 1700, custom: 2600 } },
        ],
      },
      {
        key: 'div3', num: '3', label: 'Tile & Shower',
        items: [
          { wbs: '3.1', label: 'Floor Tile (Mat + Labor)',           unit: 'sqft',      rates: { standard: 18,    mid: 30,    custom: 50    } },
          { wbs: '3.2', label: 'Wall Tile (Mat + Labor)',            unit: 'wall_sqft', rates: { standard: 15,    mid: 24,    custom: 42    } },
          { wbs: '3.3', label: 'Shower Pan + Glass Enclosure',       unit: 'flat',      rates: { standard: 2400,  mid: 5000,  custom: 10000 } },
        ],
      },
      {
        key: 'div4', num: '4', label: 'Fixtures & Finishes',
        items: [
          { wbs: '4.1', label: 'Vanity + Sink',                     unit: 'flat', rates: { standard: 1900,  mid: 3800,  custom: 8500  } },
          { wbs: '4.2', label: 'Toilet',                            unit: 'flat', rates: { standard:  700,  mid: 1200,  custom: 2500  } },
          { wbs: '4.3', label: 'Plumbing Fixtures (Faucet/Valve/Trim)', unit: 'flat', rates: { standard: 950, mid: 2100, custom: 5500 } },
          { wbs: '4.4', label: 'Lighting',                          unit: 'flat', rates: { standard:  500,  mid: 1000,  custom: 2600  } },
          { wbs: '4.5', label: 'Mirror / Medicine Cabinet',         unit: 'flat', rates: { standard:  380,  mid:  820,  custom: 2200  } },
          { wbs: '4.6', label: 'Accessories Package',               unit: 'flat', rates: { standard:  300,  mid:  620,  custom: 1500  } },
          { wbs: '4.7', label: 'Tub',                               unit: 'flat', rates: { standard: 1800,  mid: 3500,  custom: 8000  } },
        ],
      },
      {
        key: 'div5', num: '5', label: 'Finish Work',
        items: [
          { wbs: '5.1', label: 'Paint',                             unit: 'sqft', rates: { standard:  4,    mid:  5,    custom:  7    } },
          { wbs: '5.2', label: 'Trim & Baseboard',                  unit: 'flat', rates: { standard:  520,  mid:  780,  custom: 1400  } },
          { wbs: '5.3', label: 'Plumbing Final Set',                unit: 'flat', rates: { standard:  880,  mid: 1100,  custom: 1700  } },
        ],
      },
      {
        key: 'divM', num: 'M', label: 'Margins & Contingency',
        items: [
          { wbs: 'M.1', label: 'Overhead (18%)',      unit: 'pct', pctKey: 'overheadPct',    pctLabel: 'OH %'     },
          { wbs: 'M.2', label: 'Net Profit (12%)',    unit: 'pct', pctKey: 'profitPct',       pctLabel: 'Profit %' },
          { wbs: 'M.3', label: 'Contingency (10%)',   unit: 'pct', pctKey: 'contingencyPct', pctLabel: 'Reserve %'},
        ],
      },
    ],
  },

  // ── BATHROOM LARGE (100+ sqft) ────────────────────────────────────────────
  'bathroom-large': {
    label: 'Bathroom — Large (100+ sqft)',
    icon: 'bath',
    inputFields: [
      { key: 'sqft', label: 'Bathroom Size', unit: 'sqft', default: 150, min: 15, max: 300, step: 5 },
    ],
    divisions: [
      {
        key: 'div1', num: '1', label: 'Demo & Prep',
        items: [
          { wbs: '1.1', label: 'Demo & Haul',                       unit: 'sqft',   rates: { standard: 12,    mid: 14,    custom: 17    } },
          { wbs: '1.2', label: 'Waterproofing Membrane',            unit: 'sqft',   rates: { standard:  5,    mid:  7,    custom:  9    } },
          { wbs: '1.3', label: 'Cement Board & Drywall Prep',       unit: 'sqft',   rates: { standard:  5.50, mid:  7,    custom:  9    } },
        ],
      },
      {
        key: 'div2', num: '2', label: 'Plumbing & Electrical Rough-In',
        items: [
          { wbs: '2.1', label: 'Plumbing Rough-In',                 unit: 'flat', rates: { standard: 2500,  mid: 3400,  custom: 5000  } },
          { wbs: '2.2', label: 'Electrical (GFCI / Exhaust / Circuits)', unit: 'flat', rates: { standard: 1200, mid: 1700, custom: 2600 } },
        ],
      },
      {
        key: 'div3', num: '3', label: 'Tile & Shower',
        items: [
          { wbs: '3.1', label: 'Floor Tile (Mat + Labor)',           unit: 'sqft',      rates: { standard: 18,    mid: 30,    custom: 50    } },
          { wbs: '3.2', label: 'Wall Tile (Mat + Labor)',            unit: 'wall_sqft', rates: { standard: 15,    mid: 24,    custom: 42    } },
          { wbs: '3.3', label: 'Shower Pan + Glass Enclosure',       unit: 'flat',      rates: { standard: 2400,  mid: 5000,  custom: 10000 } },
        ],
      },
      {
        key: 'div4', num: '4', label: 'Fixtures & Finishes',
        items: [
          { wbs: '4.1', label: 'Vanity + Sink',                     unit: 'flat', rates: { standard: 1900,  mid: 3800,  custom: 8500  } },
          { wbs: '4.2', label: 'Toilet',                            unit: 'flat', rates: { standard:  700,  mid: 1200,  custom: 2500  } },
          { wbs: '4.3', label: 'Plumbing Fixtures (Faucet/Valve/Trim)', unit: 'flat', rates: { standard: 950, mid: 2100, custom: 5500 } },
          { wbs: '4.4', label: 'Lighting',                          unit: 'flat', rates: { standard:  500,  mid: 1000,  custom: 2600  } },
          { wbs: '4.5', label: 'Mirror / Medicine Cabinet',         unit: 'flat', rates: { standard:  380,  mid:  820,  custom: 2200  } },
          { wbs: '4.6', label: 'Accessories Package',               unit: 'flat', rates: { standard:  300,  mid:  620,  custom: 1500  } },
          { wbs: '4.7', label: 'Tub',                               unit: 'flat', rates: { standard: 2200,  mid: 5500,  custom: 14000 } },
          { wbs: '4.8', label: 'Custom Millwork',                   unit: 'flat', rates: { standard:    0,  mid:    0,  custom:  4500 } },
        ],
      },
      {
        key: 'div5', num: '5', label: 'Finish Work',
        items: [
          { wbs: '5.1', label: 'Paint',                             unit: 'sqft', rates: { standard:  4,    mid:  5,    custom:  7    } },
          { wbs: '5.2', label: 'Trim & Baseboard',                  unit: 'flat', rates: { standard:  520,  mid:  780,  custom: 1400  } },
          { wbs: '5.3', label: 'Plumbing Final Set',                unit: 'flat', rates: { standard:  880,  mid: 1100,  custom: 1700  } },
        ],
      },
      {
        key: 'divM', num: 'M', label: 'Margins & Contingency',
        items: [
          { wbs: 'M.1', label: 'Overhead (18%)',      unit: 'pct', pctKey: 'overheadPct',    pctLabel: 'OH %'     },
          { wbs: 'M.2', label: 'Net Profit (12%)',    unit: 'pct', pctKey: 'profitPct',       pctLabel: 'Profit %' },
          { wbs: 'M.3', label: 'Contingency (10%)',   unit: 'pct', pctKey: 'contingencyPct', pctLabel: 'Reserve %'},
        ],
      },
    ],
  },

  // ── KITCHEN SMALL (up to 100 sqft) ───────────────────────────────────────
  'kitchen-small': {
    label: 'Kitchen — Small (≤ 100 sqft)',
    icon: 'kitchen',
    inputFields: [
      { key: 'sqft',           label: 'Kitchen Floor Area',    unit: 'sqft', default: 80,  min: 40, max: 600, step: 10 },
      { key: 'cabinetLinearFt', label: 'Cabinet Linear Feet',  unit: 'lf',   default: 18,  min:  8, max:  80, step:  1 },
    ],
    divisions: [
      {
        key: 'div1', num: '1', label: 'Demo & Prep',
        items: [
          { wbs: '1.1', label: 'Demo & Haul',                       unit: 'sqft', rates: { standard:  9,    mid: 11,    custom: 14    } },
          { wbs: '1.2', label: 'Drywall Repair & Prep',             unit: 'sqft', rates: { standard:  5,    mid:  6.50, custom:  8    } },
        ],
      },
      {
        key: 'div2', num: '2', label: 'Rough-In Trades',
        items: [
          { wbs: '2.1', label: 'Plumbing Rough-In',                 unit: 'flat', rates: { standard: 1800,  mid: 2600,  custom: 3800  } },
          { wbs: '2.2', label: 'Electrical Circuits',               unit: 'flat', rates: { standard: 1400,  mid: 2000,  custom: 3200  } },
        ],
      },
      {
        key: 'div3', num: '3', label: 'Cabinets & Countertops',
        items: [
          { wbs: '3.1', label: 'Lower Cabinets',                    unit: 'linear_ft',      rates: { standard:  260,  mid:  420,  custom:  680  } },
          { wbs: '3.2', label: 'Upper Cabinets',                    unit: 'linear_ft',      rates: { standard:  200,  mid:  330,  custom:  540  } },
          { wbs: '3.3', label: 'Countertops (Quartz / Granite)',    unit: 'countertop_sqft', rates: { standard:   65,  mid:   95,  custom:  145  } },
          { wbs: '3.4', label: 'Backsplash Tile',                   unit: 'backsplash_sqft', rates: { standard:   20,  mid:   38,  custom:   65  } },
        ],
      },
      {
        key: 'div4', num: '4', label: 'Appliances & Fixtures',
        items: [
          { wbs: '4.1', label: 'Range / Cooktop + Hood',            unit: 'flat', rates: { standard: 2800,  mid: 5500,  custom: 12000 } },
          { wbs: '4.2', label: 'Refrigerator',                      unit: 'flat', rates: { standard: 1800,  mid: 3500,  custom:  8000 } },
          { wbs: '4.3', label: 'Dishwasher',                        unit: 'flat', rates: { standard:  850,  mid: 1400,  custom:  3000 } },
          { wbs: '4.4', label: 'Microwave / OTR',                   unit: 'flat', rates: { standard:  600,  mid: 1100,  custom:  2200 } },
          { wbs: '4.5', label: 'Sink + Faucet',                     unit: 'flat', rates: { standard:  750,  mid: 1500,  custom:  3500 } },
        ],
      },
      {
        key: 'div5', num: '5', label: 'Finishes',
        items: [
          { wbs: '5.1', label: 'Flooring (LVP / Hardwood)',         unit: 'sqft', rates: { standard:   8,   mid:  14,   custom:  24   } },
          { wbs: '5.2', label: 'Lighting',                          unit: 'flat', rates: { standard:  800,  mid: 1600,  custom:  3500 } },
          { wbs: '5.3', label: 'Paint',                             unit: 'sqft', rates: { standard:   4,   mid:   5,   custom:   7   } },
        ],
      },
      {
        key: 'divM', num: 'M', label: 'Margins & Contingency',
        items: [
          { wbs: 'M.1', label: 'Overhead (18%)',      unit: 'pct', pctKey: 'overheadPct',    pctLabel: 'OH %'     },
          { wbs: 'M.2', label: 'Net Profit (12%)',    unit: 'pct', pctKey: 'profitPct',       pctLabel: 'Profit %' },
          { wbs: 'M.3', label: 'Contingency (10%)',   unit: 'pct', pctKey: 'contingencyPct', pctLabel: 'Reserve %'},
        ],
      },
    ],
  },

  // ── KITCHEN MEDIUM (100–200 sqft) ────────────────────────────────────────
  'kitchen-medium': {
    label: 'Kitchen — Medium (100–200 sqft)',
    icon: 'kitchen',
    inputFields: [
      { key: 'sqft',           label: 'Kitchen Floor Area',    unit: 'sqft', default: 150, min: 40, max: 600, step: 10 },
      { key: 'cabinetLinearFt', label: 'Cabinet Linear Feet',  unit: 'lf',   default:  24, min:  8, max:  80, step:  1 },
    ],
    divisions: [
      {
        key: 'div1', num: '1', label: 'Demo & Prep',
        items: [
          { wbs: '1.1', label: 'Demo & Haul',                       unit: 'sqft', rates: { standard:  9,    mid: 11,    custom: 14    } },
          { wbs: '1.2', label: 'Drywall Repair & Prep',             unit: 'sqft', rates: { standard:  5,    mid:  6.50, custom:  8    } },
        ],
      },
      {
        key: 'div2', num: '2', label: 'Rough-In Trades',
        items: [
          { wbs: '2.1', label: 'Plumbing Rough-In',                 unit: 'flat', rates: { standard: 1800,  mid: 2600,  custom: 3800  } },
          { wbs: '2.2', label: 'Electrical Circuits',               unit: 'flat', rates: { standard: 1400,  mid: 2000,  custom: 3200  } },
        ],
      },
      {
        key: 'div3', num: '3', label: 'Cabinets & Countertops',
        items: [
          { wbs: '3.1', label: 'Lower Cabinets',                    unit: 'linear_ft',      rates: { standard:  260,  mid:  420,  custom:  680  } },
          { wbs: '3.2', label: 'Upper Cabinets',                    unit: 'linear_ft',      rates: { standard:  200,  mid:  330,  custom:  540  } },
          { wbs: '3.3', label: 'Countertops (Quartz / Granite)',    unit: 'countertop_sqft', rates: { standard:   65,  mid:   95,  custom:  145  } },
          { wbs: '3.4', label: 'Backsplash Tile',                   unit: 'backsplash_sqft', rates: { standard:   20,  mid:   38,  custom:   65  } },
          { wbs: '3.5', label: 'Island Cabinets + Top',             unit: 'flat',            rates: { standard: 3200,  mid: 6500,  custom: 14000 } },
        ],
      },
      {
        key: 'div4', num: '4', label: 'Appliances & Fixtures',
        items: [
          { wbs: '4.1', label: 'Range / Cooktop + Hood',            unit: 'flat', rates: { standard: 2800,  mid: 5500,  custom: 12000 } },
          { wbs: '4.2', label: 'Refrigerator',                      unit: 'flat', rates: { standard: 1800,  mid: 3500,  custom:  8000 } },
          { wbs: '4.3', label: 'Dishwasher',                        unit: 'flat', rates: { standard:  850,  mid: 1400,  custom:  3000 } },
          { wbs: '4.4', label: 'Microwave / OTR',                   unit: 'flat', rates: { standard:  600,  mid: 1100,  custom:  2200 } },
          { wbs: '4.5', label: 'Sink + Faucet',                     unit: 'flat', rates: { standard:  750,  mid: 1500,  custom:  3500 } },
        ],
      },
      {
        key: 'div5', num: '5', label: 'Finishes',
        items: [
          { wbs: '5.1', label: 'Flooring (LVP / Hardwood)',         unit: 'sqft', rates: { standard:   8,   mid:  14,   custom:  24   } },
          { wbs: '5.2', label: 'Lighting',                          unit: 'flat', rates: { standard:  800,  mid: 1600,  custom:  3500 } },
          { wbs: '5.3', label: 'Paint',                             unit: 'sqft', rates: { standard:   4,   mid:   5,   custom:   7   } },
        ],
      },
      {
        key: 'divM', num: 'M', label: 'Margins & Contingency',
        items: [
          { wbs: 'M.1', label: 'Overhead (18%)',      unit: 'pct', pctKey: 'overheadPct',    pctLabel: 'OH %'     },
          { wbs: 'M.2', label: 'Net Profit (12%)',    unit: 'pct', pctKey: 'profitPct',       pctLabel: 'Profit %' },
          { wbs: 'M.3', label: 'Contingency (10%)',   unit: 'pct', pctKey: 'contingencyPct', pctLabel: 'Reserve %'},
        ],
      },
    ],
  },

  // ── KITCHEN LARGE (200+ sqft) ─────────────────────────────────────────────
  'kitchen-large': {
    label: 'Kitchen — Large (200+ sqft)',
    icon: 'kitchen',
    inputFields: [
      { key: 'sqft',           label: 'Kitchen Floor Area',    unit: 'sqft', default: 250, min: 40, max: 600, step: 10 },
      { key: 'cabinetLinearFt', label: 'Cabinet Linear Feet',  unit: 'lf',   default:  32, min:  8, max:  80, step:  1 },
    ],
    divisions: [
      {
        key: 'div1', num: '1', label: 'Demo & Prep',
        items: [
          { wbs: '1.1', label: 'Demo & Haul',                       unit: 'sqft', rates: { standard:  9,    mid: 11,    custom: 14    } },
          { wbs: '1.2', label: 'Drywall Repair & Prep',             unit: 'sqft', rates: { standard:  5,    mid:  6.50, custom:  8    } },
        ],
      },
      {
        key: 'div2', num: '2', label: 'Rough-In Trades',
        items: [
          { wbs: '2.1', label: 'Plumbing Rough-In',                 unit: 'flat', rates: { standard: 1800,  mid: 2600,  custom: 3800  } },
          { wbs: '2.2', label: 'Electrical Circuits',               unit: 'flat', rates: { standard: 1400,  mid: 2000,  custom: 3200  } },
        ],
      },
      {
        key: 'div3', num: '3', label: 'Cabinets & Countertops',
        items: [
          { wbs: '3.1', label: 'Lower Cabinets',                    unit: 'linear_ft',       rates: { standard:  260,  mid:  420,  custom:  680  } },
          { wbs: '3.2', label: 'Upper Cabinets',                    unit: 'linear_ft',       rates: { standard:  200,  mid:  330,  custom:  540  } },
          { wbs: '3.3', label: 'Countertops (Quartz / Granite)',    unit: 'countertop_sqft', rates: { standard:   65,  mid:   95,  custom:  145  } },
          { wbs: '3.4', label: 'Backsplash Tile',                   unit: 'backsplash_sqft', rates: { standard:   20,  mid:   38,  custom:   65  } },
          { wbs: '3.5', label: 'Island Cabinets + Top',             unit: 'flat',            rates: { standard: 3200,  mid: 6500,  custom: 14000 } },
          { wbs: '3.6', label: 'Custom Millwork',                   unit: 'flat',            rates: { standard:    0,  mid:    0,  custom:  6500 } },
        ],
      },
      {
        key: 'div4', num: '4', label: 'Appliances & Fixtures',
        items: [
          { wbs: '4.1', label: 'Range / Cooktop + Hood',            unit: 'flat', rates: { standard: 2800,  mid: 5500,  custom: 12000 } },
          { wbs: '4.2', label: 'Refrigerator',                      unit: 'flat', rates: { standard: 1800,  mid: 3500,  custom:  8000 } },
          { wbs: '4.3', label: 'Dishwasher',                        unit: 'flat', rates: { standard:  850,  mid: 1400,  custom:  3000 } },
          { wbs: '4.4', label: 'Microwave / OTR',                   unit: 'flat', rates: { standard:  600,  mid: 1100,  custom:  2200 } },
          { wbs: '4.5', label: 'Sink + Faucet',                     unit: 'flat', rates: { standard:  750,  mid: 1500,  custom:  3500 } },
        ],
      },
      {
        key: 'div5', num: '5', label: 'Finishes',
        items: [
          { wbs: '5.1', label: 'Flooring (LVP / Hardwood)',         unit: 'sqft', rates: { standard:   8,   mid:  14,   custom:  24   } },
          { wbs: '5.2', label: 'Lighting',                          unit: 'flat', rates: { standard:  800,  mid: 1600,  custom:  3500 } },
          { wbs: '5.3', label: 'Paint',                             unit: 'sqft', rates: { standard:   4,   mid:   5,   custom:   7   } },
        ],
      },
      {
        key: 'divM', num: 'M', label: 'Margins & Contingency',
        items: [
          { wbs: 'M.1', label: 'Overhead (18%)',      unit: 'pct', pctKey: 'overheadPct',    pctLabel: 'OH %'     },
          { wbs: 'M.2', label: 'Net Profit (12%)',    unit: 'pct', pctKey: 'profitPct',       pctLabel: 'Profit %' },
          { wbs: 'M.3', label: 'Contingency (10%)',   unit: 'pct', pctKey: 'contingencyPct', pctLabel: 'Reserve %'},
        ],
      },
    ],
  },

  // ── ADDITION ──────────────────────────────────────────────────────────────
  'addition': {
    label: 'Home Addition',
    icon: 'addition',
    inputFields: [
      { key: 'sqft', label: 'Addition Size', unit: 'sqft', default: 400, min: 100, max: 3000, step: 50 },
    ],
    divisions: [
      {
        key: 'div1', num: '1', label: 'Permits & Engineering',
        items: [
          { wbs: '1.1', label: 'Building Permit',                    unit: 'flat', rates: { standard: 1800,  mid: 2200,  custom:  2800 } },
          { wbs: '1.2', label: 'Structural / Civil Engineering',     unit: 'flat', rates: { standard: 3500,  mid: 5000,  custom:  7500 } },
        ],
      },
      {
        key: 'div2', num: '2', label: 'Foundation & Framing',
        items: [
          { wbs: '2.1', label: 'Footings + Slab',                    unit: 'sqft', rates: { standard: 18,    mid: 22,    custom:  28   } },
          { wbs: '2.2', label: 'Framing + Sheathing + Housewrap',    unit: 'sqft', rates: { standard: 24,    mid: 29,    custom:  37   } },
        ],
      },
      {
        key: 'div3', num: '3', label: 'Exterior Envelope',
        items: [
          { wbs: '3.1', label: 'Roofing (Materials + Labor)',        unit: 'sqft', rates: { standard: 10,    mid: 14,    custom:  20   } },
          { wbs: '3.2', label: 'Siding / Exterior Finish',           unit: 'sqft', rates: { standard: 14,    mid: 20,    custom:  32   } },
          { wbs: '3.3', label: 'Windows + Exterior Door',            unit: 'flat', rates: { standard: 3500,  mid: 6000,  custom: 11000 } },
        ],
      },
      {
        key: 'div4', num: '4', label: 'MEP Systems',
        items: [
          { wbs: '4.1', label: 'Electrical Rough-In',                unit: 'sqft', rates: { standard: 12,    mid: 15,    custom:  20   } },
          { wbs: '4.2', label: 'Plumbing Rough-In',                  unit: 'sqft', rates: { standard:  8,    mid: 12,    custom:  18   } },
          { wbs: '4.3', label: 'HVAC Extension / Mini-Split',        unit: 'flat', rates: { standard: 4500,  mid: 6500,  custom:  9500 } },
        ],
      },
      {
        key: 'div5', num: '5', label: 'Interior Finishes',
        items: [
          { wbs: '5.1', label: 'Insulation + Drywall',               unit: 'sqft', rates: { standard: 10,    mid: 13,    custom:  17   } },
          { wbs: '5.2', label: 'Flooring',                           unit: 'sqft', rates: { standard:  8,    mid: 14,    custom:  24   } },
          { wbs: '5.3', label: 'Trim + Paint',                       unit: 'sqft', rates: { standard:  7,    mid:  9,    custom:  13   } },
        ],
      },
      {
        key: 'divM', num: 'M', label: 'Margins & Contingency',
        items: [
          { wbs: 'M.1', label: 'Overhead (18%)',      unit: 'pct', pctKey: 'overheadPct',    pctLabel: 'OH %'     },
          { wbs: 'M.2', label: 'Net Profit (12%)',    unit: 'pct', pctKey: 'profitPct',       pctLabel: 'Profit %' },
          { wbs: 'M.3', label: 'Contingency (10%)',   unit: 'pct', pctKey: 'contingencyPct', pctLabel: 'Reserve %'},
        ],
      },
    ],
  },

  // ── PORTICO ───────────────────────────────────────────────────────────────
  'portico': {
    label: 'Portico (Covered Entry)',
    icon: 'portico',
    inputFields: [
      { key: 'sqft', label: 'Portico Size', unit: 'sqft', default: 150, min: 40, max: 800, step: 10 },
    ],
    divisions: [
      {
        key: 'div1', num: '1', label: 'Foundation & Structure',
        items: [
          { wbs: '1.1', label: 'Footings + Concrete',                unit: 'sqft', rates: { standard: 22,    mid: 28,    custom:  36   } },
          { wbs: '1.2', label: 'Structural Columns (Supply + Install)', unit: 'flat', rates: { standard: 3200, mid: 5500, custom:  9500 } },
          { wbs: '1.3', label: 'Beam + Header Work',                 unit: 'flat', rates: { standard: 2200,  mid: 3500,  custom:  5500 } },
        ],
      },
      {
        key: 'div2', num: '2', label: 'Roof System',
        items: [
          { wbs: '2.1', label: 'Roof Framing',                       unit: 'sqft', rates: { standard: 14,    mid: 18,    custom:  24   } },
          { wbs: '2.2', label: 'Roofing Material',                   unit: 'sqft', rates: { standard:  9,    mid: 13,    custom:  20   } },
          { wbs: '2.3', label: 'Soffit + Fascia',                    unit: 'sqft', rates: { standard:  6,    mid:  8,    custom:  12   } },
        ],
      },
      {
        key: 'div3', num: '3', label: 'Exterior Finishes',
        items: [
          { wbs: '3.1', label: 'Entry Floor (Pavers / Slate / Brick)', unit: 'sqft', rates: { standard: 18,  mid: 32,    custom:  55   } },
          { wbs: '3.2', label: 'Exterior Paint + Sealer',             unit: 'sqft', rates: { standard:  5,   mid:  7,    custom:  10   } },
        ],
      },
      {
        key: 'div4', num: '4', label: 'Electrical',
        items: [
          { wbs: '4.1', label: 'Exterior Lighting',                  unit: 'flat', rates: { standard:  900,  mid: 1800,  custom:  3500 } },
          { wbs: '4.2', label: 'Rough-In + Outlets',                 unit: 'flat', rates: { standard:  700,  mid: 1000,  custom:  1600 } },
        ],
      },
      {
        key: 'divM', num: 'M', label: 'Margins & Contingency',
        items: [
          { wbs: 'M.1', label: 'Overhead (18%)',      unit: 'pct', pctKey: 'overheadPct',    pctLabel: 'OH %'     },
          { wbs: 'M.2', label: 'Net Profit (12%)',    unit: 'pct', pctKey: 'profitPct',       pctLabel: 'Profit %' },
          { wbs: 'M.3', label: 'Contingency (10%)',   unit: 'pct', pctKey: 'contingencyPct', pctLabel: 'Reserve %'},
        ],
      },
    ],
  },

  // ── GARAGE CONVERSION ─────────────────────────────────────────────────────
  'garage-conversion': {
    label: 'Garage Conversion',
    icon: 'garage',
    inputFields: [
      { key: 'sqft', label: 'Garage Size', unit: 'sqft', default: 440, min: 100, max: 2000, step: 20 },
    ],
    divisions: [
      {
        key: 'div1', num: '1', label: 'Structural Prep',
        items: [
          { wbs: '1.1', label: 'Slab Repair + Leveling',             unit: 'sqft', rates: { standard:  8,    mid: 11,    custom:  15   } },
          { wbs: '1.2', label: 'Garage Door Infill (Frame + Ins + Drywall)', unit: 'sqft', rates: { standard: 14, mid: 18, custom: 24 } },
          { wbs: '1.3', label: 'Window + Door Addition',             unit: 'flat', rates: { standard: 2800,  mid: 4500,  custom:  7500 } },
        ],
      },
      {
        key: 'div2', num: '2', label: 'MEP Systems',
        items: [
          { wbs: '2.1', label: 'Electrical Upgrade (Panel + Circuits)', unit: 'flat', rates: { standard: 3500, mid: 5000, custom: 7500 } },
          { wbs: '2.2', label: 'Plumbing Rough-In (if Bath Added)',   unit: 'flat', rates: { standard: 2200,  mid: 3200,  custom:  4800 } },
          { wbs: '2.3', label: 'HVAC Mini-Split (Supply + Install)',  unit: 'flat', rates: { standard: 4200,  mid: 5800,  custom:  8500 } },
        ],
      },
      {
        key: 'div3', num: '3', label: 'Insulation & Drywall',
        items: [
          { wbs: '3.1', label: 'Spray Foam / Batt Insulation',       unit: 'sqft', rates: { standard:  5,    mid:  7,    custom:  10   } },
          { wbs: '3.2', label: 'Drywall + Tape + Mud',               unit: 'sqft', rates: { standard:  5.50, mid:  7,    custom:   9   } },
          { wbs: '3.3', label: 'Ceiling Work',                       unit: 'sqft', rates: { standard:  4,    mid:  5.50, custom:   8   } },
        ],
      },
      {
        key: 'div4', num: '4', label: 'Finishes',
        items: [
          { wbs: '4.1', label: 'Flooring',                           unit: 'sqft', rates: { standard:  8,    mid: 14,    custom:  24   } },
          { wbs: '4.2', label: 'Trim + Paint',                       unit: 'sqft', rates: { standard:  6,    mid:  8,    custom:  12   } },
          { wbs: '4.3', label: 'Lighting Fixtures',                  unit: 'flat', rates: { standard:  800,  mid: 1500,  custom:  3000 } },
        ],
      },
      {
        key: 'divM', num: 'M', label: 'Margins & Contingency',
        items: [
          { wbs: 'M.1', label: 'Overhead (18%)',      unit: 'pct', pctKey: 'overheadPct',    pctLabel: 'OH %'     },
          { wbs: 'M.2', label: 'Net Profit (12%)',    unit: 'pct', pctKey: 'profitPct',       pctLabel: 'Profit %' },
          { wbs: 'M.3', label: 'Contingency (10%)',   unit: 'pct', pctKey: 'contingencyPct', pctLabel: 'Reserve %'},
        ],
      },
    ],
  },

  // ── FULL RENOVATION ───────────────────────────────────────────────────────
  'full-renovation': {
    label: 'Full House Renovation',
    icon: 'renovation',
    inputFields: [
      { key: 'sqft', label: 'Home Size', unit: 'sqft', default: 1800, min: 500, max: 8000, step: 100 },
    ],
    divisions: [
      {
        key: 'div1', num: '1', label: 'Demo & Structural',
        items: [
          { wbs: '1.1', label: 'Full Demo + Haul',                   unit: 'sqft', rates: { standard:  8,    mid: 10,    custom:  13   } },
          { wbs: '1.2', label: 'Structural Repairs / LB Work',       unit: 'sqft', rates: { standard:  6,    mid:  9,    custom:  14   } },
          { wbs: '1.3', label: 'Permits + Engineering',              unit: 'flat', rates: { standard: 2500,  mid: 3500,  custom:  5000 } },
        ],
      },
      {
        key: 'div2', num: '2', label: 'MEP Systems',
        items: [
          { wbs: '2.1', label: 'Plumbing Replacement',               unit: 'sqft', rates: { standard: 18,    mid: 24,    custom:  32   } },
          { wbs: '2.2', label: 'Electrical Panel + Wiring',          unit: 'sqft', rates: { standard: 16,    mid: 22,    custom:  30   } },
          { wbs: '2.3', label: 'HVAC System Replacement',            unit: 'sqft', rates: { standard: 14,    mid: 18,    custom:  24   } },
        ],
      },
      {
        key: 'div3', num: '3', label: 'Building Envelope',
        items: [
          { wbs: '3.1', label: 'Roof Replacement',                   unit: 'sqft', rates: { standard:  8,    mid: 11,    custom:  16   } },
          { wbs: '3.2', label: 'Windows + Exterior Doors',           unit: 'sqft', rates: { standard: 12,    mid: 18,    custom:  28   } },
          { wbs: '3.3', label: 'Siding / Exterior',                  unit: 'sqft', rates: { standard: 10,    mid: 15,    custom:  24   } },
        ],
      },
      {
        key: 'div4', num: '4', label: 'Interior Build-Out',
        items: [
          { wbs: '4.1', label: 'Insulation + Drywall',               unit: 'sqft', rates: { standard:  9,    mid: 12,    custom:  16   } },
          { wbs: '4.2', label: 'Kitchen Package (Cabs+Counters+Appliances)', unit: 'sqft', rates: { standard: 18, mid: 32, custom: 55 } },
          { wbs: '4.3', label: 'Bathrooms Package (All Baths)',      unit: 'sqft', rates: { standard: 22,    mid: 38,    custom:  65   } },
          { wbs: '4.4', label: 'Flooring Throughout',                unit: 'sqft', rates: { standard:  8,    mid: 14,    custom:  24   } },
          { wbs: '4.5', label: 'Trim + Doors + Paint',               unit: 'sqft', rates: { standard:  8,    mid: 11,    custom:  16   } },
        ],
      },
      {
        key: 'divM', num: 'M', label: 'Margins & Contingency',
        items: [
          { wbs: 'M.1', label: 'Overhead (18%)',      unit: 'pct', pctKey: 'overheadPct',    pctLabel: 'OH %'     },
          { wbs: 'M.2', label: 'Net Profit (12%)',    unit: 'pct', pctKey: 'profitPct',       pctLabel: 'Profit %' },
          { wbs: 'M.3', label: 'Contingency (10%)',   unit: 'pct', pctKey: 'contingencyPct', pctLabel: 'Reserve %'},
        ],
      },
    ],
  },

};

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the full config object for a given project type ID.
 * @param {string} projectTypeId
 */
export function getProjectConfig(projectTypeId) {
  return REMODEL_CONFIGS[projectTypeId] ?? null;
}

/**
 * Computes base dollar amounts for every non-pct line item.
 * Pct lines (unit === 'pct') are skipped — the page handles them from baseSum.
 *
 * @param {string} projectTypeId
 * @param {object} inputs   — { sqft, cabinetLinearFt, ... }
 * @param {string} specLevel — 'standard' | 'mid' | 'custom'
 * @returns {{ [wbs: string]: number }}
 */
export function computeBaseLineValues(projectTypeId, inputs, specLevel) {
  const config = REMODEL_CONFIGS[projectTypeId];
  if (!config) return {};

  const spec   = SPEC_LEVELS.includes(specLevel) ? specLevel : 'mid';
  const sqft   = Number(inputs.sqft) || 0;
  const cabLf  = Number(inputs.cabinetLinearFt) || 0;
  const result = {};

  for (const div of config.divisions) {
    for (const item of div.items) {
      if (item.unit === 'pct') {
        // Page computes these; return 0 placeholder
        result[item.wbs] = 0;
        continue;
      }

      const rate = item.rates[spec] ?? 0;

      switch (item.unit) {
        case 'sqft':
          result[item.wbs] = rate * sqft;
          break;
        case 'wall_sqft':
          result[item.wbs] = rate * (sqft * 2.5);
          break;
        case 'linear_ft':
          result[item.wbs] = rate * cabLf;
          break;
        case 'countertop_sqft':
          result[item.wbs] = rate * (cabLf * 2.1);
          break;
        case 'backsplash_sqft':
          result[item.wbs] = rate * (cabLf * 1.5);
          break;
        case 'flat':
          result[item.wbs] = rate;
          break;
        default:
          result[item.wbs] = 0;
      }
    }
  }

  return result;
}
