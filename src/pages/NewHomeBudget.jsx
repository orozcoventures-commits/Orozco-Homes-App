import { useState, useMemo } from 'react';
import {
  calculateNewHomeBudget,
  flattenBreakdown,
  fmtMoney,
  fmtPct,
  SPEC_LEVELS,
} from '../utils/newHomeBudgetCalculator';

const DIVISIONS = [
  { key: 'div1_land',     num: '1', label: 'Land Acquisition & Carrying Costs',      color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  { key: 'div2_soft',     num: '2', label: 'Soft Costs — Pre-Development & Fees',    color: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD' },
  { key: 'div3_site',     num: '3', label: 'Site Work & Utilities',                  color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0' },
  { key: 'div4_vertical', num: '4', label: 'Hard Costs — Vertical Construction',     color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  { key: 'div5_margins',  num: '5', label: 'Contractor Margins & Overhead',          color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
  { key: 'div6_sales',    num: '6', label: 'Marketing & Sales',                      color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  { key: 'div7_closing',  num: '7', label: 'Closing Costs — Disposition',            color: '#374151', bg: '#F3F4F6', border: '#D1D5DB' },
];

const DIV_WBS_PREFIX = { div1_land: '1', div2_soft: '2', div3_site: '3', div4_vertical: '4', div5_margins: '5', div6_sales: '6', div7_closing: '7' };

const SPEC_LABELS = { standard: 'Standard', mid: 'Mid-Range', custom: 'Custom' };

function CurrencyInput({ label, value, onChange, hint }) {
  const [raw, setRaw] = useState(value === 0 ? '' : String(value));

  function handleChange(e) {
    const digits = e.target.value.replace(/[^0-9]/g, '');
    setRaw(digits);
    onChange(Number(digits) || 0);
  }

  function handleBlur() {
    if (raw === '' || raw === '0') { setRaw(''); return; }
    setRaw(Number(raw).toLocaleString('en-US'));
  }

  function handleFocus() {
    setRaw(String(value === 0 ? '' : value));
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ color: '#374151' }}>{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: '#9CA3AF' }}>$</span>
        <input
          type="text"
          inputMode="numeric"
          value={raw}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder="0"
          className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm font-medium focus:outline-none"
          style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}
          onFocus2={(e) => { e.currentTarget.style.borderColor = '#D4AF37'; }}
        />
      </div>
      {hint && <p className="text-xs" style={{ color: '#9CA3AF' }}>{hint}</p>}
    </div>
  );
}

function NumberInput({ label, value, onChange, min = 1, max = 99, step = 1, suffix = '' }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ color: '#374151' }}>{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full px-3 py-2.5 rounded-xl text-sm font-medium focus:outline-none"
          style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#9CA3AF' }}>{suffix}</span>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, highlight }) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-1"
      style={{
        backgroundColor: highlight ? '#002147' : '#fff',
        border: highlight ? 'none' : '1.5px solid #E8E6E1',
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: highlight ? 'rgba(212,175,55,0.7)' : '#9CA3AF' }}>{label}</p>
      <p className="text-lg font-extrabold" style={{ color: highlight ? '#D4AF37' : '#002147' }}>{value}</p>
      {sub && <p className="text-xs font-medium" style={{ color: highlight ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>{sub}</p>}
    </div>
  );
}

function RoiCard({ roi, netProfit }) {
  const positive = roi >= 0;
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-1"
      style={{
        backgroundColor: positive ? '#ECFDF5' : '#FEF2F2',
        border: `1.5px solid ${positive ? '#A7F3D0' : '#FECACA'}`,
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: positive ? '#065F46' : '#991B1B' }}>Developer Net ROI</p>
      <p className="text-lg font-extrabold" style={{ color: positive ? '#059669' : '#DC2626' }}>{fmtPct(roi)}</p>
      <p className="text-xs font-medium" style={{ color: positive ? '#065F46' : '#991B1B' }}>
        Net profit: {fmtMoney(netProfit)}
      </p>
    </div>
  );
}

export default function NewHomeBudget() {
  const [lotPrice,         setLotPrice]         = useState(130_000);
  const [homeSqft,         setHomeSqft]         = useState(2_400);
  const [targetSalePrice,  setTargetSalePrice]  = useState(875_000);
  const [lotAcres,         setLotAcres]         = useState(0.25);
  const [stories,          setStories]          = useState(2);
  const [specLevel,        setSpecLevel]        = useState('mid');
  const [openDivs,         setOpenDivs]         = useState({ div1_land: true, div2_soft: true, div3_site: true, div4_vertical: true, div5_margins: true, div6_sales: true, div7_closing: true });

  const result = useMemo(() => calculateNewHomeBudget({
    lotPrice, homeSqft, targetSalePrice, lotAcres, stories, specLevel,
  }), [lotPrice, homeSqft, targetSalePrice, lotAcres, stories, specLevel]);

  const { summary, wbs } = result;
  const lineItems = flattenBreakdown(result);

  function toggleDiv(key) {
    setOpenDivs((p) => ({ ...p, [key]: !p[key] }));
  }

  function divTotal(key) {
    return Object.values(wbs[key]).filter((v) => typeof v === 'number' && !['gcOverheadPct','builderProfitPct','contingencyPct'].includes(v)).reduce((a, v) => a + (typeof v === 'number' ? v : 0), 0);
  }

  // Recompute per-div totals from the actual nested objects
  const DIV_TOTALS = {
    div1_land:     wbs.div1_land.total,
    div2_soft:     wbs.div2_soft.total,
    div3_site:     wbs.div3_site.total,
    div4_vertical: wbs.div4_vertical.total,
    div5_margins:  wbs.div5_margins.total,
    div6_sales:    wbs.div6_sales.total,
    div7_closing:  wbs.div7_closing.total,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>Contractor Tool</p>
        <h1 className="text-2xl font-extrabold" style={{ color: '#002147' }}>New Home Budget Calculator</h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          Full 7-division WBS job cost model — Virginia Beach / Hampton Roads, 2026 regional pricing.
        </p>
      </div>

      {/* ── Inputs ───────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 mb-8"
        style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.05)' }}
      >
        <p className="text-xs font-bold tracking-[0.14em] uppercase mb-5" style={{ color: '#002147' }}>Project Parameters</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="col-span-2 sm:col-span-1 lg:col-span-2">
            <CurrencyInput label="Lot Purchase Price" value={lotPrice} onChange={setLotPrice} hint="Raw land acquisition cost" />
          </div>
          <div>
            <NumberInput label="Home Size (sqft)" value={homeSqft} onChange={setHomeSqft} min={500} max={20000} step={100} />
          </div>
          <div className="col-span-2 sm:col-span-1 lg:col-span-2">
            <CurrencyInput label="Target Sale Price" value={targetSalePrice} onChange={setTargetSalePrice} hint="Projected list / close price" />
          </div>
          <div>
            <NumberInput label="Lot Size" value={lotAcres} onChange={setLotAcres} min={0.05} max={10} step={0.05} suffix="ac" />
          </div>
          <div>
            <NumberInput label="Stories" value={stories} onChange={setStories} min={1} max={4} />
          </div>

          {/* Spec level toggle */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-5 flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: '#374151' }}>Specification Level</label>
            <div className="flex gap-2">
              {SPEC_LEVELS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpecLevel(s)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 focus:outline-none"
                  style={{
                    backgroundColor: specLevel === s ? '#002147' : '#F9FAFB',
                    color:           specLevel === s ? '#D4AF37'  : '#6B7280',
                    border:          specLevel === s ? '1.5px solid #002147' : '1.5px solid #E5E7EB',
                  }}
                >
                  {SPEC_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
          <SummaryCard label="Total Project Capital" value={fmtMoney(summary.totalProjectCost)} sub={`$${Math.round(summary.costPerSqft)}/sqft all-in`} highlight />
        </div>
        <SummaryCard label="Total Hard Costs"  value={fmtMoney(summary.totalHardCosts)}  sub="Vertical + site work" />
        <SummaryCard label="Total Soft Costs"  value={fmtMoney(summary.totalSoftCosts)}  sub="Land carry + fees" />
        <SummaryCard label="Net Gross Revenue" value={fmtMoney(summary.netGrossRevenue)} sub="After commissions & closing" />
        <div className="col-span-2 sm:col-span-1">
          <RoiCard roi={summary.roi} netProfit={summary.netProfit} />
        </div>
      </div>

      {/* ── WBS Line items ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {DIVISIONS.map((div) => {
          const isOpen    = openDivs[div.key];
          const divLines  = lineItems.filter((l) => l.wbs.startsWith(DIV_WBS_PREFIX[div.key] + '.'));
          const divTotalAmt = DIV_TOTALS[div.key];

          return (
            <div
              key={div.key}
              className="rounded-2xl overflow-hidden"
              style={{ border: `1.5px solid ${div.border}` }}
            >
              {/* Division header */}
              <button
                onClick={() => toggleDiv(div.key)}
                className="w-full flex items-center justify-between px-5 py-4 focus:outline-none"
                style={{ backgroundColor: div.bg }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0"
                    style={{ backgroundColor: div.color, color: '#fff' }}
                  >
                    {div.num}
                  </span>
                  <span className="text-sm font-bold" style={{ color: div.color }}>{div.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold" style={{ color: div.color }}>{fmtMoney(divTotalAmt)}</span>
                  <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                    stroke={div.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
                  >
                    <polyline points="1 4 6 8 11 4" />
                  </svg>
                </div>
              </button>

              {/* Line items */}
              {isOpen && (
                <div style={{ backgroundColor: '#fff' }}>
                  {divLines.map((line, i) => (
                    <div
                      key={line.wbs}
                      className="flex items-center justify-between px-5 py-3"
                      style={{
                        borderTop: i === 0 ? `1px solid ${div.border}` : '1px solid #F3F4F6',
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="text-xs font-bold shrink-0 w-7 text-center py-0.5 rounded"
                          style={{ backgroundColor: div.bg, color: div.color }}
                        >
                          {line.wbs}
                        </span>
                        <span className="text-sm truncate" style={{ color: '#374151' }}>{line.label}</span>
                      </div>
                      <span className="text-sm font-semibold shrink-0 ml-4" style={{ color: '#002147' }}>
                        {fmtMoney(line.amount)}
                      </span>
                    </div>
                  ))}

                  {/* Division subtotal row */}
                  <div
                    className="flex items-center justify-between px-5 py-3"
                    style={{ borderTop: `1px solid ${div.border}`, backgroundColor: div.bg }}
                  >
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: div.color }}>Division {div.num} Total</span>
                    <span className="text-sm font-extrabold" style={{ color: div.color }}>{fmtMoney(divTotalAmt)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Grand total footer ───────────────────────────────────────────────── */}
      <div
        className="mt-6 rounded-2xl p-6"
        style={{ backgroundColor: '#002147' }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>Total Hard Costs</p>
            <p className="text-base font-extrabold text-white">{fmtMoney(summary.totalHardCosts)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>Total Soft Costs</p>
            <p className="text-base font-extrabold text-white">{fmtMoney(summary.totalSoftCosts)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>Total Project Capital</p>
            <p className="text-xl font-extrabold" style={{ color: '#D4AF37' }}>{fmtMoney(summary.totalProjectCost)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>Developer Net ROI</p>
            <p
              className="text-xl font-extrabold"
              style={{ color: summary.roi >= 0 ? '#34D399' : '#F87171' }}
            >
              {fmtPct(summary.roi)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {fmtMoney(summary.netProfit)} net profit
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
