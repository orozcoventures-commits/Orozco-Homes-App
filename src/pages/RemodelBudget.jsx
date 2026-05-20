import { useState, useMemo } from 'react';
import {
  REMODEL_CONFIGS,
  SPEC_LEVELS,
  SPEC_LABELS,
  getProjectConfig,
  computeBaseLineValues,
} from '../utils/remodelBudgetCalculator';

// ── Project type groupings ────────────────────────────────────────────────────

const PROJECT_GROUPS = [
  {
    label: 'Bathrooms',
    types: ['bathroom-small', 'bathroom-medium', 'bathroom-large'],
  },
  {
    label: 'Kitchens',
    types: ['kitchen-small', 'kitchen-medium', 'kitchen-large'],
  },
  {
    label: 'Home Services',
    types: ['addition', 'portico', 'garage-conversion', 'full-renovation'],
  },
];

// Short labels for the type selector buttons
const TYPE_BUTTON_LABELS = {
  'bathroom-small':    'Small Bath',
  'bathroom-medium':   'Med Bath',
  'bathroom-large':    'Large Bath',
  'kitchen-small':     'Small Kitchen',
  'kitchen-medium':    'Med Kitchen',
  'kitchen-large':     'Large Kitchen',
  'addition':          'Addition',
  'portico':           'Portico',
  'garage-conversion': 'Garage Conv.',
  'full-renovation':   'Full Reno',
};

// ── Division color palette ────────────────────────────────────────────────────

