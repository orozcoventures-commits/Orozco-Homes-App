import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  REMODEL_CONFIGS,
  SPEC_LEVELS,
  SPEC_LABELS,
  getProjectConfig,
  computeBaseLineValues,
} from '../utils/remodelBudgetCalculator';
import { supabase } from '../lib/supabase';

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

// ── Design Specs section component ───────────────────────────────────────────
function DesignSpecsSection({ approvedSpecs, total, isOpen, onToggle }) {
  if (approvedSpecs.length === 0) return null;
  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={{ border: '1.5px solid #6EE7B7' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 focus:outline-none"
        style={{ backgroundColor: '#ECFDF5' }}
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0" style={{ backgroundColor: '#065F46', color: '#fff' }}>DS</span>
          <span className="text-sm font-bold text-left" style={{ color: '#065F46' }}>Design Selections (Approved)</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>{approvedSpecs.length} items</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-extrabold" style={{ color: '#065F46' }}>${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#065F46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <polyline points="1 4 6 8 11 4" />
          </svg>
        </div>
      </button>
      {isOpen && (
        <div style={{ backgroundColor: '#fff' }}>
          {approvedSpecs.map((spec, i) => (
            <div
              key={spec.id}
              className="flex items-center gap-3 px-4 py-2.5"
              style={{ borderTop: i === 0 ? '1px solid #6EE7B7' : '1px solid #F3F4F6' }}
            >
              <span className="text-xs font-bold w-8 text-center py-0.5 rounded shrink-0" style={{ backgroundColor: '#ECFDF5', color: '#065F46' }}>DS</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm truncate" style={{ color: '#374151' }}>{spec.product_name}</span>
                {spec.supplier && <span className="text-xs ml-2" style={{ color: '#9CA3AF' }}>{spec.supplier}</span>}
              </div>
              <span className="text-xs shrink-0" style={{ color: '#9CA3AF' }}>{spec.quantity} {spec.unit_type}</span>
              <span className="text-sm font-semibold shrink-0" style={{ color: '#065F46' }}>
                ${(Number(spec.installed_cost) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #6EE7B7', backgroundColor: '#ECFDF5' }}>
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#065F46' }}>Design Selections Total</span>
            <span className="text-sm font-extrabold" style={{ color: '#065F46' }}>${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
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

  // Design specs integration
  const [dbProjects,      setDbProjects]      = useState([]);
  const [selectedProjId,  setSelectedProjId]  = useState('');
  const [approvedSpecs,   setApprovedSpecs]   = useState([]);
  const [specsDivOpen,    setSpecsDivOpen]    = useState(true);

  useEffect(() => {
    supabase.from('projects').select('id, project_name').order('created_at', { ascending: false })
      .then(({ data }) => setDbProjects(data ?? []));
  }, []);

  const loadApprovedSpecs = useCallback(async (pid) => {
    if (!pid) { setApprovedSpecs([]); return; }
    const { data } = await supabase
      .from('design_specs')
      .select('id, product_name, supplier, quantity, unit_type, installed_cost, room_category')
      .eq('project_id', pid)
      .eq('status', 'approved')
      .order('room_category');
    setApprovedSpecs(data ?? []);
  }, []);

  useEffect(() => { loadApprovedSpecs(selectedProjId); }, [selectedProjId, loadApprovedSpecs]);

  const designSpecsTotal = useMemo(
    () => approvedSpecs.reduce((s, sp) => s + (Number(sp.installed_cost) || 0), 0),
    [approvedSpecs]
  );

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

    // Base sum includes approved design specs installed cost
    const nonPctWbs = allNonPctWbs(config);
    const wbsSum  = nonPctWbs.reduce((s, w) => s + (vals[w] ?? 0), 0);
    const baseSum = wbsSum + designSpecsTotal;

    // Pct lines
    vals['M.1'] = overrideFlags['M.1'] ? (userVals['M.1'] ?? 0) : baseSum * (pctRates.overheadPct / 100);
    vals['M.2'] = overrideFlags['M.2'] ? (userVals['M.2'] ?? 0) : baseSum * (pctRates.profitPct   / 100);
    vals['M.3'] = overrideFlags['M.3'] ? (userVals['M.3'] ?? 0) : baseSum * (pctRates.contingencyPct / 100);

    return vals;
  }, [config, projectType, inputs, specLevel, pctRates, userVals, overrideFlags, designSpecsTotal]);

  // ── Aggregate totals ──────────────────────────────────────────────────────
  const totals = useMemo(() => {
    if (!config) return {};

    // Sum non-M lines + approved design specs
    const directCosts = allNonPctWbs(config).reduce((s, w) => s + (lineVals[w] ?? 0), 0) + designSpecsTotal;
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
  }, [config, lineVals, inputs.sqft, designSpecsTotal]);

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

  // ── Export to print window ────────────────────────────────────────────────
  function handleExport() {
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const projectTypeName = TYPE_BUTTON_LABELS[projectType] ?? projectType;

    let specsTableHTML = '';
    if (approvedSpecs.length > 0) {
      const rows = approvedSpecs.map((sp) => `
        <tr>
          <td>${sp.product_name}</td>
          <td>${sp.supplier || '—'}</td>
          <td class="amount">${sp.quantity} ${sp.unit_type}</td>
          <td class="amount">$${(Number(sp.installed_cost) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>`).join('');
      specsTableHTML = `
        <h2>Design Selections (Approved)</h2>
        <table>
          <thead><tr><th>Product</th><th>Supplier</th><th class="amount">Qty / Unit</th><th class="amount">Installed Cost</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td colspan="3" class="amount-label">Design Selections Total</td><td class="amount">$${designSpecsTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr></tfoot>
        </table>`;
    }

    let wbsRowsHTML = '';
    for (const div of config.divisions) {
      const divTotal = totals.divSums?.[div.key] ?? 0;
      wbsRowsHTML += `<tr class="div-header"><td colspan="2">${div.label}</td><td class="amount">$${Math.round(divTotal).toLocaleString('en-US')}</td></tr>`;
      for (const item of div.items) {
        const val = lineVals[item.wbs] ?? 0;
        if (val === 0) continue;
        wbsRowsHTML += `<tr><td class="wbs-code">${item.wbs}</td><td>${item.label}</td><td class="amount">$${Math.round(val).toLocaleString('en-US')}</td></tr>`;
      }
    }

    const paramRows = config.inputFields.map((f) =>
      `<div class="param-item"><div class="param-label">${f.label}</div><div class="param-value">${inputs[f.key] ?? f.default} ${f.unit}</div></div>`
    ).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Orozco Homes — Budget Estimate</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11pt;color:#1A1A1A;padding:40px 48px;max-width:820px;margin:0 auto}
    .header{display:flex;align-items:center;justify-content:space-between;padding-bottom:20px;border-bottom:2.5px solid #002147;margin-bottom:24px}
    .brand-mark{width:44px;height:44px;border-radius:10px;background:#002147;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14pt;color:#D4AF37;flex-shrink:0;letter-spacing:-1px}
    .brand-info{margin-left:12px;flex:1}
    .brand-name{font-size:18pt;font-weight:900;color:#002147;letter-spacing:-0.5px}
    .brand-sub{font-size:8pt;color:#6B7280;text-transform:uppercase;letter-spacing:.12em;font-weight:600}
    .doc-meta{text-align:right;font-size:8pt;color:#6B7280}
    .doc-meta strong{display:block;font-size:10pt;color:#002147;margin-bottom:2px}
    h2{font-size:10pt;font-weight:800;color:#002147;text-transform:uppercase;letter-spacing:.1em;margin:20px 0 8px;border-left:3px solid #D4AF37;padding-left:8px}
    .params-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 20px;margin-bottom:6px}
    .param-item{font-size:9pt}
    .param-label{color:#6B7280;font-weight:600;font-size:8pt;text-transform:uppercase;letter-spacing:.06em}
    .param-value{color:#002147;font-weight:700;margin-top:1px}
    table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:9.5pt}
    th{text-align:left;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6B7280;border-bottom:1.5px solid #E5E7EB;padding:5px 6px}
    td{padding:5px 6px;border-bottom:1px solid #F3F4F6;vertical-align:top}
    .amount{text-align:right;font-variant-numeric:tabular-nums}
    .amount-label{text-align:right;font-weight:700;font-size:9pt;color:#002147}
    tr.div-header td{background:#F5F4F0;font-weight:700;font-size:9pt;color:#002147;border-bottom:1px solid #E5E7EB}
    .wbs-code{font-size:8pt;font-weight:700;color:#7C3AED;width:40px}
    tfoot tr td{font-weight:700;border-top:1.5px solid #D1D5DB;border-bottom:none;background:#F9FAFB}
    .totals-block{margin-top:20px;border:2px solid #002147;border-radius:8px;overflow:hidden}
    .totals-row{display:flex;justify-content:space-between;align-items:center;padding:8px 14px;font-size:10pt;border-bottom:1px solid #E5E7EB}
    .totals-row:last-child{border-bottom:none}
    .totals-row.sub{background:#F9FAFB}
    .totals-row.grand{background:#002147;color:#D4AF37;font-weight:900;font-size:14pt}
    .totals-row.grand .t-label{color:rgba(212,175,55,.75);font-size:10pt}
    .t-label{font-weight:600;color:#374151;font-size:9pt}
    .t-value{font-weight:700;font-variant-numeric:tabular-nums}
    .sig-block{margin-top:32px;padding-top:20px;border-top:1.5px solid #E5E7EB}
    .sig-title{font-size:10pt;font-weight:800;color:#002147;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px}
    .sig-intro{font-size:8.5pt;color:#374151;margin-bottom:18px;line-height:1.5}
    .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px 48px}
    .sig-line{border-bottom:1.5px solid #374151;min-height:30px;margin-bottom:4px}
    .sig-label{font-size:8pt;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:.08em}
    .footer-note{margin-top:24px;font-size:8pt;color:#9CA3AF;text-align:center;border-top:1px solid #F3F4F6;padding-top:12px}
    @media print{body{padding:0}@page{margin:.65in;size:letter portrait}}
  </style>
</head>
<body>
  <div class="header">
    <div style="display:flex;align-items:center">
      <div class="brand-mark">OH</div>
      <div class="brand-info">
        <div class="brand-name">Orozco Homes</div>
        <div class="brand-sub">Design &amp; Construction · Virginia Beach, VA</div>
      </div>
    </div>
    <div class="doc-meta"><strong>Budget Estimate</strong>${dateStr}</div>
  </div>
  <h2>Project Parameters</h2>
  <div class="params-grid">
    <div class="param-item"><div class="param-label">Project Type</div><div class="param-value">${projectTypeName}</div></div>
    <div class="param-item"><div class="param-label">Spec Level</div><div class="param-value">${SPEC_LABELS[specLevel]}</div></div>
    ${paramRows}
  </div>
  ${specsTableHTML}
  <h2>Work Breakdown Structure</h2>
  <table>
    <thead><tr><th style="width:40px">WBS</th><th>Description</th><th class="amount">Amount</th></tr></thead>
    <tbody>${wbsRowsHTML}</tbody>
  </table>
  <div class="totals-block">
    <div class="totals-row sub"><span class="t-label">Direct Costs (Materials + Labor)</span><span class="t-value">$${Math.round(totals.directCosts).toLocaleString('en-US')}</span></div>
    <div class="totals-row sub"><span class="t-label">Overhead (${pctRates.overheadPct}%)</span><span class="t-value">$${Math.round(totals.overhead).toLocaleString('en-US')}</span></div>
    <div class="totals-row sub"><span class="t-label">Profit (${pctRates.profitPct}%)</span><span class="t-value">$${Math.round(totals.profit).toLocaleString('en-US')}</span></div>
    <div class="totals-row sub"><span class="t-label">Contingency (${pctRates.contingencyPct}%)</span><span class="t-value">$${Math.round(totals.contingency).toLocaleString('en-US')}</span></div>
    <div class="totals-row grand"><span class="t-label">TOTAL CLIENT PRICE</span><span class="t-value">$${Math.round(totals.totalClientPrice).toLocaleString('en-US')}</span></div>
  </div>
  <div class="sig-block">
    <div class="sig-title">Client Authorization</div>
    <p class="sig-intro">By signing below, the client acknowledges and approves the scope of work and pricing outlined in this estimate. This document constitutes a preliminary agreement pending execution of a formal contract.</p>
    <div class="sig-grid">
      <div><div class="sig-line"></div><div class="sig-label">Client Signature</div></div>
      <div><div class="sig-line"></div><div class="sig-label">Date</div></div>
      <div><div class="sig-line"></div><div class="sig-label">Client Printed Name</div></div>
      <div><div class="sig-line"></div><div class="sig-label">Contractor Representative</div></div>
    </div>
  </div>
  <div class="footer-note">Orozco Homes LLC · Virginia Beach, VA · orozcoventures@gmail.com · This estimate is valid for 30 days from the date above.</div>
  <script>window.onload=function(){window.print()}</script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  }

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
        <div className="flex items-center gap-2 shrink-0 mt-1">
          {hasOverrides && (
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
              style={{ backgroundColor: '#FFFBEB', color: '#D97706', border: '1px solid #FCD34D' }}
            >
              &#8635; Reset all overrides
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
            style={{ backgroundColor: '#002147', color: '#D4AF37' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#003166'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#002147'; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="12" y2="18"/><line x1="15" y1="15" x2="12" y2="18"/>
            </svg>
            Export Contract
          </button>
        </div>
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

      {/* Design Specs project selector */}
      <div className="rounded-2xl p-5 mb-5" style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.05)' }}>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-48">
            <p className="text-xs font-bold tracking-[0.14em] uppercase mb-1.5" style={{ color: '#065F46' }}>Link Design Specs</p>
            <select
              value={selectedProjId}
              onChange={(e) => setSelectedProjId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}
            >
              <option value="">— None (no design specs) —</option>
              {dbProjects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
            </select>
          </div>
          {approvedSpecs.length > 0 && (
            <div className="px-4 py-2.5 rounded-xl" style={{ backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7' }}>
              <p className="text-xs font-semibold" style={{ color: '#065F46' }}>{approvedSpecs.length} approved spec{approvedSpecs.length !== 1 ? 's' : ''}</p>
              <p className="text-base font-extrabold" style={{ color: '#065F46' }}>${designSpecsTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })} added to costs</p>
            </div>
          )}
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

      {/* Design Selections division */}
      <div className="space-y-3 mb-3">
        <DesignSpecsSection
          approvedSpecs={approvedSpecs}
          total={designSpecsTotal}
          isOpen={specsDivOpen}
          onToggle={() => setSpecsDivOpen((o) => !o)}
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
