import { useState, useMemo } from 'react';
import { calculateNewHomeBudget, flattenBreakdown, SPEC_LEVELS } from '../utils/newHomeBudgetCalculator';

// ── Static metadata ───────────────────────────────────────────────────────────

const DIVISIONS = [
  { key: 'div1', num: '1', pfx: '1', label: 'Land Acquisition & Carrying Costs',    color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  { key: 'div2', num: '2', pfx: '2', label: 'Soft Costs — Pre-Development & Fees',  color: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD' },
  { key: 'div3', num: '3', pfx: '3', label: 'Site Work & Utilities',                color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0' },
  { key: 'div4', num: '4', pfx: '4', label: 'Hard Costs — Vertical Construction',   color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  { key: 'div5', num: '5', pfx: '5', label: 'Contractor Margins & Overhead',        color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
  { key: 'div6', num: '6', pfx: '6', label: 'Marketing & Sales',                    color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  { key: 'div7', num: '7', pfx: '7', label: 'Closing Costs — Disposition',          color: '#374151', bg: '#F3F4F6', border: '#D1D5DB' },
];

const LINE_ITEMS = [
  { wbs: '1.1', label: 'Lot Purchase Price' },
  { wbs: '1.2', label: 'Feasibility, Surveys & Soil Boring' },
  { wbs: '1.3', label: 'Recording Fees, Transfer Taxes & Closing' },
  { wbs: '1.4', label: 'Loan Origination & Interest Carry' },
  { wbs: '2.1', label: 'Architectural Design & Engineering Stamps' },
  { wbs: '2.2', label: 'Site Engineering & Stormwater Management' },
  { wbs: '2.3', label: 'VB Municipal Permits & Plan Review' },
  { wbs: '2.4', label: 'Water & Sewer Tap Fees' },
  { wbs: '2.5', label: "Builder's Risk, GL Insurance & Survey" },
  { wbs: '3.1', label: 'Lot Clearing, Grubbing & Tree Removal' },
  { wbs: '3.2', label: 'Excavation, Mass Grading & Compaction' },
  { wbs: '3.3', label: 'Water, Sewer & Electrical Utility Service' },
  { wbs: '3.4', label: 'Driveway Apron & Erosion Control' },
  { wbs: '4.1', label: 'Foundation, Footings, Slab & CMU' },
  { wbs: '4.2', label: 'Framing, Lumber Shell, Trusses & Sheathing' },
  { wbs: '4.3', label: 'Exterior Envelope — Siding, Roofing, Windows' },
  { wbs: '4.4', label: 'MEP Systems Rough-Ins (Plumbing/Elec/HVAC)' },
  { wbs: '4.5', label: 'Insulation, Drywall, Tape & Mud' },
  { wbs: '4.6', label: 'Interior Finishes — Cabinets, Tile, Flooring' },
  { wbs: '5.1', label: 'General Contractor Overhead',       pctKey: 'gcOverheadPct',    pctLabel: 'GC OH'   },
  { wbs: '5.2', label: 'Builder Profit Margin',             pctKey: 'builderProfitPct', pctLabel: 'Profit'  },
  { wbs: '5.3', label: 'Construction Contingency Reserve',  pctKey: 'contingencyPct',   pctLabel: 'Reserve' },
  { wbs: '6.1', label: 'Listing Broker Commission',         pctKey: 'listingCommPct',   pctLabel: 'Listing' },
  { wbs: '6.2', label: "Buyer's Agent Co-op Commission",    pctKey: 'buyerAgentPct',    pctLabel: 'Co-op'   },
  { wbs: '6.3', label: 'Staging, Photography & Digital Marketing' },
  { wbs: '7.1', label: 'Title Insurance & Attorney Settlement' },
  { wbs: '7.2', label: 'Seller Concessions' },
  { wbs: '7.3', label: 'VA Grantor Tax & State Transfer Tax' },
  { wbs: '7.4', label: 'Pro-rated Real Estate Taxes & HOA Transfer' },
];

// These 5 are recomputed from other line totals whenever pctRates changes
const BASE_WBS = ['1.1','1.2','1.3','1.4','2.1','2.2','2.3','2.4','2.5','3.1','3.2','3.3','3.4','4.1','4.2','4.3','4.4','4.5','4.6'];

const SPEC_LABELS = { standard: 'Standard', mid: 'Mid-Range', custom: 'Custom' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n)    { return '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function fmtD(n)   { return '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtPct(n) { return ((Number(n) || 0) * 100).toFixed(1) + '%'; }
function sumKeys(obj, keys) { return keys.reduce((s, k) => s + (Number(obj[k]) || 0), 0); }

// ── Sub-components ────────────────────────────────────────────────────────────

function TopCurrencyInput({ label, value, onChange, hint }) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState('');
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ color: '#374151' }}>{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: '#9CA3AF' }}>$</span>
        <input
          type="text" inputMode="numeric"
          value={focused ? raw : value.toLocaleString('en-US')}
          onFocus={() => { setFocused(true); setRaw(String(value || '')); }}
          onBlur={() => setFocused(false)}
          onChange={(e) => { const d = e.target.value.replace(/[^0-9]/g, ''); setRaw(d); onChange(Number(d) || 0); }}
          className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm font-medium focus:outline-none"
          style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}
        />
      </div>
      {hint && <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{hint}</p>}
    </div>
  );
}

function TopNumberInput({ label, value, onChange, min, max, step = 1, suffix }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ color: '#374151' }}>{label}</label>
      <div className="relative">
        <input
          type="number" value={value} min={min} max={max} step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full px-3 py-2.5 rounded-xl text-sm font-medium focus:outline-none"
          style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#9CA3AF' }}>{suffix}</span>}
      </div>
    </div>
  );
}