const DIV_COLORS = {
  '1': { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },  // violet
  '2': { color: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD' },  // sky
  '3': { color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0' },  // emerald
  '4': { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },  // amber
  '5': { color: '#C2410C', bg: '#FFF7ED', border: '#FDBA74' },  // orange
  'M': { color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },  // red
};

function divStyle(num) {
  return DIV_COLORS[num] ?? DIV_COLORS['4'];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n)    { return '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function fmtD(n)   { return '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtPct(n) { return ((Number(n) || 0) * 100).toFixed(1) + '%'; }

function defaultInputs(projectTypeId) {
  const config = getProjectConfig(projectTypeId);
  if (!config) return {};
  return Object.fromEntries(config.inputFields.map((f) => [f.key, f.default]));
}

function allNonPctWbs(config) {
  const wbsList = [];
  for (const div of config.divisions) {
    for (const item of div.items) {
      if (item.unit !== 'pct') wbsList.push(item.wbs);
    }
  }
  return wbsList;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NumberInput({ label, value, onChange, min, max, step, suffix }) {
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
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: '#9CA3AF' }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

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

function LineRow({ item, divStyle: ds, value, isOverridden, onChange, onReset, pctRate, onPctChange, isFirst }) {
  return (
    <div
      className="flex items-center gap-2 sm:gap-3 px-4 py-2.5"
      style={{ borderTop: `1px solid ${isFirst ? ds.border : '#F3F4F6'}` }}
    >
      {/* WBS badge */}
      <span
        className="text-xs font-bold w-8 text-center py-0.5 rounded shrink-0"
        style={{ backgroundColor: ds.bg, color: ds.color }}
      >
        {item.wbs}
      </span>

      {/* Label */}
      <span className="flex-1 text-sm truncate" style={{ color: '#374151' }}>{item.label}</span>

      {/* Pct rate input */}
      {item.unit === 'pct' && item.pctKey && (
        <PctCell value={pctRate ?? 0} onChange={(v) => onPctChange(item.pctKey, v)} label={item.pctLabel} />
      )}

      {/* Override reset pill */}
      {isOverridden ? (
        <button
          onClick={onReset}
          title="Reset to formula value"
          className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: '#FFFBEB', color: '#D97706', border: '1px solid #FCD34D' }}
        >
          &#8635; reset
        </button>
      ) : (
        <div className="w-14 shrink-0" />
      )}

      {/* Editable dollar amount */}
      <DollarCell value={value} isOverridden={isOverridden} onChange={onChange} />
    </div>
  );
}

function SummaryCard({ label, value, sub, highlight, color }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1"
      style={{
        backgroundColor: highlight ? '#002147' : '#fff',
        border: highlight ? 'none' : `1.5px solid ${color ?? '#E8E6E1'}`,
      }}>
      <p className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: highlight ? 'rgba(212,175,55,0.7)' : '#9CA3AF' }}>{label}</p>
      <p className="text-lg font-extrabold"
        style={{ color: highlight ? '#D4AF37' : (color ? color : '#002147') }}>{value}</p>
      {sub && (
        <p className="text-xs font-medium"
          style={{ color: highlight ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>{sub}</p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RemodelBudget() {
  // ── State ─────────────────────────────────────────────────────────────────
  const [projectType, setProjectType] = useState('bathroom-medium');
  const [inputs,      setInputs]      = useState(() => defaultInputs('bathroom-medium'));
  const [specLevel,   setSpecLevel]   = useState('mid');
  const [pctRates,    setPctRates]    = useState({ overheadPct: 18, profitPct: 12, contingencyPct: 10 });
  const [userVals,    setUserVals]    = useState({});
  const [overrideFlags, setOverrideFlags] = useState({});
  const [openDivs,    setOpenDivs]    = useState({});

  const config = getProjectConfig(projectType);

  // ── Project type change ───────────────────────────────────────────────────
  function changeProjectType(typeId) {
    setProjectType(typeId);
    setInputs(defaultInputs(typeId));
    setPctRates({ overheadPct: 18, profitPct: 12, contingencyPct: 10 });
    setUserVals({});
    setOverrideFlags({});
    // Open all divisions on switch
    const cfg = getProjectConfig(typeId);
    if (cfg) {
      setOpenDivs(Object.fromEntries(cfg.divisions.map((d) => [d.key, true])));
    }
  }

  // Initialize openDivs on first render (config is known)
  // We use a lazy trick: if openDivs is empty, fill it
  const resolvedOpenDivs = useMemo(() => {
    if (!config) return {};
    if (Object.keys(openDivs).length > 0) return openDivs;
    return Object.fromEntries(config.divisions.map((d) => [d.key, true]));
  }, [config, openDivs]);

  // ── Cascade engine ────────────────────────────────────────────────────────
  const lineVals = useMemo(() => {
    if (!config) return {};

    // Formula-based values for all non-pct lines
    const formulaVals = computeBaseLineValues(projectType, inputs, specLevel);

    // Apply override flags
    const vals = {};
    for (const div of config.divisions) {
      for (const item of div.items) {
        if (item.unit === 'pct') {
          vals[item.wbs] = 0; // placeholder; computed below
        } else {
          vals[item.wbs] = overrideFlags[item.wbs]
            ? (userVals[item.wbs] ?? formulaVals[item.wbs] ?? 0)
            : (formulaVals[item.wbs] ?? 0);
        }
      }
    }

    // Compute base sum (all non-pct, non-M lines)
    const nonPctWbs = allNonPctWbs(config);
    const baseSum = nonPctWbs.reduce((s, w) => s + (vals[w] ?? 0), 0);

    // Pct lines
    vals['M.1'] = overrideFlags['M.1'] ? (userVals['M.1'] ?? 0) : baseSum * (pctRates.overheadPct / 100);
    vals['M.2'] = overrideFlags['M.2'] ? (userVals['M.2'] ?? 0) : baseSum * (pctRates.profitPct   / 100);
    vals['M.3'] = overrideFlags['M.3'] ? (userVals['M.3'] ?? 0) : baseSum * (pctRates.contingencyPct / 100);

    return vals;
  }, [config, projectType, inputs, specLevel, pctRates, userVals, overrideFlags]);

  // ── Aggregate totals ──────────────────────────────────────────────────────
  const totals = useMemo(() => {
    if (!config) return {};

    // Sum non-M lines
    const directCosts = allNonPctWbs(config).reduce((s, w) => s + (lineVals[w] ?? 0), 0);
    const overhead    = lineVals['M.1'] ?? 0;
    const profit      = lineVals['M.2'] ?? 0;
    const contingency = lineVals['M.3'] ?? 0;

    const totalClientPrice   = directCosts + overhead + profit + contingency;
    const contractorMargin   = overhead + profit;
    const marginPct          = totalClientPrice > 0 ? contractorMargin / totalClientPrice : 0;

    const sqftInput = config.inputFields.find((f) => f.key === 'sqft');
    const costPerSqft = sqftInput && inputs.sqft > 0 ? totalClientPrice / inputs.sqft : null;

    // Per-division sums for sub-total rows
    const divSums = {};
    for (const div of config.divisions) {
      divSums[div.key] = div.items.reduce((s, item) => s + (lineVals[item.wbs] ?? 0), 0);
    }

    return { directCosts, overhead, profit, contingency, totalClientPrice, contractorMargin, marginPct, costPerSqft, divSums };
  }, [config, lineVals, inputs.sqft]);

  // ── Event handlers ────────────────────────────────────────────────────────
  function handleLineChange(wbs, num) {
    setUserVals((p)        => ({ ...p, [wbs]: num }));
    setOverrideFlags((p)   => ({ ...p, [wbs]: true }));
  }

  function resetLine(wbs) {
    setOverrideFlags((p)  => ({ ...p, [wbs]: false }));
    setUserVals((p) => { const n = { ...p }; delete n[wbs]; return n; });
  }

  function resetAll() { setOverrideFlags({}); setUserVals({}); }

  function setInput(key, val) { setInputs((p) => ({ ...p, [key]: val })); }
  function setPctRate(key, val) { setPctRates((p) => ({ ...p, [key]: val })); }
  function toggleDiv(key) { setOpenDivs((p) => ({ ...p, [key]: !(resolvedOpenDivs[key] ?? true) })); }

  const hasOverrides = Object.values(overrideFlags).some(Boolean);

  if (!config) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>Contractor Tool</p>
          <h1 className="text-2xl font-extrabold" style={{ color: '#002147' }}>Remodel Budget Calculator</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Live WBS estimator — Virginia Beach / Hampton Roads, 2026. Every line item is editable.
          </p>
        </div>
        {hasOverrides && (
          <button
            onClick={resetAll}
            className="shrink-0 mt-1 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
            style={{ backgroundColor: '#FFFBEB', color: '#D97706', border: '1px solid #FCD34D' }}
          >
            &#8635; Reset all overrides
          </button>
        )}
      </div>

      {/* Project type selector */}
      <div className="rounded-2xl p-5 mb-5"
        style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.05)' }}>
        <p className="text-xs font-bold tracking-[0.14em] uppercase mb-3" style={{ color: '#002147' }}>Project Type</p>
        <div className="space-y-3">
          {PROJECT_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#9CA3AF' }}>{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.types.map((typeId) => {
                  const isActive = projectType === typeId;
                  return (
                    <button
                      key={typeId}
                      onClick={() => changeProjectType(typeId)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 focus:outline-none"
                      style={{
                        backgroundColor: isActive ? '#002147' : '#F9FAFB',
                        color:           isActive ? '#D4AF37'  : '#6B7280',
                        border:          isActive ? '1.5px solid #002147' : '1.5px solid #E5E7EB',
                      }}
                    >
                      {TYPE_BUTTON_LABELS[typeId]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Project parameters */}
      <div className="rounded-2xl p-6 mb-5"
        style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.05)' }}>
        <p className="text-xs font-bold tracking-[0.14em] uppercase mb-4" style={{ color: '#002147' }}>Project Parameters</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          {config.inputFields.map((field) => (
            <NumberInput
              key={field.key}
              label={field.label}
              value={inputs[field.key] ?? field.default}
              onChange={(v) => setInput(field.key, v)}
              min={field.min}
              max={field.max}
              step={field.step}
              suffix={field.unit}
            />
          ))}
        </div>

        {/* Spec level toggle */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold" style={{ color: '#374151' }}>Specification Level</label>
          <div className="flex gap-2">
            {SPEC_LEVELS.map((s) => (
              <button key={s} onClick={() => setSpecLevel(s)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 focus:outline-none"
                style={{
                  backgroundColor: specLevel === s ? '#002147' : '#F9FAFB',
                  color:           specLevel === s ? '#D4AF37'  : '#6B7280',
                  border:          specLevel === s ? '1.5px solid #002147' : '1.5px solid #E5E7EB',
                }}>
                {SPEC_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
          <SummaryCard
            label="Total Client Price"
            value={fmt(totals.totalClientPrice)}
            sub={totals.costPerSqft != null ? `${fmt(totals.costPerSqft)}/sqft` : undefined}
            highlight
          />
        </div>
        <SummaryCard
          label="Direct Costs"
          value={fmt(totals.directCosts)}
          sub="Materials + labor"
        />
        <SummaryCard
          label="Contractor Margin"
          value={fmt(totals.contractorMargin)}
          sub="Overhead + profit"
        />
        <SummaryCard
          label="Gross Margin %"
          value={fmtPct(totals.marginPct)}
          sub="Of total client price"
          color={totals.marginPct >= 0.25 ? '#059669' : '#D97706'}
        />
      </div>

      {/* WBS divisions */}
      <div className="space-y-3">
        {config.divisions.map((div) => {
          const ds      = divStyle(div.num);
          const isOpen  = resolvedOpenDivs[div.key] ?? true;
          const divTotal = totals.divSums?.[div.key] ?? 0;

          return (
            <div key={div.key} className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${ds.border}` }}>

              {/* Division header */}
              <button
                onClick={() => toggleDiv(div.key)}
                className="w-full flex items-center justify-between px-5 py-4 focus:outline-none"
                style={{ backgroundColor: ds.bg }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0"
                    style={{ backgroundColor: ds.color, color: '#fff' }}>{div.num}</span>
                  <span className="text-sm font-bold text-left" style={{ color: ds.color }}>{div.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold" style={{ color: ds.color }}>{fmt(divTotal)}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                    stroke={ds.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
                    <polyline points="1 4 6 8 11 4" />
                  </svg>
                </div>
              </button>

              {/* Editable line items */}
              {isOpen && (
                <div style={{ backgroundColor: '#fff' }}>
                  {div.items.map((item, i) => (
                    <LineRow
                      key={item.wbs}
                      item={item}
                      divStyle={ds}
                      value={lineVals[item.wbs] ?? 0}
                      isOverridden={!!overrideFlags[item.wbs]}
                      onChange={(num) => handleLineChange(item.wbs, num)}
                      onReset={() => resetLine(item.wbs)}
                      pctRate={item.pctKey ? pctRates[item.pctKey] : null}
                      onPctChange={setPctRate}
                      isFirst={i === 0}
                    />
                  ))}

                  {/* Division subtotal */}
                  <div className="flex items-center justify-between px-4 py-3"
                    style={{ borderTop: `1px solid ${ds.border}`, backgroundColor: ds.bg }}>
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: ds.color }}>
                      Division {div.num} Total
                    </span>
                    <span className="text-sm font-extrabold" style={{ color: ds.color }}>{fmt(divTotal)}</span>
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
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>Direct Costs</p>
            <p className="text-base font-extrabold text-white">{fmt(totals.directCosts)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>Overhead + Profit</p>
            <p className="text-base font-extrabold text-white">{fmt(totals.contractorMargin)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>Total Client Price</p>
            <p className="text-xl font-extrabold" style={{ color: '#D4AF37' }}>{fmt(totals.totalClientPrice)}</p>
            {totals.costPerSqft != null && (
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {fmtD(totals.costPerSqft)}/sqft
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>Gross Margin</p>
            <p className="text-xl font-extrabold" style={{ color: totals.marginPct >= 0.25 ? '#34D399' : '#FBBF24' }}>
              {fmtPct(totals.marginPct)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {fmt(totals.contractorMargin)} contractor margin
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
