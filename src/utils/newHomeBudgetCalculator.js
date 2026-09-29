// ─────────────────────────────────────────────────────────────────────────────
// New Single-Family Home — Job Cost Estimation Engine
// Regional basis: Virginia Beach / Hampton Roads, VA  |  Index year: 2026
// WBS cost centers follow industry-standard 7-division structure
// ─────────────────────────────────────────────────────────────────────────────

// ── Spec levels ───────────────────────────────────────────────────────────────
export const SPEC_LEVELS = ['standard', 'mid', 'custom'];

// ── WBS Division 1 — Land Acquisition & Carrying Costs ───────────────────────
const LAND = {
  feasibility_surveys:        4_500,   // soil boring + topo survey + feasibility
  recording_transfer_pct:     0.0025,  // of lot price (VA recording + transfer taxes)
  land_closing_flat:            750,   // attorney, deed prep, title at land close
  loan_origination_pct:         0.01,  // of construction loan amount
  loan_interest_rate:           0.085, // annual rate, construction carry period (2026)
  loan_carry_months:            12,
  loan_ltv:                     0.80,  // lender funds 80% of total project cost
};

// ── WBS Division 2 — Soft Costs (Pre-Development & Professional Fees) ─────────
const SOFT = {
  arch_engineering_per_sqft: { standard: 8.00,  mid: 11.50, custom: 16.50 },
  site_engineering_flat:         6_000,  // civil, grading plan, stormwater mgmt
  // City of VB 2026 municipal fees
  vb_permit_per_sqft:             0.12,  // building permit fee
  vb_plan_review_flat:          2_000,
  vb_water_tap_flat:           10_500,  // HRSD water connection tap fee
  vb_sewer_tap_flat:            9_500,  // HRSD sewer lateral tap fee
  // Insurance
  builders_risk_pct:            0.012,  // of vertical hard costs
  gl_insurance_flat:            4_200,  // annual CGL policy
  survey_update_flat:           1_200,  // as-built / foundation survey update
};

// ── WBS Division 3 — Site Work & Utilities (Hard Costs — Site Prep) ───────────
const SITE = {
  clearing_per_acre:           5_500,  // clearing, grubbing, tree removal
  excavation_per_sqft:          7.50,  // mass grading, structural fill, compaction
  utilities_flat:             14_000,  // water service line, sewer lateral, elec conduit
  driveway_apron_flat:         4_000,  // concrete apron
  erosion_control_flat:          500,  // silt fencing, inlet protection
};

// ── WBS Division 4 — Hard Costs (Vertical Structure) — $/livable sqft ─────────
// All rates are 2026 trade/wholesale, Hampton Roads supply chain indexed
const VERTICAL = {
  foundation:         { standard: 11.50, mid: 13.50, custom: 16.50 },
  framing:            { standard: 21.00, mid: 25.00, custom: 31.00 },
  exterior_envelope:  { standard: 28.00, mid: 35.00, custom: 47.00 },
  systems_roughin:    { standard: 24.00, mid: 31.00, custom: 39.00 },
  insulation_drywall: { standard:  9.50, mid: 11.50, custom: 14.50 },
  interior_finishes:  { standard: 41.00, mid: 63.00, custom: 94.00 },
};

// ── WBS Division 5 — Contractor Margins & Overhead ───────────────────────────
const MARGINS = {
  gc_overhead_pct:    0.06,   // 6% of direct project costs
  builder_profit_pct: 0.13,   // 13% of (direct costs + overhead)
  contingency_pct:    0.075,  // 7.5% of direct costs — custom change order reserve
};

// ── WBS Division 6 — Marketing & Sales ───────────────────────────────────────
const SALES = {
  listing_commission_pct:  0.0275,  // listing broker
  buyer_agent_pct:         0.0275,  // co-op/buyer's agent
  staging_marketing_flat:  6_500,   // staging, photography, video, digital
};