// Editable dollar amount cell — manages local raw text so typing feels instant
function DollarCell({ value, isOverridden, onChange }) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw]         = useState('');

  return (
    <div className="relative" style={{ width: '128px' }}>
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: '#9CA3AF' }}>$</span>
      <input
        type="text" inputMode="numeric"
        value={focused ? raw : (Number(value) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
        onFocus={() => { setFocused(true); setRaw(String(Math.round(Number(value) || 0))); }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, '');
          setRaw(digits);
          onChange(Number(digits) || 0);
        }}
        className="w-full pl-6 pr-2 py-1.5 rounded-lg text-sm font-semibold text-right focus:outline-none transition-colors"
        style={{
          backgroundColor: isOverridden ? '#FFFBEB' : '#F9FAFB',
          border: `1.5px solid ${isOverridden ? '#FCD34D' : '#E5E7EB'}`,
          color: '#002147',
        }}
      />
    </div>
  );
}

// Editable percentage cell for margin / commission rates
function PctCell({ value, onChange, label }) {
  return (
    <div className="hidden sm:flex items-center gap-1.5 shrink-0">
      <span className="text-xs" style={{ color: '#9CA3AF' }}>{label}</span>
      <div className="relative" style={{ width: '70px' }}>
        <input
          type="number" step="0.1" min="0" max="100" value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full pr-5 pl-2 py-1 rounded-lg text-xs font-semibold text-right focus:outline-none"
          style={{ backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: '#9CA3AF' }}>%</span>
      </div>
    </div>
  );
}

function LineRow({ item, divColor, divBg, divBorder, value, isOverridden, onChange, onReset, pctRate, onPctChange, isFirst }) {
  return (
    <div
      className="flex items-center gap-2 sm:gap-3 px-4 py-2.5"
      style={{ borderTop: `1px solid ${isFirst ? divBorder : '#F3F4F6'}` }}
    >
      {/* WBS badge */}
      <span
        className="text-xs font-bold w-8 text-center py-0.5 rounded shrink-0"
        style={{ backgroundColor: divBg, color: divColor }}
      >
        {item.wbs}
      </span>

      {/* Label */}
      <span className="flex-1 text-sm truncate" style={{ color: '#374151' }}>{item.label}</span>

      {/* Pct rate input (Div 5 and 6 only) */}
      {item.pctKey && (
        <PctCell value={pctRate} onChange={(v) => onPctChange(item.pctKey, v)} label={item.pctLabel} />
      )}

      {/* Override reset pill */}
      {isOverridden ? (
        <button
          onClick={onReset}
          title="Reset to formula value"
          className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: '#FFFBEB', color: '#D97706', border: '1px solid #FCD34D' }}
        >
          ↺ reset
        </button>
      ) : (
        <div className="w-14 shrink-0" />
      )}

      {/* Editable dollar amount */}
      <DollarCell value={value} isOverridden={isOverridden} onChange={onChange} />
    </div>
  );
}