// ── WBS Division 7 — Finished Closing Costs (Disposition) ────────────────────
const CLOSING = {
  title_insurance_pct:       0.005,   // owner's policy + lender's policy
  attorney_settlement_flat:  2_000,
  seller_concessions_pct:    0.00,    // default 0 — adjustable per deal
  va_grantor_tax_pct:        0.001,   // VA grantor's tax $1/$1000 of sale price
  va_state_transfer_pct:     0.0025,  // VA state transfer tax
  prorated_tax_months:       6,
  vb_real_estate_tax_rate:   0.0099,  // City of VB 2026 rate: $0.99 per $100 assessed
  hoa_transfer_flat:         0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Section calculators
// ─────────────────────────────────────────────────────────────────────────────

function calcLand(lotPrice, constructionLoanAmount, overrides = {}) {
  const r = { ...LAND, ...overrides };
  const feasibility       = r.feasibility_surveys;
  const recordingTransfer = lotPrice * r.recording_transfer_pct;
  const landClosing       = r.land_closing_flat;
  const loanOrigination   = constructionLoanAmount * r.loan_origination_pct;
  const interestCarry     = constructionLoanAmount * r.loan_interest_rate * (r.loan_carry_months / 12);

  return {
    lotPurchasePrice:   lotPrice,
    feasibilityStudies: feasibility,
    recordingTransfer,
    landClosing,
    loanOrigination,
    interestCarry,
    total: lotPrice + feasibility + recordingTransfer + landClosing + loanOrigination + interestCarry,
  };
}

function calcSoftCosts(homeSqft, verticalHardCosts, spec, overrides = {}) {
  const r = { ...SOFT, ...overrides };
  const archEngineering  = homeSqft * r.arch_engineering_per_sqft[spec];
  const siteEngineering  = r.site_engineering_flat;
  const permit           = homeSqft * r.vb_permit_per_sqft;
  const planReview       = r.vb_plan_review_flat;
  const waterTap         = r.vb_water_tap_flat;
  const sewerTap         = r.vb_sewer_tap_flat;
  const buildersRisk     = verticalHardCosts * r.builders_risk_pct;
  const glInsurance      = r.gl_insurance_flat;
  const surveyUpdate     = r.survey_update_flat;

  return {
    archEngineering,
    siteEngineering,
    municipalPermits: permit + planReview,
    tapFees:          waterTap + sewerTap,
    buildersRisk,
    glInsurance,
    surveyUpdate,
    total: archEngineering + siteEngineering + permit + planReview +
           waterTap + sewerTap + buildersRisk + glInsurance + surveyUpdate,
  };
}

function calcSiteWork(lotAcres, homeSqft, overrides = {}) {
  const r = { ...SITE, ...overrides };
  const clearing       = lotAcres * r.clearing_per_acre;
  const excavation     = homeSqft * r.excavation_per_sqft;
  const utilities      = r.utilities_flat;
  const driveway       = r.driveway_apron_flat;
  const erosionControl = r.erosion_control_flat;

  return {
    clearingGrubbing: clearing,
    excavationGrading: excavation,
    utilityConnections: utilities,
    drivewayApron:    driveway,
    erosionControl,
    total: clearing + excavation + utilities + driveway + erosionControl,
  };
}

function calcVertical(homeSqft, spec, overrides = {}) {
  const v = { ...VERTICAL };
  const rate = (key) => (overrides[key] ?? v[key][spec]);

  const foundation        = homeSqft * rate('foundation');
  const framing           = homeSqft * rate('framing');
  const exteriorEnvelope  = homeSqft * rate('exterior_envelope');
  const systemsRoughin    = homeSqft * rate('systems_roughin');
  const insulationDrywall = homeSqft * rate('insulation_drywall');
  const interiorFinishes  = homeSqft * rate('interior_finishes');

  return {
    foundation,
    framing,
    exteriorEnvelope,
    systemsRoughin,
    insulationDrywall,
    interiorFinishes,
    total: foundation + framing + exteriorEnvelope + systemsRoughin +
           insulationDrywall + interiorFinishes,
  };
}

function calcMargins(directCosts, overrides = {}) {
  const r = { ...MARGINS, ...overrides };
  const gcOverhead    = directCosts * r.gc_overhead_pct;
  const builderProfit = (directCosts + gcOverhead) * r.builder_profit_pct;
  const contingency   = directCosts * r.contingency_pct;

  return {
    gcOverhead,
    builderProfit,
    contingency,
    total: gcOverhead + builderProfit + contingency,
    gcOverheadPct:    r.gc_overhead_pct,
    builderProfitPct: r.builder_profit_pct,
    contingencyPct:   r.contingency_pct,
  };
}

function calcSalesCosts(salePrice, overrides = {}) {
  const r = { ...SALES, ...overrides };
  const listingComm  = salePrice * r.listing_commission_pct;
  const buyerAgent   = salePrice * r.buyer_agent_pct;
  const stagingMktg  = r.staging_marketing_flat;

  return {
    listingCommission:    listingComm,
    buyerAgentCommission: buyerAgent,
    stagingMarketing:     stagingMktg,
    total: listingComm + buyerAgent + stagingMktg,
  };
}

function calcClosingCosts(salePrice, targetSalePrice, overrides = {}) {
  const r    = { ...CLOSING, ...overrides };
  const title          = salePrice * r.title_insurance_pct;
  const attorney       = r.attorney_settlement_flat;
  const concessions    = salePrice * r.seller_concessions_pct;
  const grantorTax     = salePrice * r.va_grantor_tax_pct;
  const transferTax    = salePrice * r.va_state_transfer_pct;
  const proratedTaxes  = (targetSalePrice * r.vb_real_estate_tax_rate) * (r.prorated_tax_months / 12);
  const hoaTransfer    = r.hoa_transfer_flat;

  return {
    titleInsurance:   title,
    attorneyFees:     attorney,
    sellerConcessions: concessions,
    grantorTax,
    stateTaxes:       transferTax,
    proratedTaxes,
    hoaTransfer,
    total: title + attorney + concessions + grantorTax + transferTax + proratedTaxes + hoaTransfer,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object} inputs
 * @param {number}  inputs.lotPrice          - Raw lot purchase price
 * @param {number}  inputs.homeSqft          - Livable square footage of home
 * @param {number}  inputs.targetSalePrice   - Projected sale / list price
 * @param {number}  [inputs.lotAcres=0.25]   - Lot size in acres (for site clearing)
 * @param {number}  [inputs.stories=1]       - Number of stories
 * @param {string}  [inputs.specLevel='mid'] - 'standard' | 'mid' | 'custom'
 * @param {object}  [inputs.overrides={}]    - Override any rate constant by key
 * @returns {object} Full WBS cost breakdown + summary aggregates
 */
export function calculateNewHomeBudget({
  lotPrice       = 0,
  homeSqft       = 2_000,
  targetSalePrice = 0,
  lotAcres       = 0.25,
  stories        = 1,
  specLevel      = 'mid',
  overrides      = {},
}) {
  const spec = SPEC_LEVELS.includes(specLevel) ? specLevel : 'mid';

  // Pass 1: vertical hard costs needed by soft costs (builder's risk basis)
  const vertical = calcVertical(homeSqft, spec, overrides.vertical);
  const site     = calcSiteWork(lotAcres, homeSqft / stories, overrides.site);
  const soft     = calcSoftCosts(homeSqft, vertical.total, spec, overrides.soft);

  // Direct project costs before margins
  const directCosts = vertical.total + site.total + soft.total;

  // Margins applied to direct costs
  const margins = calcMargins(directCosts, overrides.margins);
  const totalConstructionCost = directCosts + margins.total;

  // Construction loan basis (land + construction)
  const constructionLoanAmount = (lotPrice + totalConstructionCost) * LAND.loan_ltv;
  const land = calcLand(lotPrice, constructionLoanAmount, overrides.land);

  // Total project capital required
  const totalProjectCost = land.total + totalConstructionCost;

  // Sales & disposition
  const salesCosts   = calcSalesCosts(targetSalePrice, overrides.sales);
  const closingCosts = calcClosingCosts(targetSalePrice, targetSalePrice, overrides.closing);

  // Returns
  const netGrossRevenue = targetSalePrice - salesCosts.total - closingCosts.total;
  const netProfit       = netGrossRevenue - totalProjectCost;
  const roi             = totalProjectCost > 0 ? netProfit / totalProjectCost : 0;
  const grossMarginPct  = targetSalePrice > 0 ? netProfit / targetSalePrice  : 0;
  const costPerSqft     = homeSqft > 0 ? totalProjectCost / homeSqft : 0;

  return {
    inputs: { lotPrice, homeSqft, targetSalePrice, lotAcres, stories, specLevel },

    // ── WBS Divisions ──────────────────────────────────────────────────────
    wbs: {
      div1_land:       land,
      div2_soft:       soft,
      div3_site:       site,
      div4_vertical:   vertical,
      div5_margins:    margins,
      div6_sales:      salesCosts,
      div7_closing:    closingCosts,
    },

    // ── Aggregate Summary ──────────────────────────────────────────────────
    summary: {
      totalHardCosts:          vertical.total + site.total,
      totalSoftCosts:          soft.total + land.total,
      totalDirectCosts:        directCosts,
      totalConstructionCost,
      totalProjectCost,
      targetSalePrice,
      totalSalesAndClosing:    salesCosts.total + closingCosts.total,
      netGrossRevenue,
      netProfit,
      roi,
      grossMarginPct,
      costPerSqft,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers (mirrors estimate.js conventions)
// ─────────────────────────────────────────────────────────────────────────────

export function fmtMoney(n) {
  return '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtPct(n) {
  return ((Number(n) || 0) * 100).toFixed(1) + '%';
}

/**
 * Returns a flat, human-readable line-item array for display or export.
 * Each entry: { wbs, label, amount }
 */
export function flattenBreakdown(result) {
  const { wbs } = result;
  return [
    // Div 1
    { wbs: '1.1', label: 'Lot Purchase Price',                         amount: wbs.div1_land.lotPurchasePrice    },
    { wbs: '1.2', label: 'Feasibility, Surveys & Soil Boring',         amount: wbs.div1_land.feasibilityStudies  },
    { wbs: '1.3', label: 'Recording Fees, Transfer Taxes & Closing',   amount: wbs.div1_land.recordingTransfer + wbs.div1_land.landClosing },
    { wbs: '1.4', label: 'Loan Origination & Interest Carry',          amount: wbs.div1_land.loanOrigination + wbs.div1_land.interestCarry },
    // Div 2
    { wbs: '2.1', label: 'Architectural Design & Engineering Stamps',   amount: wbs.div2_soft.archEngineering     },
    { wbs: '2.2', label: 'Site Engineering & Stormwater Management',    amount: wbs.div2_soft.siteEngineering     },
    { wbs: '2.3', label: 'VB Municipal Permits & Plan Review',          amount: wbs.div2_soft.municipalPermits    },
    { wbs: '2.4', label: 'Water & Sewer Tap Fees',                      amount: wbs.div2_soft.tapFees             },
    { wbs: '2.5', label: "Builder's Risk, GL Insurance & Survey",       amount: wbs.div2_soft.buildersRisk + wbs.div2_soft.glInsurance + wbs.div2_soft.surveyUpdate },
    // Div 3
    { wbs: '3.1', label: 'Lot Clearing, Grubbing & Tree Removal',       amount: wbs.div3_site.clearingGrubbing    },
    { wbs: '3.2', label: 'Excavation, Mass Grading & Compaction',       amount: wbs.div3_site.excavationGrading   },
    { wbs: '3.3', label: 'Water, Sewer & Electrical Utility Service',   amount: wbs.div3_site.utilityConnections  },
    { wbs: '3.4', label: 'Driveway Apron & Erosion Control',            amount: wbs.div3_site.drivewayApron + wbs.div3_site.erosionControl },
    // Div 4
    { wbs: '4.1', label: 'Foundation, Footings, Slab & CMU',            amount: wbs.div4_vertical.foundation       },
    { wbs: '4.2', label: 'Framing, Lumber Shell, Trusses & Sheathing',  amount: wbs.div4_vertical.framing          },
    { wbs: '4.3', label: 'Exterior Envelope — Siding, Roofing, Windows',amount: wbs.div4_vertical.exteriorEnvelope },
    { wbs: '4.4', label: 'MEP Systems Rough-Ins (Plumbing/Elec/HVAC)',  amount: wbs.div4_vertical.systemsRoughin   },
    { wbs: '4.5', label: 'Insulation, Drywall, Tape & Mud',             amount: wbs.div4_vertical.insulationDrywall},
    { wbs: '4.6', label: 'Interior Finishes — Cabinets, Tile, Flooring',amount: wbs.div4_vertical.interiorFinishes },
    // Div 5
    { wbs: '5.1', label: 'General Contractor Overhead',                 amount: wbs.div5_margins.gcOverhead        },
    { wbs: '5.2', label: 'Builder Profit Margin',                       amount: wbs.div5_margins.builderProfit     },
    { wbs: '5.3', label: 'Construction Contingency Reserve',            amount: wbs.div5_margins.contingency       },
    // Div 6
    { wbs: '6.1', label: 'Listing Broker Commission',                   amount: wbs.div6_sales.listingCommission   },
    { wbs: '6.2', label: "Buyer's Agent Co-op Commission",              amount: wbs.div6_sales.buyerAgentCommission},
    { wbs: '6.3', label: 'Staging, Photography & Digital Marketing',    amount: wbs.div6_sales.stagingMarketing    },
    // Div 7
    { wbs: '7.1', label: 'Title Insurance & Attorney Settlement',       amount: wbs.div7_closing.titleInsurance + wbs.div7_closing.attorneyFees },
    { wbs: '7.2', label: 'Seller Concessions',                          amount: wbs.div7_closing.sellerConcessions },
    { wbs: '7.3', label: 'VA Grantor Tax & State Transfer Tax',         amount: wbs.div7_closing.grantorTax + wbs.div7_closing.stateTaxes },
    { wbs: '7.4', label: 'Pro-rated Real Estate Taxes & HOA Transfer',  amount: wbs.div7_closing.proratedTaxes + wbs.div7_closing.hoaTransfer },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Preset scenario helpers — quick one-liners for common VB builds
// ─────────────────────────────────────────────────────────────────────────────

export const PRESETS = {
  /** 1,800 sqft starter home, Chesapeake / Suffolk fringe lot — target ~$595k list */
  starterHome: () => calculateNewHomeBudget({
    lotPrice: 95_000, homeSqft: 1_800, targetSalePrice: 595_000,
    lotAcres: 0.20, stories: 1, specLevel: 'standard',
  }),

  /** 2,400 sqft mid-level new construction, VB suburban infill — target ~$875k list */
  midRangeHome: () => calculateNewHomeBudget({
    lotPrice: 130_000, homeSqft: 2_400, targetSalePrice: 875_000,
    lotAcres: 0.25, stories: 2, specLevel: 'mid',
  }),

  /** 3,200 sqft custom build, VB Oceanfront / Great Neck corridor — target ~$1.65M list */
  customHome: () => calculateNewHomeBudget({
    lotPrice: 220_000, homeSqft: 3_200, targetSalePrice: 1_650_000,
    lotAcres: 0.35, stories: 2, specLevel: 'custom',
  }),
};