function SummaryCard({ label, value, sub, highlight }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1"
      style={{ backgroundColor: highlight ? '#002147' : '#fff', border: highlight ? 'none' : '1.5px solid #E8E6E1' }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: highlight ? 'rgba(212,175,55,0.7)' : '#9CA3AF' }}>{label}</p>
      <p className="text-lg font-extrabold" style={{ color: highlight ? '#D4AF37' : '#002147' }}>{value}</p>
      {sub && <p className="text-xs font-medium" style={{ color: highlight ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>{sub}</p>}
    </div>
  );
}

function RoiCard({ roi, netProfit }) {
  const pos = roi >= 0;
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1"
      style={{ backgroundColor: pos ? '#ECFDF5' : '#FEF2F2', border: `1.5px solid ${pos ? '#A7F3D0' : '#FECACA'}` }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: pos ? '#065F46' : '#991B1B' }}>Developer Net ROI</p>
      <p className="text-lg font-extrabold" style={{ color: pos ? '#059669' : '#DC2626' }}>{fmtPct(roi)}</p>
      <p className="text-xs font-medium" style={{ color: pos ? '#065F46' : '#991B1B' }}>Net profit: {fmtD(netProfit)}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NewHomeBudget() {
  // ── Top-level project inputs ──────────────────────────────────────────────
  const [form, setForm] = useState({
    lotPrice: 130_000, homeSqft: 2_400, targetSalePrice: 875_000,
    lotAcres: 0.25, stories: 2, specLevel: 'mid',
  });

  // ── Editable percentage rates (Div 5 & 6) ────────────────────────────────
  const [pctRates, setPctRates] = useState({
    gcOverheadPct: 6, builderProfitPct: 13, contingencyPct: 7.5,
    listingCommPct: 2.75, buyerAgentPct: 2.75,
  });

  // ── Per-line override state ───────────────────────────────────────────────
  const [userVals,  setUserVals]  = useState({});   // WBS → user-typed number
  const [overrides, setOverrides] = useState({});   // WBS → boolean

  // ── Collapse state ────────────────────────────────────────────────────────
  const [openDivs, setOpenDivs] = useState(
    Object.fromEntries(DIVISIONS.map((d) => [d.key, true]))
  );

  // ── Derived line values (cascade engine) ─────────────────────────────────
  // Pass 1: get formula-based values from the calculator
  // Pass 2: apply user overrides on top
  // Pass 3: recompute pct-based lines (5.1-5.3, 6.1-6.2) from live base totals
  const lineVals = useMemo(() => {
    const result = calculateNewHomeBudget({ ...form });
    const calcMap = {};
    for (const l of flattenBreakdown(result)) calcMap[l.wbs] = l.amount;

    const vals = {};
    for (const l of LINE_ITEMS) {
      vals[l.wbs] = overrides[l.wbs] ? (userVals[l.wbs] ?? calcMap[l.wbs] ?? 0) : (calcMap[l.wbs] ?? 0);
    }

    // Recompute pct-driven lines from current base totals unless manually overridden
    const base  = sumKeys(vals, BASE_WBS);
    const gcOH  = overrides['5.1'] ? vals['5.1'] : base * (pctRates.gcOverheadPct / 100);
    const prof  = overrides['5.2'] ? vals['5.2'] : (base + gcOH) * (pctRates.builderProfitPct / 100);
    const cont  = overrides['5.3'] ? vals['5.3'] : base * (pctRates.contingencyPct / 100);
    const lComm = overrides['6.1'] ? vals['6.1'] : form.targetSalePrice * (pctRates.listingCommPct / 100);
    const bAgent= overrides['6.2'] ? vals['6.2'] : form.targetSalePrice * (pctRates.buyerAgentPct / 100);

    vals['5.1'] = gcOH; vals['5.2'] = prof;  vals['5.3'] = cont;
    vals['6.1'] = lComm; vals['6.2'] = bAgent;

    return vals;
  }, [form, pctRates, userVals, overrides]);

  // ── Aggregate totals ──────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const divSum = (pfx) => LINE_ITEMS
      .filter((l) => l.wbs.startsWith(pfx + '.'))
      .reduce((s, l) => s + (lineVals[l.wbs] ?? 0), 0);

    const d1 = divSum('1'), d2 = divSum('2'), d3 = divSum('3'), d4 = divSum('4');
    const d5 = divSum('5'), d6 = divSum('6'), d7 = divSum('7');

    const totalHard    = d3 + d4;
    const totalSoft    = d1 + d2;
    const totalProject = d1 + d2 + d3 + d4 + d5;
    const netRevenue   = form.targetSalePrice - d6 - d7;
    const netProfit    = netRevenue - totalProject;
    const roi          = totalProject > 0 ? netProfit / totalProject : 0;
    const costPerSqft  = form.homeSqft  > 0 ? totalProject / form.homeSqft : 0;

    return { d1, d2, d3, d4, d5, d6, d7, totalHard, totalSoft, totalProject, netRevenue, netProfit, roi, costPerSqft };
  }, [lineVals, form.targetSalePrice, form.homeSqft]);

  // ── Event handlers ────────────────────────────────────────────────────────
  function handleLineChange(wbs, num) {
    setUserVals((p)  => ({ ...p, [wbs]: num }));
    setOverrides((p) => ({ ...p, [wbs]: true }));
  }

  function resetLine(wbs) {
    setOverrides((p) => ({ ...p, [wbs]: false }));
    setUserVals((p)  => { const n = { ...p }; delete n[wbs]; return n; });
  }

  function resetAll() { setOverrides({}); setUserVals({}); }

  function setFormField(key, val) { setForm((p) => ({ ...p, [key]: val })); }
  function setPctRate(key, val)   { setPctRates((p) => ({ ...p, [key]: val })); }

  const hasOverrides = Object.values(overrides).some(Boolean);

  const divTotals = { div1: totals.d1, div2: totals.d2, div3: totals.d3, div4: totals.d4, div5: totals.d5, div6: totals.d6, div7: totals.d7 };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>Contractor Tool</p>
          <h1 className="text-2xl font-extrabold" style={{ color: '#002147' }}>New Home Budget Calculator</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Full 7-division WBS — Virginia Beach / Hampton Roads, 2026. Every line item is editable.
          </p>
        </div>
        {hasOverrides && (
          <button
            onClick={resetAll}
            className="shrink-0 mt-1 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
            style={{ backgroundColor: '#FFFBEB', color: '#D97706', border: '1px solid #FCD34D' }}
          >
            ↺ Reset all overrides
          </button>
        )}
      </div>

      {/* Project parameters */}
      <div className="rounded-2xl p-6 mb-6"
        style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.05)' }}>
        <p className="text-xs font-bold tracking-[0.14em] uppercase mb-4" style={{ color: '#002147' }}>Project Parameters</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="col-span-2 sm:col-span-1 lg:col-span-2">
            <TopCurrencyInput label="Lot Purchase Price" value={form.lotPrice} onChange={(v) => setFormField('lotPrice', v)} hint="Raw land acquisition cost" />
          </div>
          <div>
            <TopNumberInput label="Home Size (sqft)" value={form.homeSqft} onChange={(v) => setFormField('homeSqft', v)} min={500} max={20000} step={100} />
          </div>
          <div className="col-span-2 sm:col-span-1 lg:col-span-2">
            <TopCurrencyInput label="Target Sale Price" value={form.targetSalePrice} onChange={(v) => setFormField('targetSalePrice', v)} hint="Projected list / close price" />
          </div>
          <div>
            <TopNumberInput label="Lot Size" value={form.lotAcres} onChange={(v) => setFormField('lotAcres', v)} min={0.05} max={10} step={0.05} suffix="ac" />
          </div>
          <div>
            <TopNumberInput label="Stories" value={form.stories} onChange={(v) => setFormField('stories', v)} min={1} max={4} />
          </div>
          <div className="col-span-2 sm:col-span-3 lg:col-span-5 flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: '#374151' }}>Specification Level</label>
            <div className="flex gap-2">
              {SPEC_LEVELS.map((s) => (
                <button key={s} onClick={() => setFormField('specLevel', s)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 focus:outline-none"
                  style={{
                    backgroundColor: form.specLevel === s ? '#002147' : '#F9FAFB',
                    color:           form.specLevel === s ? '#D4AF37'  : '#6B7280',
                    border:          form.specLevel === s ? '1.5px solid #002147' : '1.5px solid #E5E7EB',
                  }}>
                  {SPEC_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
          <SummaryCard label="Total Project Capital" value={fmt(totals.totalProject)} sub={`$${Math.round(totals.costPerSqft)}/sqft all-in`} highlight />
        </div>
        <SummaryCard label="Total Hard Costs"  value={fmt(totals.totalHard)}    sub="Vertical + site work" />
        <SummaryCard label="Total Soft Costs"  value={fmt(totals.totalSoft)}    sub="Land carry + fees" />
        <SummaryCard label="Net Gross Revenue" value={fmt(totals.netRevenue)}   sub="After commissions & closing" />
        <div className="col-span-2 sm:col-span-1"><RoiCard roi={totals.roi} netProfit={totals.netProfit} /></div>
      </div>

      {/* WBS divisions — every line item is an editable field */}
      <div className="space-y-3">
        {DIVISIONS.map((div) => {
          const isOpen   = openDivs[div.key];
          const divItems = LINE_ITEMS.filter((l) => l.wbs.startsWith(div.pfx + '.'));
          const divTotal = divTotals[div.key];

          return (
            <div key={div.key} className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${div.border}` }}>

              {/* Division header — click to collapse */}
              <button
                onClick={() => setOpenDivs((p) => ({ ...p, [div.key]: !p[div.key] }))}
                className="w-full flex items-center justify-between px-5 py-4 focus:outline-none"
                style={{ backgroundColor: div.bg }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0"
                    style={{ backgroundColor: div.color, color: '#fff' }}>{div.num}</span>
                  <span className="text-sm font-bold text-left" style={{ color: div.color }}>{div.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold" style={{ color: div.color }}>{fmt(divTotal)}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                    stroke={div.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
                    <polyline points="1 4 6 8 11 4" />
                  </svg>
                </div>
              </button>

              {/* Editable line items */}
              {isOpen && (
                <div style={{ backgroundColor: '#fff' }}>
                  {divItems.map((item, i) => (
                    <LineRow
                      key={item.wbs}
                      item={item}
                      divColor={div.color}
                      divBg={div.bg}
                      divBorder={div.border}
                      value={lineVals[item.wbs] ?? 0}
                      isOverridden={!!overrides[item.wbs]}
                      onChange={(num) => handleLineChange(item.wbs, num)}
                      onReset={() => resetLine(item.wbs)}
                      pctRate={item.pctKey ? pctRates[item.pctKey] : null}
                      onPctChange={setPctRate}
                      isFirst={i === 0}
                    />
                  ))}

                  {/* Division subtotal */}
                  <div className="flex items-center justify-between px-4 py-3"
                    style={{ borderTop: `1px solid ${div.border}`, backgroundColor: div.bg }}>
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: div.color }}>
                      Division {div.num} Total
                    </span>
                    <span className="text-sm font-extrabold" style={{ color: div.color }}>{fmt(divTotal)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grand total footer */}
      <div className="mt-6 rounded-2xl p-6" style={{ backgroundColor: '#002147' }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>Total Hard Costs</p>
            <p className="text-base font-extrabold text-white">{fmt(totals.totalHard)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>Total Soft Costs</p>
            <p className="text-base font-extrabold text-white">{fmt(totals.totalSoft)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>Total Project Capital</p>
            <p className="text-xl font-extrabold" style={{ color: '#D4AF37' }}>{fmt(totals.totalProject)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>Developer Net ROI</p>
            <p className="text-xl font-extrabold" style={{ color: totals.roi >= 0 ? '#34D399' : '#F87171' }}>
              {fmtPct(totals.roi)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{fmtD(totals.netProfit)} net profit</p>
          </div>
        </div>
      </div>
    </div>
  );
}
