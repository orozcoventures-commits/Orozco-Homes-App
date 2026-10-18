import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSelectOnFocus } from '../hooks/useSelectOnFocus';
import {
  REMODEL_CONFIGS,
  SPEC_LEVELS,
  SPEC_LABELS,
  getProjectConfig,
  computeBaseLineValues,
  DEFAULT_PCT_RATES,
  grossMarginAmount,
} from '../utils/remodelBudgetCalculator';
import { supabase } from '../lib/supabase';
import { selectProjects } from '../lib/projectList';
import ProjectOptions from '../components/ProjectOptions';
import BudgetVersions from '../components/BudgetVersions';
import { fetchCatalog, catalogUnitLabel } from '../lib/costCatalog';
import { useProject } from '../context/ProjectContext';
import { buildContractPrefill, buildProposalPrefill } from '../utils/contractPrefill';
import { starterScope, withoutLegacyGeneral, MAX_SCOPE } from '../utils/tradeScopes';
import { coiStatus, formatCoiDate, openCoi } from '../lib/subcontractorDirectory';
import { DESIGN_PERMIT_NEW_LINES } from '../utils/remodelDesignPermits';
import { PROPOSAL_FIELDS, fmtLongDate } from '../utils/proposalTemplate';
import { TRADES } from '../utils/trades';
import { loadLatestStandards } from '../utils/subStandards';
import { buildSnapshot, defaultTerms, sendProblem } from '../utils/subAgreement';
import TradeAgreement from '../components/TradeAgreement';

// ── Project type groupings ────────────────────────────────────────────────────

const PROJECT_GROUPS = [
  { label: 'Bathrooms',     types: ['bathroom-small', 'bathroom-medium', 'bathroom-large',
                                   'add-shower', 'tub-to-shower', 'bath-refresh', 'aging-in-place-bath', 'double-vanity'] },
  { label: 'Kitchens',      types: ['kitchen-small', 'kitchen-medium', 'kitchen-large', 'kitchen-refresh', 'kitchen-island'] },
  { label: 'Home Services', types: ['addition', 'portico', 'garage-conversion', 'full-renovation'] },
  // Partial renovations (remodelRenovationTypes.js)
  { label: 'Interior Renovations',  types: ['fireplace-builtin', 'wall-removal', 'flooring', 'attic-conversion', 'interior-painting',
                                           'popcorn-removal', 'trim-molding', 'laundry-mudroom', 'closet-buildout', 'home-office-builtins', 'staircase-remodel'] },
  { label: 'Exterior & Outdoor',    types: ['deck', 'screened-porch', 'window-replacement', 'exterior-door', 'siding'] },
  { label: 'Repairs & Building Health', types: ['crawlspace-encapsulation', 'water-damage-repair'] },
];

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
  'add-shower':               'Add a Shower',
  'tub-to-shower':            'Tub-to-Shower',
  'bath-refresh':             'Bath Refresh',
  'aging-in-place-bath':      'Accessible Bath',
  'double-vanity':            'Double Vanity',
  'kitchen-refresh':          'Kitchen Refresh',
  'kitchen-island':           'Kitchen Island',
  'fireplace-builtin':        'Fireplace → Built-In',
  'wall-removal':             'Wall Removal',
  'flooring':                 'Flooring',
  'attic-conversion':         'Attic Conversion',
  'interior-painting':        'Interior Painting',
  'popcorn-removal':          'Popcorn Ceiling',
  'trim-molding':             'Trim & Molding',
  'laundry-mudroom':          'Laundry / Mudroom',
  'closet-buildout':          'Closet Build-Out',
  'home-office-builtins':     'Office Built-Ins',
  'staircase-remodel':        'Staircase',
  'deck':                     'Deck',
  'screened-porch':           'Screened Porch',
  'window-replacement':       'Windows',
  'exterior-door':            'Exterior Door',
  'siding':                   'Siding',
  'crawlspace-encapsulation': 'Crawlspace',
  'water-damage-repair':      'Water Damage',
};

const DIV_COLORS = {
  '1': { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  '2': { color: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD' },
  '3': { color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0' },
  '4': { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  '5': { color: '#C2410C', bg: '#FFF7ED', border: '#FDBA74' },
  'F': { color: '#78350F', bg: '#FDF6EC', border: '#E7C9A0' },
  'S': { color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' },
  'P': { color: '#1E3A8A', bg: '#EFF6FF', border: '#BFDBFE' },
  'E': { color: '#A16207', bg: '#FEFCE8', border: '#FDE047' },
  'M': { color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
};

function divStyle(num) { return DIV_COLORS[num] ?? DIV_COLORS['4']; }

// The gross margin line is pricing, not a cost, so it has no "actual" spend
// and is left out of every Budget vs Actual comparison.
const isMarginLine = (item) => item.pctKey === 'profitPct';
const divCostBudget = (div, lineVals) =>
  div.items.reduce((s, item) => (isMarginLine(item) ? s : s + (lineVals[item.wbs] ?? 0)), 0);

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n)    { return '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function fmtD(n)   { return '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtPct(n) { return ((Number(n) || 0) * 100).toFixed(1) + '%'; }

function defaultInputs(projectTypeId) {
  const config = getProjectConfig(projectTypeId);
  if (!config) return {};
  return Object.fromEntries(config.inputFields.map((f) => [f.key, f.default]));
}

// ── Custom line items (migration 050) ─────────────────────────────────────────
// Each saved budget can rename or remove the built-in lines and add its own.
// layout = { added: [{ id, div, label }], labels: { wbs: label }, removed: [wbs],
//            splits: { wbs: { m, o } },     (cost breakdown %, see below)
//            allowances: { wbs: { on, amount } },  (client allowances, see below)
//            trades: { wbs: tradeKey },           (Subs & Materials view, see below)
//            scopes: { tradeKey: text },          (this budget's Scope of Work per trade)
//            subs: { tradeKey: { id, name } },    (who performs each trade — subcontractor_directory)
//            factors: { wbs: n },                 (price adjustment × built-in price, from "My template")
//            v: 3 }                               (layout version, see upgradeLayout)
const LAYOUT_VERSION = 3;
const EMPTY_LAYOUT = { added: [], labels: {}, removed: [], splits: {}, allowances: {}, trades: {}, scopes: {}, subs: {}, factors: {}, v: LAYOUT_VERSION };
const MAX_LABEL = 120;

// Added lines can be priced as quantity × unit cost (layout.added[].qty/unit/rate);
// the line amount is still kept in overrides_json, so everything else is unchanged.
const QTY_UNITS = [
  { key: 'sqft', label: 'sq ft' },
  { key: 'lf',   label: 'linear ft' },
  { key: 'ea',   label: 'each' },
  { key: 'hr',   label: 'hour' },
  { key: 'day',  label: 'day' },
];
const QTY_UNIT_KEYS = new Set(QTY_UNITS.map((u) => u.key));
const qtyUnitLabel = (key) => QTY_UNITS.find((u) => u.key === key)?.label ?? key;
const lineMeasure = (a) => {
  const qty = Number(a?.qty); const rate = Number(a?.rate);
  return QTY_UNIT_KEYS.has(a?.unit) && Number.isFinite(qty) && qty >= 0 && qty <= 1e6 && Number.isFinite(rate) && rate >= 0 && rate <= 1e7
    ? { qty, unit: a.unit, rate } : null;
};
const measureAmount = (m) => Math.round(m.qty * m.rate);

function normalizeLayout(raw) {
  const l = raw && typeof raw === 'object' ? raw : {};
  return {
    added: (Array.isArray(l.added) ? l.added : [])
      .filter((a) => a && typeof a.id === 'string' && typeof a.div === 'string')
      .map((a) => ({ id: a.id, div: a.div, label: String(a.label ?? '').slice(0, MAX_LABEL), ...(lineMeasure(a) ?? {}) })),
    labels: Object.fromEntries(Object.entries(l.labels && typeof l.labels === 'object' ? l.labels : {})
      .filter(([, v]) => typeof v === 'string' && v.trim())
      .map(([k, v]) => [k, v.slice(0, MAX_LABEL)])),
    removed: (Array.isArray(l.removed) ? l.removed : []).filter((w) => typeof w === 'string'),
    splits: Object.fromEntries(Object.entries(l.splits && typeof l.splits === 'object' ? l.splits : {})
      .filter(([, v]) => v && typeof v === 'object')
      .map(([k, v]) => [k, clampSplit(v)])),
    allowances: Object.fromEntries(Object.entries(l.allowances && typeof l.allowances === 'object' ? l.allowances : {})
      .filter(([, v]) => v && typeof v === 'object')
      .map(([k, v]) => [k, {
        on: !!v.on,
        amount: v.amount == null || v.amount === '' || !Number.isFinite(Number(v.amount)) ? null : Math.max(0, Math.round(Number(v.amount))),
      }])),
    trades: Object.fromEntries(Object.entries(l.trades && typeof l.trades === 'object' ? l.trades : {})
      .filter(([, v]) => TRADE_KEYS.has(v))),
    scopes: Object.fromEntries(Object.entries(l.scopes && typeof l.scopes === 'object' ? l.scopes : {})
      .filter(([k, v]) => TRADE_KEYS.has(k) && typeof v === 'string')
      .map(([k, v]) => [k, v.slice(0, MAX_SCOPE)])),
    subs: Object.fromEntries(Object.entries(l.subs && typeof l.subs === 'object' ? l.subs : {})
      .filter(([k, v]) => TRADE_KEYS.has(k) && v && Number.isInteger(v.id))
      .map(([k, v]) => [k, { id: v.id, name: String(v.name ?? '').slice(0, MAX_LABEL) }])),
    factors: Object.fromEntries(Object.entries(l.factors && typeof l.factors === 'object' ? l.factors : {})
      .filter(([, v]) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100)
      .map(([k, v]) => [k, Number(v)])),
    v: Number.isInteger(l.v) ? l.v : 1,
  };
}

// Budgets (and templates) saved before a new section keep their totals: its
// new lines start removed (Restore brings them back), and lines the user added
// for that section move into it.
//   v2: "Demo & Prep" split into Demo + Site Prep (new lines S.1–S.3); added
//       dumpster / porta potty / protection lines move from Demo to Site Prep.
//   v3: "Design & Permits" first in every type (new lines P.1–P.4); added
//       design / drawing / permit / engineering lines move into it.
const SITE_PREP_NEW_LINES = ['S.1', 'S.2', 'S.3'];
const SITE_PREP_RE = /dumpster|roll-?off|porta|portable toilet|protection|dust barrier|zip ?wall|ram ?board/i;
const DESIGN_PERMIT_RE = /design consult|architect|drawings\b|blueprint|permit|engineering\b/i;
function upgradeLayout(layout, cfg) {
  if (layout.v >= LAYOUT_VERSION || !cfg) return { ...layout, v: LAYOUT_VERSION };
  const divKeys = new Set(cfg.divisions.map((d) => d.key));
  const builtIn = new Set(cfg.divisions.flatMap((d) => d.items.map((it) => it.wbs)));
  const startRemoved = (wbsList, removed) => [...removed, ...wbsList.filter((w) => builtIn.has(w) && !removed.includes(w))];
  let { removed, added } = layout;
  if (layout.v < 2) {
    removed = startRemoved(SITE_PREP_NEW_LINES, removed);
    if (divKeys.has('divS')) added = added.map((a) => (a.div === 'div1' && SITE_PREP_RE.test(a.label) ? { ...a, div: 'divS' } : a));
  }
  if (layout.v < 3) {
    removed = startRemoved(DESIGN_PERMIT_NEW_LINES, removed);
    if (divKeys.has('divP')) added = added.map((a) => (DESIGN_PERMIT_RE.test(a.label) ? { ...a, div: 'divP' } : a));
  }
  return { ...layout, removed, added, v: LAYOUT_VERSION };
}

// ── Cost breakdown: Materials / Subcontract / Other (fees) ────────────────────
// Each line's budget is split by percentage. Subcontract is whatever is left
// after Materials and Other. Defaults come from the line's name and can be
// changed per line (saved in layout.splits). Internal only — never sent to
// proposals or contracts.
const COST_TYPES = [
  { key: 'm', label: 'Materials',    color: '#B45309' },
  { key: 's', label: 'Subcontract',  color: '#0369A1' },
  { key: 'o', label: 'Other / Fees', color: '#6B7280' },
];

function clampSplit(v) {
  const m = Math.min(100, Math.max(0, Math.round(Number(v?.m) || 0)));
  const o = Math.min(100 - m, Math.max(0, Math.round(Number(v?.o) || 0)));
  return { m, o };
}

// First matching rule wins: [pattern, materials %, other %].
const SPLIT_RULES = [
  [/permit|engineering|asbestos test|inspection/i,                                0, 100],
  [/dumpster|roll-?off|porta potty|portable toilet/i,                              0, 100],
  [/design consult|architect|drawings\b|permit plans|blueprint/i,               0, 100],
  [/demo|tear-out|remov|haul|scrape|debris/i,                                      5,  10],
  [/protection|masking|dust/i,                                                    30,   0],
  [/drying|dehumidification|mold treatment/i,                                     15,   0],
  [/final set|hookup|reconnect|^install|fixture swap|relocat|widen|adjustment/i, 10,   0],
  [/vanity|toilet|faucet|mirror|medicine|accessor|fixture|appliance|cabinet|countertop|desktop|hardware|\btub\b|sink|glass|door unit|vinyl window|dehumidifier \(|mini-split|pendant|lighting|grab bar|shelving|drawers|railing|newel|trim kit|lockset|screen door|closet|egress window|island cabinets/i, 75, 0],
  [/rough-in|plumbing|electrical|circuit|outlet|switch|hvac|drain|valve|gas|data/i, 30,  0],
  [/tile|backsplash|pan|waterproof|cement board/i,                               45,   0],
  [/floor|lvp|hardwood|subfloor/i,                                                55,   0],
  [/frame|framing|joist|beam|footing|post|sheathing|blocking|infill|structural|foundation|slab|shoring/i, 45, 0],
  [/drywall|skim|ceiling/i,                                                       30,   0],
  [/paint|stain|caulk/i,                                                          20,   0],
  [/insulation|spray foam|vapor barrier|housewrap|encapsul|seal/i,                50,   0],
  [/siding|roof|soffit|fascia|deck|trim|molding|baseboard|casing|crown|wainscot|bench|stair|tread|screen|window|door/i, 45, 0],
];
function defaultCostSplit(label) {
  const rule = SPLIT_RULES.find(([re]) => re.test(label ?? ''));
  return rule ? { m: rule[1], o: rule[2] } : { m: 50, o: 0 };
}
// ── Allowances ────────────────────────────────────────────────────────────────
// Material amounts the client sees on proposals and contracts for items they
// select (tile, vanity, lighting…). Already part of the price. Lines like
// these start as allowances; any line can be turned on or off, and the amount
// (default: the line's materials amount, rounded to $50) can be typed.
const ALLOWANCE_RE = /vanity|toilet|faucet|fixture|lighting|light fixture|mirror|medicine|accessor|cabinet|countertop|desktop|backsplash|tile|flooring|\bfloor\b|lvp|hardwood|appliance|hardware|\btub\b|\bsink\b|glass|door unit|vinyl window|decking|railing|pendant|shelving|trim kit|lockset|newel/i;
const NOT_ALLOWANCE_RE = /prep|patch|remov|demo|haul|install,|final|hookup|reconnect|rough|relocat|circuit|outlet|swap|blocking|end panels/i;
const isDefaultAllowance = (label) => ALLOWANCE_RE.test(label ?? '') && !NOT_ALLOWANCE_RE.test(label ?? '');
const roundTo50 = (n) => Math.round((Number(n) || 0) / 50) * 50;

const lineSplit = (item, layout) => layout.splits?.[item.wbs] ?? defaultCostSplit(item.originalLabel ?? item.label);
const splitAmounts = (value, sp) => ({ m: value * sp.m / 100, o: value * sp.o / 100, s: value * (100 - sp.m - sp.o) / 100 });

// ── Subs & Materials view: trades ─────────────────────────────────────────────
// Each line's Subcontract amount goes to one trade. The default comes from the
// line's name (then its section's name); it can be changed per line and is
// saved in layout.trades { wbs: tradeKey }. Trades: src/utils/trades.js.
const TRADE_KEYS = new Set(TRADES.map((t) => t.key));

// First matching rule wins: [pattern, trade].
const TRADE_RULES = [
  [/permit|engineering|asbestos test|inspection/i,                                 'other'],
  [/insulation [+&] drywall/i,                                                     'drywall'],
  [/install, flash/i,                                                              'windows'],
  [/demo|tear-out|haul|remov|scrape|debris|protection|masking|dust/i,              'demolition'],
  [/tile|backsplash|shower pan|waterproof|cement board/i,                          'tiling'],
  [/glass/i,                                                                       'other'],
  [/footing|slab|concrete|foundation|paver|masonry|structural column/i,            'concrete'],
  [/insulat|spray foam|vapor barrier|encapsul|seal vents/i,                        'insulation'],
  [/fram|joist|beam|header|blocking|sheathing|subfloor|structural|shoring|widen doorway|infill/i, 'framing'],
  [/hvac|mini-split|dehumidifier/i,                                                'hvac'],
  [/casing/i,                                                                      'carpentry'],
  [/window|door unit|exterior door|screen door|sill pan/i,                         'windows'],
  [/countertop|vanity/i,                                                           'carpentry'],
  [/plumb|drain|valve|faucet|toilet|\btub\b|sink|washer box|shower trim|handheld shower/i, 'plumbing'],
  [/electric|circuit|outlet|light|switch|gfci|exhaust fan|pendant|ceiling fan|data/i, 'electrical'],
  [/drywall|skim/i,                                                                'drywall'],
  [/paint|stain|caulk|prime|sealer/i,                                              'painting'],
  [/siding|housewrap|flashing|exterior finish|exterior trim|corners/i,             'siding'],
  [/roof|soffit|fascia|chimney|gutter/i,                                           'roofing'],
  [/floor|lvp|hardwood|transition|threshold|deck coating/i,                        'flooring'],
  [/cabinet|millwork|trim|baseboard|molding|crown|wainscot|accent wall|shelving|closet|drawer|built-in|bench|hardware|lockset|stair|tread|riser|newel|railing|baluster|desk|mirror|accessor|grab bar|end panel|beadboard|door|decking|package/i, 'carpentry'],
];
function defaultTrade(label, divLabel) {
  if (/^painting$/i.test(divLabel ?? '')) return 'painting';
  const byName = TRADE_RULES.find(([re]) => re.test(label ?? ''));
  if (byName) return byName[1];
  const byDiv = TRADE_RULES.find(([re]) => re.test(divLabel ?? ''));
  return byDiv ? byDiv[1] : 'other';
}
const lineTrade = (item, div, layout) => layout.trades?.[item.wbs] ?? defaultTrade(item.originalLabel ?? item.label, div.label);

const layoutIsEmpty = (l) => !l.added.length && !l.removed.length && !Object.keys(l.labels).length;

// The project type's built-in divisions with this budget's renamed, removed and
// added lines applied. Margin/contingency lines can't be renamed or removed.
function applyLayout(base, layout) {
  if (!base) return base;
  const removed = new Set(layout.removed);
  // Custom lines whose section no longer exists (e.g. it was merged into
  // Design & Permits) show in the first section instead of disappearing.
  const divKeys = new Set(base.divisions.map((d) => d.key));
  const firstKey = base.divisions[0]?.key;
  return {
    ...base,
    divisions: base.divisions.map((div) => {
      const lastNum = Math.max(0, ...div.items.map((it) => Number(String(it.badge ?? it.wbs).split('.')[1]) || 0));
      const builtIn = div.items.map((it) => ({
        ...it,
        badge: it.badge ?? it.wbs,
        originalLabel: it.label,
        label: it.unit !== 'pct' && layout.labels[it.wbs] ? layout.labels[it.wbs] : it.label,
      }));
      const added = layout.added.filter((a) => (divKeys.has(a.div) ? a.div : firstKey) === div.key).map((a, i) => ({
        wbs: a.id, label: a.label || 'New item', unit: 'flat', custom: true, badge: `${div.num}.${lastNum + i + 1}`, measure: lineMeasure(a),
      }));
      return {
        ...div,
        items: [...builtIn.filter((it) => !removed.has(it.wbs)), ...added],
        removedItems: builtIn.filter((it) => removed.has(it.wbs)),
      };
    }),
  };
}

const newLineId = () => `cu_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
const escHtml = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function allNonPctWbs(config) {
  const list = [];
  for (const div of config.divisions)
    for (const item of div.items)
      if (item.unit !== 'pct') list.push(item.wbs);
  return list;
}

// ── Input sub-components ──────────────────────────────────────────────────────

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

// Editable budgeted (estimated) cost cell
function DollarCell({ value, isOverridden, onChange, width = 110 }) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw]         = useState('');
  const inputRef = useSelectOnFocus(focused);
  return (
    <div className="relative shrink-0" style={{ width }}>
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: '#9CA3AF' }}>$</span>
      <input
        ref={inputRef} type="text" inputMode="numeric"
        value={focused ? raw : (Number(value) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
        onFocus={() => { setFocused(true); setRaw(String(Math.round(Number(value) || 0))); }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const d = e.target.value.replace(/[^0-9]/g, '');
          setRaw(d);
          onChange(Number(d) || 0);
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

// Editable actual-cost cell (blue tint when filled)
function ActualCell({ value, onChange, width = 110 }) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw]         = useState('');
  const inputRef = useSelectOnFocus(focused);
  const filled = (Number(value) || 0) > 0;
  return (
    <div className="relative shrink-0" style={{ width }}>
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: '#9CA3AF' }}>$</span>
      <input
        ref={inputRef} type="text" inputMode="numeric"
        value={focused ? raw : filled ? (Number(value) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }) : ''}
        placeholder="0"
        onFocus={() => { setFocused(true); setRaw(filled ? String(Math.round(Number(value))) : ''); }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const d = e.target.value.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
          setRaw(d);
          onChange(Number(d) || 0);
        }}
        className="w-full pl-6 pr-2 py-1.5 rounded-lg text-sm font-semibold text-right focus:outline-none transition-colors"
        style={{
          backgroundColor: filled ? '#F0F9FF' : '#F9FAFB',
          border: `1.5px solid ${filled ? '#BAE6FD' : '#E5E7EB'}`,
          color: '#002147',
        }}
      />
    </div>
  );
}

// Read-only variance badge: green/neutral if under budget, red if over
function VarianceCell({ variance, show, width = 86 }) {
  if (!show) return <div className="shrink-0" style={{ width }} />;
  const isOver = variance < 0;
  const abs    = Math.abs(variance);
  return (
    <div
      className="shrink-0 text-right text-xs font-bold px-2 py-1.5 rounded-lg"
      style={{
        width,
        backgroundColor: isOver ? '#FEF2F2' : '#F3F4F6',
        border: `1px solid ${isOver ? '#FECACA' : '#E5E7EB'}`,
        color: isOver ? '#DC2626' : '#6B7280',
      }}
    >
      {isOver ? '−' : '+'}{fmt(abs)}
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

// ── Line row — triple-column layout ──────────────────────────────────────────

// Actual costs are entered by type: Materials, Subcontract and Other / Fees
// (migrations 037 and 051). `labor` holds amounts entered under the earlier
// "Labor" box (counted as Subcontract); `unsplit` an older total saved before
// the split existed.
const ACTUAL_TYPES = [
  { key: 'material', label: 'Materials',    column: 'material_cost' },
  { key: 'sub',      label: 'Subcontract',  column: 'sub_cost'      },
  { key: 'other',    label: 'Other / Fees', column: 'other_cost'    },
];
const ACTUAL_COLUMNS = ['material_cost', 'labor_cost', 'sub_cost', 'other_cost'];
const EMPTY_PARTS = { material: 0, labor: 0, sub: 0, other: 0, unsplit: 0 };
const partsTotal = (p) => (p ? (p.material || 0) + (p.labor || 0) + (p.sub || 0) + (p.other || 0) + (p.unsplit || 0) : 0);

// Total actual for a line; click to open the by-type breakdown.
function ActualTotalButton({ total, open, onClick, width = 110 }) {
  const filled = total > 0;
  return (
    <button type="button" onClick={onClick} aria-expanded={open}
      className="shrink-0 flex items-center justify-between gap-1 pl-2.5 pr-2 py-1.5 rounded-lg text-sm font-semibold focus:outline-none"
      style={{
        width,
        backgroundColor: filled ? '#F0F9FF' : '#F9FAFB',
        border: `1.5px solid ${open ? '#0369A1' : filled ? '#BAE6FD' : '#E5E7EB'}`,
        color: filled ? '#002147' : '#9CA3AF',
      }}>
      <span className="text-xs" style={{ transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'none', color: '#0369A1' }}>▸</span>
      <span>{filled ? `$${Math.round(total).toLocaleString('en-US')}` : 'Add'}</span>
    </button>
  );
}

// By-type inputs for one line's actual cost.
function ActualBreakdown({ parts, showUnsplit, onPartChange }) {
  const p = parts ?? EMPTY_PARTS;
  const fields = [
    ...ACTUAL_TYPES,
    ...(p.labor > 0 ? [{ key: 'labor', label: 'Labor (earlier entry)' }] : []),
    ...(showUnsplit ? [{ key: 'unsplit', label: 'Not split (earlier total)' }] : []),
  ];
  return (
    <div className="px-4 pb-3 pt-1">
      <div className="ml-auto rounded-xl p-3 flex flex-wrap items-end gap-3 sm:justify-end"
        style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
        {fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-1">
            <span className="text-xs font-semibold" style={{ color: '#0369A1' }}>{f.label}</span>
            <ActualCell value={p[f.key]} onChange={(v) => onPartChange(f.key, v)} />
          </label>
        ))}
        <div className="flex flex-col gap-1 text-right" style={{ minWidth: 90 }}>
          <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>Total actual</span>
          <span className="py-1.5 text-sm font-extrabold" style={{ color: '#002147' }}>
            ${Math.round(partsTotal(p)).toLocaleString('en-US')}
          </span>
        </div>
      </div>
    </div>
  );
}

function LineName({ item, onRename, isAllowance }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  if (!editing) {
    return (
      <>
        <span className="flex-1 text-sm truncate min-w-0" style={{ color: '#374151' }} title={item.label}>
          {item.label}
          {item.custom && <span className="ml-1.5 text-xs font-semibold" style={{ color: '#9CA3AF' }}>(added)</span>}
          {isAllowance && <span className="ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded" style={{ color: '#7C3AED', backgroundColor: '#F5F3FF' }} title="Shown to the client as an allowance">Allowance</span>}
          {!item.custom && item.originalLabel !== item.label && (
            <span className="ml-1.5 text-xs" style={{ color: '#9CA3AF' }} title={`Originally: ${item.originalLabel}`}>(renamed)</span>
          )}
        </span>
        {onRename && (
          <button type="button" onClick={() => { setDraft(item.label); setEditing(true); }}
            className="shrink-0 w-6 h-6 rounded-md text-xs flex items-center justify-center"
            style={{ color: '#6B7280', border: '1px solid #E5E7EB', backgroundColor: '#fff' }}
            aria-label={`Rename ${item.label}`} title="Rename">✎</button>
        )}
      </>
    );
  }
  const save = () => { setEditing(false); const t = draft.trim(); if (t && t !== item.label) onRename(t); };
  return (
    <span className="flex-1 min-w-0 flex items-center gap-1">
      <input autoFocus value={draft} maxLength={MAX_LABEL} onChange={(e) => setDraft(e.target.value)}
        onBlur={save} onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        aria-label={`New name for ${item.label}`}
        className="flex-1 min-w-0 px-2 py-1 rounded-md text-sm focus:outline-none" style={{ border: '1.5px solid #D4AF37', color: '#002147' }} />
      {!item.custom && item.originalLabel !== item.label && (
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setEditing(false); onRename(item.originalLabel); }}
          className="shrink-0 text-xs underline" style={{ color: '#6B7280' }}>Original name</button>
      )}
    </span>
  );
}

function AddLineForm({ div, ds, onAdd, catalog }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('ls');          // 'ls' = lump sum, else a QTY_UNITS key
  const [qty, setQty] = useState('');
  const [rate, setRate] = useState('');
  const [pickedPct, setPickedPct] = useState(null);  // materials % from a catalog item
  const measured = unit !== 'ls';
  // Fill the form from a Cost Catalog item.
  const pick = (id) => {
    const item = (catalog ?? []).find((c) => c.id === id);
    if (!item) return;
    setName(item.name);
    if (item.unit === 'ls') { setUnit('ls'); setAmount(String(Math.round(Number(item.unit_cost) || 0))); }
    else { setUnit(item.unit); setRate(String(item.unit_cost)); if (!qty) setQty('1'); }
    setPickedPct(item.materials_pct ?? null);
  };
  const measure = measured ? lineMeasure({ unit, qty: Number(qty) || 0, rate: Number(rate) || 0 }) : null;
  const total = measure ? measureAmount(measure) : Number(amount.replace(/[^0-9]/g, '')) || 0;
  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim().slice(0, MAX_LABEL), total, measure, pickedPct == null ? null : { m: pickedPct, o: 0 });
    setName(''); setAmount(''); setQty(''); setRate(''); setUnit('ls'); setPickedPct(null); setOpen(false);
  };
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-full text-left px-4 py-2.5 text-xs font-bold"
        style={{ borderTop: '1px solid #F3F4F6', color: ds.color }}>
        + Add line item to {div.label}
      </button>
    );
  }
  const box = { border: '1.5px solid #E5E7EB', color: '#002147' };
  const num = (v) => v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 px-4 py-2.5" style={{ borderTop: '1px solid #F3F4F6', backgroundColor: '#FAFAF8' }}>
      {catalog?.length > 0 && (
        <select value="" onChange={(e) => pick(e.target.value)} aria-label={`From catalog for ${div.label}`}
          className="w-full sm:w-auto px-2 py-1.5 rounded-lg text-xs font-semibold focus:outline-none"
          style={{ border: '1.5px solid #FDE68A', color: '#92400E', backgroundColor: '#FFFBEB' }}>
          <option value="">From catalog…</option>
          {[...new Set(catalog.map((c) => c.category || 'Other'))].map((cat) => (
            <optgroup key={cat} label={cat}>
              {catalog.filter((c) => (c.category || 'Other') === cat).map((c) => (
                <option key={c.id} value={c.id}>{c.name} — ${Number(c.unit_cost).toLocaleString('en-US')}{c.unit !== 'ls' ? ` / ${catalogUnitLabel(c.unit)}` : ''}</option>
              ))}
            </optgroup>
          ))}
        </select>
      )}
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={MAX_LABEL}
        placeholder="Item name (e.g. Heated floor)" aria-label={`New line item name for ${div.label}`}
        className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg text-sm focus:outline-none" style={box} />
      <select value={unit} onChange={(e) => setUnit(e.target.value)} aria-label={`Pricing for ${div.label} line`}
        className="px-2 py-1.5 rounded-lg text-xs font-semibold focus:outline-none" style={{ ...box, backgroundColor: '#fff' }}>
        <option value="ls">Lump sum</option>
        {QTY_UNITS.map((u) => <option key={u.key} value={u.key}>Per {u.label}</option>)}
      </select>
      {measured ? (
        <>
          <input value={qty} onChange={(e) => setQty(num(e.target.value))} inputMode="decimal" placeholder="Qty"
            aria-label={`New line item quantity for ${div.label}`}
            className="w-20 px-2 py-1.5 rounded-lg text-sm font-semibold text-right focus:outline-none" style={box} />
          <span className="text-xs" style={{ color: '#6B7280' }}>{qtyUnitLabel(unit)} ×</span>
          <div className="relative shrink-0" style={{ width: 96 }}>
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: '#9CA3AF' }}>$</span>
            <input value={rate} onChange={(e) => setRate(num(e.target.value))} inputMode="decimal" placeholder="Unit cost"
              aria-label={`New line item unit cost for ${div.label}`}
              className="w-full pl-6 pr-2 py-1.5 rounded-lg text-sm font-semibold text-right focus:outline-none" style={box} />
          </div>
          <span className="text-sm font-bold" style={{ color: '#002147' }} data-testid="add-line-total">= {fmt(total)}</span>
        </>
      ) : (
        <div className="relative shrink-0" style={{ width: 110 }}>
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: '#9CA3AF' }}>$</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric"
            placeholder="0" aria-label={`New line item amount for ${div.label}`}
            className="w-full pl-6 pr-2 py-1.5 rounded-lg text-sm font-semibold text-right focus:outline-none" style={box} />
        </div>
      )}
      <button type="submit" disabled={!name.trim()} className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
        style={{ backgroundColor: '#002147', color: '#D4AF37' }}>Add</button>
      <button type="button" onClick={() => setOpen(false)} className="px-2 py-1.5 text-xs font-semibold" style={{ color: '#6B7280' }}>Cancel</button>
    </form>
  );
}

// Quantity × unit cost under an added line. Editing either updates the amount;
// "Lump sum" drops the quantity and keeps the amount.
function QtyRow({ item, measure, onMeasure }) {
  const [draft, setDraft] = useState(null);   // { qty, rate } strings while editing
  const shown = draft ?? { qty: String(measure.qty), rate: String(measure.rate) };
  const num = (v) => v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
  const commit = (next) => {
    setDraft(null);
    onMeasure({ unit: measure.unit, qty: Number(next.qty) || 0, rate: Number(next.rate) || 0 });
  };
  const change = (key, v) => {
    const next = { ...shown, [key]: num(v) };
    setDraft(next);
    onMeasure({ unit: measure.unit, qty: Number(next.qty) || 0, rate: Number(next.rate) || 0 });
  };
  const box = { border: '1px solid #E5E7EB', color: '#002147', backgroundColor: '#fff' };
  return (
    <div className="flex flex-wrap items-center gap-1.5 pl-14 pr-4 pb-2 -mt-1 text-xs" style={{ color: '#6B7280' }} data-testid={`qty-${item.wbs}`}>
      <input value={shown.qty} onChange={(e) => change('qty', e.target.value)} onBlur={() => commit(shown)} inputMode="decimal"
        aria-label={`Quantity for ${item.label}`} className="w-16 px-1.5 py-0.5 rounded-md font-semibold text-right focus:outline-none" style={box} />
      <span>{qtyUnitLabel(measure.unit)} ×</span>
      <span>$</span>
      <input value={shown.rate} onChange={(e) => change('rate', e.target.value)} onBlur={() => commit(shown)} inputMode="decimal"
        aria-label={`Unit cost for ${item.label}`} className="w-20 px-1.5 py-0.5 rounded-md font-semibold text-right focus:outline-none" style={box} />
      <span>= <b style={{ color: '#002147' }}>{fmt(measureAmount({ qty: Number(shown.qty) || 0, rate: Number(shown.rate) || 0 }))}</b></span>
      <button type="button" onClick={() => onMeasure(null)} className="ml-2 underline" title="Keep the amount, drop the quantity">Lump sum</button>
    </div>
  );
}

// One line's Materials / Subcontract / Other split (shown with the breakdown switch).
function SplitRow({ value, split, isDefault, onChange, onReset, allowance }) {
  const amt = splitAmounts(value, split);
  const pct = { m: split.m, s: 100 - split.m - split.o, o: split.o };
  const box = (key, label) => (
    <input type="number" min={0} max={100} value={pct[key]} aria-label={`${label} %`}
      onChange={(e) => onChange({ ...split, [key]: Number(e.target.value) || 0 })}
      className="w-12 px-1.5 py-0.5 rounded-md text-xs font-semibold text-right focus:outline-none"
      style={{ border: '1px solid #E5E7EB', color: '#002147', backgroundColor: '#fff' }} />
  );
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 px-4 pb-2 -mt-1 text-xs" style={{ color: '#6B7280' }}>
      {COST_TYPES.map((t) => (
        <span key={t.key} className="flex items-center gap-1">
          <span className="font-semibold" style={{ color: t.color }}>{t.label}</span>
          {t.key === 's' ? <span className="w-12 text-right font-semibold" style={{ color: '#002147' }}>{pct.s}</span> : box(t.key, t.label)}
          <span>%</span>
          <span className="font-bold" style={{ color: '#002147', minWidth: 56, textAlign: 'right' }}>{fmt(amt[t.key])}</span>
        </span>
      ))}
      {!isDefault && (
        <button type="button" onClick={onReset} className="underline font-semibold" style={{ color: '#D97706' }} title="Back to the default split">↻ default</button>
      )}
      {allowance && (
        <span className="flex items-center gap-1.5 pl-3" style={{ borderLeft: '1px solid #E5E7EB' }}>
          <label className="flex items-center gap-1 font-semibold" style={{ color: '#7C3AED' }}>
            <input type="checkbox" checked={allowance.on} onChange={(e) => allowance.onToggle(e.target.checked)} style={{ accentColor: '#7C3AED' }} />
            Allowance
          </label>
          {allowance.on && (
            <>
              <span>$</span>
              <input type="text" inputMode="numeric" value={allowance.amount.toLocaleString('en-US')} aria-label="Allowance amount"
                onChange={(e) => allowance.onAmount(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                className="w-20 px-1.5 py-0.5 rounded-md text-xs font-semibold text-right focus:outline-none"
                style={{ border: '1px solid #DDD6FE', color: '#002147', backgroundColor: '#fff' }} />
              {allowance.isAuto
                ? <span title="Materials amount, rounded">auto</span>
                : <button type="button" onClick={() => allowance.onAmount(null)} className="underline font-semibold" style={{ color: '#7C3AED' }} title="Use the materials amount">↻ auto</button>}
            </>
          )}
        </span>
      )}
    </div>
  );
}

function LineRow({ item, divStyle: ds, value, isOverridden, onChange, onReset, pctRate, onPctChange, isFirst, actualParts, showUnsplit, actualOpen, onToggleActual, onActualPartChange, showActuals, actualsDisabled, onRename, onRemove, breakdown, isAllowance, onMeasure }) {
  const actual = partsTotal(actualParts);
  const variance = value - actual;
  const hasActual = actual > 0;

  return (
    <div style={{ borderTop: `1px solid ${isFirst ? ds.border : '#F3F4F6'}` }}>
    <div className="flex items-center gap-2 px-4 py-2.5">
      {/* WBS badge */}
      <span className="text-xs font-bold w-8 text-center py-0.5 rounded shrink-0"
        style={{ backgroundColor: ds.bg, color: ds.color }}>
        {item.badge ?? item.wbs}
      </span>

      {/* Label, with rename */}
      <LineName item={item} onRename={onRename} isAllowance={isAllowance} />
      {onMeasure && !item.measure && (
        <button type="button" onClick={() => onMeasure({ unit: 'sqft', qty: 1, rate: value })}
          className="shrink-0 text-xs font-semibold underline hidden sm:inline" style={{ color: '#9CA3AF' }}
          title="Price this line as quantity × unit cost">Qty</button>
      )}

      {/* Pct rate input (desktop only) */}
      {item.unit === 'pct' && item.pctKey && (
        <PctCell value={pctRate ?? 0} onChange={(v) => onPctChange(item.pctKey, v)} label={item.pctLabel} />
      )}

      {/* Override reset pill (desktop only) */}
      {isOverridden ? (
        <button onClick={onReset} title="Reset to formula value"
          className="shrink-0 hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: '#FFFBEB', color: '#D97706', border: '1px solid #FCD34D' }}>
          &#8635; reset
        </button>
      ) : (
        <div className="w-14 shrink-0 hidden sm:block" />
      )}

      {/* Budgeted */}
      <DollarCell value={value} isOverridden={isOverridden} onChange={onChange} />

      {/* Remove line */}
      {onRemove ? (
        <button type="button" onClick={onRemove} aria-label={`Remove ${item.label}`} title="Remove line"
          className="shrink-0 w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center"
          style={{ color: '#DC2626', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>✕</button>
      ) : <div className="w-6 shrink-0" />}

      {/* Actual (desktop) — the margin line has no actual spend */}
      {showActuals && (
        <div className="hidden sm:block">
          {actualsDisabled
            ? <div className="shrink-0 text-right text-xs pr-2" style={{ width: 110, color: '#9CA3AF' }} title="The gross margin is pricing, not a cost">n/a</div>
            : <ActualTotalButton total={actual} open={actualOpen} onClick={onToggleActual} />}
        </div>
      )}

      {/* Variance (desktop) */}
      {showActuals && (
        <div className="hidden sm:block">
          <VarianceCell variance={variance} show={hasActual && !actualsDisabled} />
        </div>
      )}
    </div>

    {/* Actual + variance on phones, under the budget amount */}
    {showActuals && !actualsDisabled && (
      <div className="sm:hidden flex items-center justify-end gap-2 px-4 pb-2.5 -mt-1">
        <span className="text-xs font-semibold" style={{ color: '#0369A1' }}>Actual</span>
        <ActualTotalButton total={actual} open={actualOpen} onClick={onToggleActual} />
        <VarianceCell variance={variance} show={hasActual} />
      </div>
    )}

    {onMeasure && item.measure && <QtyRow item={item} measure={item.measure} onMeasure={onMeasure} />}
    {breakdown && item.unit !== 'pct' && <SplitRow value={value} {...breakdown} />}

    {showActuals && actualOpen && !actualsDisabled && (
      <ActualBreakdown parts={actualParts} showUnsplit={showUnsplit}
        onPartChange={(key, v) => onActualPartChange(item.wbs, key, v)} />
    )}
    </div>
  );
}

// ── Summary card ──────────────────────────────────────────────────────────────

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
        style={{ color: highlight ? '#D4AF37' : (color ?? '#002147') }}>{value}</p>
      {sub && (
        <p className="text-xs font-medium"
          style={{ color: highlight ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>{sub}</p>
      )}
    </div>
  );
}

// ── Design Specs section ──────────────────────────────────────────────────────

function DesignSpecsSection({ approvedSpecs, total, isOpen, onToggle }) {
  if (approvedSpecs.length === 0) return null;
  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={{ border: '1.5px solid #6EE7B7' }}>
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 focus:outline-none"
        style={{ backgroundColor: '#ECFDF5' }}>
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0"
            style={{ backgroundColor: '#065F46', color: '#fff' }}>DS</span>
          <span className="text-sm font-bold text-left" style={{ color: '#065F46' }}>Design Selections (Approved)</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>{approvedSpecs.length} items</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-extrabold" style={{ color: '#065F46' }}>
            ${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#065F46"
            strokeWidth="2" strokeLinecap="round"
            style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <polyline points="1 4 6 8 11 4" />
          </svg>
        </div>
      </button>
      {isOpen && (
        <div style={{ backgroundColor: '#fff' }}>
          {approvedSpecs.map((spec, i) => (
            <div key={spec.id}
              className="flex items-center gap-3 px-4 py-2.5"
              style={{ borderTop: i === 0 ? '1px solid #6EE7B7' : '1px solid #F3F4F6' }}>
              <span className="text-xs font-bold w-8 text-center py-0.5 rounded shrink-0"
                style={{ backgroundColor: '#ECFDF5', color: '#065F46' }}>DS</span>
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
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid #6EE7B7', backgroundColor: '#ECFDF5' }}>
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#065F46' }}>Design Selections Total</span>
            <span className="text-sm font-extrabold" style={{ color: '#065F46' }}>
              ${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Approved change orders section ───────────────────────────────────────────

const coDelta = (co) => (Number(co.new_cost) || 0) - (Number(co.original_cost) || 0);
const fmtSigned = (n) => `${n < 0 ? '−' : '+'}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const fmtCoDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null);

function ChangeOrdersSection({ changeOrders, total, cost, margin, marginPct, isOpen, onToggle }) {
  if (changeOrders.length === 0) return null;
  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={{ border: '1.5px solid #FCD34D' }}>
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 focus:outline-none"
        style={{ backgroundColor: '#FFFBEB' }}>
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0"
            style={{ backgroundColor: '#92400E', color: '#fff' }}>CO</span>
          <span className="text-sm font-bold text-left" style={{ color: '#92400E' }}>Approved Change Orders</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>{changeOrders.length} {changeOrders.length === 1 ? 'order' : 'orders'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-extrabold" style={{ color: '#92400E' }}>{fmtSigned(total)}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#92400E"
            strokeWidth="2" strokeLinecap="round"
            style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <polyline points="1 4 6 8 11 4" />
          </svg>
        </div>
      </button>
      {isOpen && (
        <div style={{ backgroundColor: '#fff' }}>
          {changeOrders.map((co, i) => {
            const delta = coDelta(co);
            const approved = [fmtCoDate(co.approved_at), co.approved_by].filter(Boolean).join(' · ');
            return (
              <div key={co.id}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderTop: i === 0 ? '1px solid #FCD34D' : '1px solid #F3F4F6' }}>
                <span className="text-xs font-bold w-8 text-center py-0.5 rounded shrink-0"
                  style={{ backgroundColor: '#FFFBEB', color: '#92400E' }}>CO</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: '#374151' }}>
                    {co.title}
                    {co.category && <span className="text-xs ml-2" style={{ color: '#9CA3AF' }}>{co.category}</span>}
                  </p>
                  {approved && <p className="text-xs" style={{ color: '#9CA3AF' }}>Approved {approved}</p>}
                </div>
                <span className="text-sm font-semibold shrink-0" style={{ color: delta < 0 ? '#059669' : '#92400E' }}>
                  {fmtSigned(delta)}
                </span>
              </div>
            );
          })}
          <div className="px-4 py-3" style={{ borderTop: '1px solid #FCD34D', backgroundColor: '#FFFBEB' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wide" style={{ color: '#92400E' }}>Approved Change Orders Total</span>
              <span className="text-sm font-extrabold" style={{ color: '#92400E' }}>{fmtSigned(total)}</span>
            </div>
            <p className="text-xs mt-1" style={{ color: '#B45309' }}>
              Client price changes exactly as approved: {fmtSigned(cost)} to direct cost, {fmtSigned(margin)} to gross margin ({marginPct}%).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

// ── Subs & Materials view ─────────────────────────────────────────────────────
// The same direct costs, grouped the way a GC buys them: work bought from
// subcontractors (by trade) and materials bought directly (by section).
// Directory subcontractors that usually do each trade (matched on their
// trade/specialty text). They are listed first in the "Performed by" picker.
const TRADE_MATCH = {
  demolition: /demo|haul|junk|debris/i,
  concrete:   /concrete|foundation|mason|footing/i,
  framing:    /fram|carpent|structur/i,
  roofing:    /roof/i,
  windows:    /window|door/i,
  siding:     /siding|exterior|gutter/i,
  plumbing:   /plumb/i,
  hvac:       /hvac|heat|air cond|mechanical|mini-split/i,
  electrical: /electric/i,
  insulation: /insulat|spray foam/i,
  drywall:    /drywall|sheetrock/i,
  tiling:     /tile/i,
  flooring:   /floor/i,
  carpentry:  /carpent|cabinet|trim|finish|millwork|countertop/i,
  painting:   /paint/i,
};
const subMatchesTrade = (sub, trade) => !!TRADE_MATCH[trade]?.test(`${sub.service ?? ''} ${sub.specialty ?? ''}`);
const subLabel = (sub) => sub.display_name || sub.company || sub.name || sub.service || `#${sub.id}`;

// Orozco Homes details (the same defaults as proposals and contracts).
const COMPANY = Object.fromEntries(PROPOSAL_FIELDS.filter((f) => f.section === 'company').map((f) => [f.key, f.defaultValue ?? '']));
const companyInfo = () => ({
  name: 'Orozco Homes', rep: COMPANY.company_rep_name, title: COMPANY.company_rep_title,
  license: COMPANY.company_license, phone: COMPANY.company_phone, email: COMPANY.company_email,
});

// COI status with a 30-day warning: 'active' | 'expiring' | 'expired' | 'none'.
function coiState(expiresOn) {
  const status = coiStatus(expiresOn);
  if (status !== 'active') return status;
  const [y, m, d] = expiresOn.split('-').map(Number);
  const days = (new Date(y, m - 1, d) - new Date()) / 86400000;
  return days <= 30 ? 'expiring' : 'active';
}
const COI_CHIP = {
  active:   { label: 'COI active',        color: '#166534', bg: '#F0FDF4', border: '#BBF7D0' },
  expiring: { label: 'COI expires soon',  color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
  expired:  { label: 'COI expired',       color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
  none:     { label: 'No COI on file',    color: '#6B7280', bg: '#F9F8F6', border: '#E8E6E1' },
};

// "Performed by" for one trade: pick a subcontractor from the directory and
// see their COI status. Saved with the budget (layout_json.subs).
function TradeSub({ trade, subs }) {
  const pick = subs.assigned(trade.key);           // { id, name } | undefined
  const sub = pick ? subs.list?.find((s) => s.id === pick.id) : null;
  const matching = (subs.list ?? []).filter((s) => subMatchesTrade(s, trade.key));
  const others = (subs.list ?? []).filter((s) => !subMatchesTrade(s, trade.key));
  const state = sub ? coiState(sub.coi_expires_on) : null;
  const chip = state ? COI_CHIP[state] : null;
  const id = `sub-${trade.key}`;
  const opt = (s) => (
    <option key={s.id} value={s.id}>{subLabel(s)}{s.service ? ` — ${s.service}` : ''}{coiState(s.coi_expires_on) === 'expired' ? ' (COI expired)' : ''}</option>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-2 text-xs" style={{ borderTop: '1px solid #F3F4F6' }}>
      <label htmlFor={id} className="font-bold" style={{ color: '#0369A1' }}>Performed by</label>
      <select id={id} value={pick ? String(pick.id) : ''} disabled={!subs.list}
        onChange={(e) => {
          const s = subs.list.find((x) => String(x.id) === e.target.value);
          subs.onAssign(trade.key, s ? { id: s.id, name: subLabel(s) } : null);
        }}
        className="text-xs rounded-lg px-2 py-1 max-w-full focus:outline-none focus:ring-2 focus:ring-sky-300"
        style={{ border: '1px solid #D1D5DB', color: pick ? '#002147' : '#6B7280', fontWeight: pick ? 700 : 400, backgroundColor: '#fff' }}>
        <option value="">{subs.list ? 'Not assigned' : 'Loading subcontractors…'}</option>
        {pick && !sub && subs.list && <option value={String(pick.id)}>{pick.name} (no longer in directory)</option>}
        {matching.length > 0 && <optgroup label={`${trade.label} subcontractors`}>{matching.map(opt)}</optgroup>}
        {others.length > 0 && <optgroup label={matching.length ? 'All other subcontractors' : 'Subcontractors'}>{others.map(opt)}</optgroup>}
      </select>
      {chip && (
        <span className="px-2 py-0.5 rounded-lg font-semibold" data-coi-state={state}
          style={{ color: chip.color, backgroundColor: chip.bg, border: `1px solid ${chip.border}` }}>
          {chip.label}{sub.coi_expires_on ? ` · ${state === 'expired' ? 'expired' : 'expires'} ${formatCoiDate(sub.coi_expires_on)}` : ''}
        </span>
      )}
      {sub?.coi_file_path && (
        <button type="button" onClick={() => openCoi(sub.coi_file_path)} className="font-semibold hover:underline focus:outline-none" style={{ color: '#002147' }}>
          View COI
        </button>
      )}
      {sub?.phone?.[0] && <a href={`tel:${sub.phone[0]}`} className="hover:underline" style={{ color: '#6B7280' }}>{sub.phone[0]}</a>}
      {sub?.email?.[0] && <a href={`mailto:${sub.email[0]}`} className="hover:underline" style={{ color: '#6B7280' }}>{sub.email[0]}</a>}
      {pick && !sub && subs.list && (
        <span style={{ color: '#B45309' }}>This subcontractor was removed from the directory — pick another.</span>
      )}
    </div>
  );
}

// Bids for one trade (migration 059): quotes received from subcontractors,
// compared with the trade's budget; "Select" marks the chosen one.
function TradeBids({ trade, subs, bids }) {
  const [open, setOpen] = useState(false);
  const [subPick, setSubPick] = useState('');
  const [otherName, setOtherName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const list = bids.forTrade(trade.key);
  const selected = list.find((b) => b.selected);
  const vs = (amt) => {
    const d = Number(amt) - trade.total;
    return { d, text: `${d > 0 ? '+' : d < 0 ? '−' : ''}${fmt(Math.abs(d))} ${d > 0 ? 'over' : d < 0 ? 'under' : 'on'} budget`, color: d > 0 ? '#B45309' : '#059669' };
  };
  const matching = (subs.list ?? []).filter((s) => subMatchesTrade(s, trade.key));
  const others = (subs.list ?? []).filter((s) => !subMatchesTrade(s, trade.key));
  const id = `bids-${trade.key}`;
  const submit = async (e) => {
    e.preventDefault();
    const sub = (subs.list ?? []).find((s) => String(s.id) === subPick);
    const name = sub ? subLabel(sub) : otherName.trim();
    const amt = Number(String(amount).replace(/[^0-9.]/g, ''));
    if (!name) { bids.setMsg({ trade: trade.key, status: 'error', text: 'Pick a subcontractor or type a name.' }); return; }
    if (!Number.isFinite(amt) || amt <= 0) { bids.setMsg({ trade: trade.key, status: 'error', text: 'Enter the bid amount.' }); return; }
    setBusy(true);
    const ok = await bids.add({ trade_key: trade.key, sub_id: sub ? sub.id : null, sub_name: name.slice(0, 120), amount: Math.round(amt * 100) / 100, bid_date: date || null, notes: notes.trim().slice(0, 500) });
    setBusy(false);
    if (ok) { setSubPick(''); setOtherName(''); setAmount(''); setDate(''); setNotes(''); }
  };
  const box = { border: '1px solid #D1D5DB', color: '#002147', backgroundColor: '#fff' };
  const msg = bids.msg?.trade === trade.key ? bids.msg : null;
  return (
    <div className="px-5 py-2" style={{ borderTop: '1px solid #F3F4F6', backgroundColor: open ? '#FAFDFF' : '#fff' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={id}
        className="flex flex-wrap items-center gap-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-300 rounded" style={{ color: '#0369A1' }}>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'none' }} aria-hidden="true"><polyline points="4 1 8 6 4 11" /></svg>
        Bids{list.length ? ` (${list.length})` : ''}
        {selected && (
          <span className="font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#ECFDF5', color: '#065F46' }}>
            Selected: {selected.sub_name} {fmt(selected.amount)} · <span style={{ color: vs(selected.amount).color }}>{vs(selected.amount).text}</span>
          </span>
        )}
      </button>
      {open && (
        <div id={id} className="mt-2 text-xs">
          {bids.missing ? (
            <p role="alert" className="font-semibold" style={{ color: '#DC2626' }}>Bids are not set up yet — run migration 059 in Supabase first.</p>
          ) : (
            <>
              {list.length > 0 && (
                <table className="w-full mb-2" data-testid={`bids-table-${trade.key}`}>
                  <tbody>
                    {list.map((b) => {
                      const v = vs(b.amount);
                      return (
                        <tr key={b.id} style={{ borderTop: '1px solid #E0F2FE' }}>
                          <td className="py-1.5 font-semibold" style={{ color: '#002147' }}>
                            {b.sub_name}{b.selected && <span className="ml-1.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: '#ECFDF5', color: '#065F46' }}>Selected</span>}
                            {b.notes && <span className="block font-normal" style={{ color: '#9CA3AF' }}>{b.notes}</span>}
                          </td>
                          <td className="py-1.5" style={{ color: '#6B7280' }}>{b.bid_date ? formatCoiDate(b.bid_date) : ''}</td>
                          <td className="py-1.5 text-right font-bold" style={{ color: '#002147' }}>{fmt(b.amount)}</td>
                          <td className="py-1.5 text-right font-semibold" style={{ color: v.color }}>{v.text}</td>
                          <td className="py-1.5 text-right whitespace-nowrap">
                            {!b.selected && (
                              <button type="button" onClick={() => bids.select(b)} className="ml-2 font-bold underline" style={{ color: '#0369A1' }}
                                aria-label={`Select bid from ${b.sub_name}`}>Select</button>
                            )}
                            <button type="button" onClick={() => bids.remove(b)} className="ml-2 underline" style={{ color: '#9CA3AF' }}
                              aria-label={`Delete bid from ${b.sub_name}`}>Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
                <select value={subPick} onChange={(e) => setSubPick(e.target.value)} aria-label={`Bid subcontractor for ${trade.label}`}
                  className="px-2 py-1 rounded-md max-w-[220px] focus:outline-none" style={box}>
                  <option value="">Other (type a name)…</option>
                  {matching.length > 0 && <optgroup label={`${trade.label} subcontractors`}>{matching.map((s) => <option key={s.id} value={s.id}>{subLabel(s)}</option>)}</optgroup>}
                  {others.length > 0 && <optgroup label="All other subcontractors">{others.map((s) => <option key={s.id} value={s.id}>{subLabel(s)}</option>)}</optgroup>}
                </select>
                {!subPick && (
                  <input value={otherName} onChange={(e) => setOtherName(e.target.value)} maxLength={120} placeholder="Company name"
                    aria-label={`Bid company name for ${trade.label}`} className="w-40 px-2 py-1 rounded-md focus:outline-none" style={box} />
                )}
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9CA3AF' }}>$</span>
                  <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="Amount"
                    aria-label={`Bid amount for ${trade.label}`} className="w-28 pl-5 pr-2 py-1 rounded-md text-right focus:outline-none" style={box} />
                </div>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label={`Bid date for ${trade.label}`}
                  className="px-2 py-1 rounded-md focus:outline-none" style={box} />
                <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Notes (what's included)"
                  aria-label={`Bid notes for ${trade.label}`} className="flex-1 min-w-[140px] px-2 py-1 rounded-md focus:outline-none" style={box} />
                <button type="submit" disabled={busy} className="px-3 py-1 rounded-md font-bold disabled:opacity-60" style={{ backgroundColor: '#0369A1', color: '#fff' }}>Add bid</button>
              </form>
              {msg && <p role={msg.status === 'error' ? 'alert' : 'status'} className="mt-1.5 font-semibold" style={{ color: msg.status === 'error' ? '#DC2626' : '#059669' }}>{msg.text}</p>}
              <p className="mt-1.5" style={{ color: '#9CA3AF' }}>
                Budget for {trade.label}: <b style={{ color: '#002147' }}>{fmt(trade.total)}</b>. Selecting a bid from your directory also sets "Performed by". Bids don't change the estimate.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Scope of Work for one trade: this budget's copy, or the default (saved
// default, else the built-in starter). Edits save with the budget.
function TradeScope({ trade, scope }) {
  const [open, setOpen] = useState(false);
  const text = scope.of(trade.key);
  const edited = scope.isEdited(trade.key);
  const save = scope.saveState[trade.key];
  const id = `scope-${trade.key}`;
  return (
    <div className="px-5 py-2" style={{ borderTop: '1px solid #F3F4F6', backgroundColor: open ? '#FAFDFF' : '#fff' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={id}
        className="flex items-center gap-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-300 rounded" style={{ color: '#0369A1' }}>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'none' }} aria-hidden="true"><polyline points="4 1 8 6 4 11" /></svg>
        Scope of work
        <span className="font-semibold px-1.5 py-0.5 rounded" style={edited
          ? { backgroundColor: '#E0F2FE', color: '#0369A1' }
          : { backgroundColor: '#F3F4F6', color: '#6B7280' }}>
          {edited ? 'Edited for this budget' : (scope.hasSavedDefault(trade.key) ? 'My default' : 'Starter')}
        </span>
      </button>
      {open && (
        <div id={id} className="mt-2">
          <label className="sr-only" htmlFor={`${id}-text`}>Scope of work for {trade.label}</label>
          <textarea id={`${id}-text`} value={text} maxLength={MAX_SCOPE} rows={9}
            onChange={(e) => scope.onChange(trade.key, e.target.value)}
            className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300"
            style={{ border: '1px solid #D1D5DB', color: '#374151', lineHeight: 1.5 }} />
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <button type="button" onClick={() => scope.onSaveDefault(trade.key)} disabled={save?.status === 'saving'}
              className="px-3 py-1.5 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-60"
              style={{ backgroundColor: '#0369A1', color: '#fff' }}>
              {save?.status === 'saving' ? 'Saving…' : 'Save as my default scope'}
            </button>
            {edited && (
              <button type="button" onClick={() => scope.onReset(trade.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-300"
                style={{ border: '1px solid #D1D5DB', color: '#4B5563', backgroundColor: '#fff' }}>
                Use my default
              </button>
            )}
            {save?.msg && (
              <span role={save.status === 'error' ? 'alert' : 'status'} className="text-xs font-semibold"
                style={{ color: save.status === 'error' ? '#DC2626' : '#059669' }}>{save.msg}</span>
            )}
          </div>
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
            Changes here save with this budget only. "Save as my default scope" makes this the starting scope for {trade.label} on every budget you haven't edited.
          </p>
        </div>
      )}
    </div>
  );
}

function SubsMaterialsView({ data, onTradeChange, scope, subs, sheets, bids, agreements }) {
  const { trades, materials, fees, designSpecsTotal, changeOrderCost, subTotal, materialTotal, feeTotal, directCosts } = data;
  const used = new Set(trades.map((t) => t.key));
  const notUsed = TRADES.filter((t) => t.key !== 'other' && !used.has(t.key));
  const card = { backgroundColor: '#fff', border: '1.5px solid #E5E7EB', boxShadow: '0 2px 12px rgba(0,33,71,0.05)' };
  // Who performs the work: assigned trades and COI problems.
  const assignedSubs = trades.map((t) => subs.assigned(t.key)).filter(Boolean)
    .map((p) => subs.list?.find((x) => x.id === p.id)).filter(Boolean);
  const assignedCount = trades.filter((t) => subs.assigned(t.key)).length;
  const coiExpired = assignedSubs.filter((x) => coiState(x.coi_expires_on) === 'expired').length;
  const coiSoon = assignedSubs.filter((x) => coiState(x.coi_expires_on) === 'expiring').length;
  const coiMissing = assignedSubs.filter((x) => coiState(x.coi_expires_on) === 'none').length;
  // Subcontract Agreements: fully signed, and "ready to start" (fully signed + COI current).
  const subInfo = agreements.subInfo;
  const signedCount = trades.filter((t) => agreements.current(t.key)?.status === 'countersigned').length;
  const readyCount = trades.filter((t) => agreements.current(t.key)?.status === 'countersigned' && ['active', 'expiring'].includes(subInfo(t.key).coi)).length;
  const toCountersign = trades.filter((t) => agreements.current(t.key)?.status === 'signed').length;
  return (
    <div className="space-y-4" data-testid="subs-materials-view">
      {/* Section 1 — Subcontractor work */}
      <section className="rounded-2xl overflow-hidden" style={{ ...card, borderColor: '#BAE6FD' }} aria-labelledby="sm-subs">
        <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ backgroundColor: '#F0F9FF' }}>
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0" style={{ backgroundColor: '#0369A1', color: '#fff' }}>1</span>
            <h2 id="sm-subs" className="text-sm font-bold" style={{ color: '#0369A1' }}>Subcontractor Work — by trade</h2>
          </div>
          <span className="text-sm font-extrabold" style={{ color: '#0369A1' }}>{fmt(subTotal)}</span>
        </div>
        {trades.length > 0 && (
          <p className="flex flex-wrap gap-x-3 gap-y-1 px-5 py-2 text-xs" style={{ borderTop: '1px solid #E0F2FE', color: '#6B7280' }} data-testid="sm-sub-summary">
            <span><b style={{ color: '#002147' }}>{assignedCount} of {trades.length}</b> trades assigned</span>
            {coiExpired > 0 && <span style={{ color: '#991B1B', fontWeight: 700 }}>{coiExpired} COI expired</span>}
            {coiSoon > 0 && <span style={{ color: '#92400E', fontWeight: 700 }}>{coiSoon} COI expiring within 30 days</span>}
            {coiMissing > 0 && <span>{coiMissing} with no COI on file</span>}
            {!agreements.missing && <span><b style={{ color: '#002147' }}>{signedCount} of {trades.length}</b> agreements fully signed</span>}
            {!agreements.missing && <span style={{ color: readyCount === trades.length ? '#059669' : '#6B7280', fontWeight: readyCount ? 700 : 400 }}>{readyCount} ready to start</span>}
            {toCountersign > 0 && <span style={{ color: '#92400E', fontWeight: 700 }}>{toCountersign} waiting for your countersignature</span>}
          </p>
        )}
        {trades.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-2 text-xs" style={{ borderTop: '1px solid #E0F2FE' }}>
            <button type="button" onClick={() => sheets.print(trades.map((t) => t.key))}
              className="px-3 py-1.5 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-sky-300"
              style={{ border: '1px solid #0369A1', color: '#0369A1', backgroundColor: '#fff' }}>
              Print all trade sheets
            </button>
            <label className="flex items-center gap-1.5" style={{ color: '#4B5563' }}>
              <input type="checkbox" checked={sheets.amounts} onChange={(e) => sheets.setAmounts(e.target.checked)} />
              Show amounts on trade sheets
            </label>
          </div>
        )}
        {trades.length === 0 ? (
          <p className="px-5 py-4 text-xs" style={{ color: '#9CA3AF' }}>No subcontract amounts in this budget.</p>
        ) : trades.map((t) => (
          <div key={t.key} style={{ borderTop: '1px solid #E0F2FE' }}>
            <div className="flex items-center justify-between px-5 py-2.5" style={{ backgroundColor: '#FAFDFF' }}>
              <span className="text-sm font-bold" style={{ color: '#002147' }}>{t.label}</span>
              <span className="flex items-center gap-3">
                <button type="button" onClick={() => sheets.print([t.key])} aria-label={`Print trade sheet for ${t.label}`}
                  className="text-xs font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-sky-300 rounded" style={{ color: '#0369A1' }}>
                  Trade sheet
                </button>
                <span className="text-sm font-extrabold" style={{ color: '#002147' }}>{fmt(t.total)}</span>
              </span>
            </div>
            <TradeSub trade={t} subs={subs} />
            <TradeBids trade={t} subs={subs} bids={bids} />
            <TradeScope trade={t} scope={scope} />
            <TradeAgreement trade={t} api={agreements} sub={subInfo(t.key)} />
            {t.lines.map((l) => (
              <div key={l.item.wbs} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2 text-sm" style={{ borderTop: '1px solid #F3F4F6' }}>
                <div className="flex-1 min-w-[10rem]">
                  <span style={{ color: '#374151' }}>{l.item.label}</span>
                  <span className="text-xs" style={{ color: '#9CA3AF' }}> · {l.div.label}{l.pct < 100 ? ` · ${l.pct}% of ${fmt(l.lineTotal)} line` : ''}</span>
                </div>
                <label className="sr-only" htmlFor={`trade-${l.item.wbs}`}>Trade for {l.item.label}</label>
                <select id={`trade-${l.item.wbs}`} value={t.key} onChange={(e) => onTradeChange(l.item, l.div, e.target.value)}
                  className="text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-300"
                  style={{ border: '1px solid #D1D5DB', color: l.isDefault ? '#6B7280' : '#0369A1', fontWeight: l.isDefault ? 400 : 700, backgroundColor: '#fff' }}>
                  {TRADES.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                <span className="w-24 text-right font-semibold" style={{ color: '#002147' }}>{fmt(l.amount)}</span>
              </div>
            ))}
          </div>
        ))}
        {notUsed.length > 0 && (
          <p className="px-5 py-2.5 text-xs" style={{ borderTop: '1px solid #E0F2FE', color: '#9CA3AF' }}>
            Not in this budget: {notUsed.map((t) => t.label).join(', ')}.
          </p>
        )}
      </section>

      {/* Section 2 — Materials */}
      <section className="rounded-2xl overflow-hidden" style={{ ...card, borderColor: '#FDE68A' }} aria-labelledby="sm-mats">
        <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ backgroundColor: '#FFFBEB' }}>
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0" style={{ backgroundColor: '#B45309', color: '#fff' }}>2</span>
            <h2 id="sm-mats" className="text-sm font-bold" style={{ color: '#B45309' }}>Materials — by section</h2>
          </div>
          <span className="text-sm font-extrabold" style={{ color: '#B45309' }}>{fmt(materialTotal)}</span>
        </div>
        {materials.length === 0 && designSpecsTotal <= 0 ? (
          <p className="px-5 py-4 text-xs" style={{ color: '#9CA3AF' }}>No material amounts in this budget.</p>
        ) : (
          <>
            {materials.map((g) => (
              <div key={g.div.key} style={{ borderTop: '1px solid #FEF3C7' }}>
                <div className="flex items-center justify-between px-5 py-2.5" style={{ backgroundColor: '#FFFDF7' }}>
                  <span className="text-sm font-bold" style={{ color: '#002147' }}>{g.div.label}</span>
                  <span className="text-sm font-extrabold" style={{ color: '#002147' }}>{fmt(g.total)}</span>
                </div>
                {g.lines.map((l) => (
                  <div key={l.item.wbs} className="flex items-center gap-3 px-5 py-2 text-sm" style={{ borderTop: '1px solid #F3F4F6' }}>
                    <span className="flex-1" style={{ color: '#374151' }}>{l.item.label}</span>
                    <span className="w-24 text-right font-semibold" style={{ color: '#002147' }}>{fmt(l.amount)}</span>
                  </div>
                ))}
              </div>
            ))}
            {designSpecsTotal > 0 && (
              <div className="flex items-center justify-between px-5 py-2.5" style={{ borderTop: '1px solid #FEF3C7', backgroundColor: '#FFFDF7' }}>
                <span className="text-sm font-bold" style={{ color: '#002147' }}>Approved Design Selections</span>
                <span className="text-sm font-extrabold" style={{ color: '#002147' }}>{fmt(designSpecsTotal)}</span>
              </div>
            )}
          </>
        )}
      </section>

      {/* Other costs, so the two sections add up to Direct Costs */}
      {(feeTotal > 0 || changeOrderCost > 0) && (
        <section className="rounded-2xl overflow-hidden" style={card} aria-labelledby="sm-other">
          <div className="flex items-center justify-between gap-3 px-5 py-3" style={{ backgroundColor: '#F9FAFB' }}>
            <h2 id="sm-other" className="text-sm font-bold" style={{ color: '#4B5563' }}>Other Costs — permits, fees &amp; change orders</h2>
            <span className="text-sm font-extrabold" style={{ color: '#4B5563' }}>{fmt(feeTotal + changeOrderCost)}</span>
          </div>
          {fees.map((l) => (
            <div key={l.item.wbs} className="flex items-center gap-3 px-5 py-2 text-sm" style={{ borderTop: '1px solid #F3F4F6' }}>
              <span className="flex-1" style={{ color: '#374151' }}>{l.item.label} <span className="text-xs" style={{ color: '#9CA3AF' }}>· {l.div.label}</span></span>
              <span className="w-24 text-right font-semibold" style={{ color: '#002147' }}>{fmt(l.amount)}</span>
            </div>
          ))}
          {changeOrderCost > 0 && (
            <div className="flex items-center gap-3 px-5 py-2 text-sm" style={{ borderTop: '1px solid #F3F4F6' }}>
              <span className="flex-1" style={{ color: '#374151' }}>Approved change orders (cost)</span>
              <span className="w-24 text-right font-semibold" style={{ color: '#002147' }}>{fmt(changeOrderCost)}</span>
            </div>
          )}
        </section>
      )}

      <div className="flex items-center justify-between px-5 py-3 rounded-2xl" style={{ backgroundColor: '#F8F9FB', border: '1px solid #E5E7EB' }}>
        <span className="text-xs font-bold tracking-wide" style={{ color: '#002147' }}>
          Subcontractors + Materials{feeTotal + changeOrderCost > 0 ? ' + Other' : ''} = Direct Costs
        </span>
        <span className="text-sm font-extrabold" style={{ color: '#002147' }} data-testid="sm-direct-total">{fmt(directCosts)}</span>
      </div>
      <p className="text-xs px-1" style={{ color: '#9CA3AF' }}>
        Internal only. Each line is split into materials and subcontract using its cost breakdown — change a line's
        split on the Estimate tab with "Show cost breakdown" on. Change a line's trade with the drop-down; it saves with the budget.
        Open "Scope of work" under any trade to describe the work for that subcontractor. Pick who performs each trade from
        your Subcontractors directory under "Performed by".
      </p>
    </div>
  );
}

export default function RemodelBudget() {
  const { state: projectState, dispatch } = useProject();
  // Used only to pre-populate the picker when admin arrives from a project view
  const contextProjectId = projectState.activeDbProject?.id ?? null;

  // ── Internal project picker ─────────────────────────────────────────────────
  const [dbProjects,     setDbProjects]     = useState([]);
  const [selectedProjId, setSelectedProjId] = useState('');
  const [deleteMsg,      setDeleteMsg]      = useState(null);   // { status, msg } after "Delete this budget"
  const [catalog,        setCatalog]        = useState([]);     // Cost Catalog items for "+ Add line item"
  useEffect(() => { fetchCatalog().then(({ items }) => setCatalog(items)); }, []);

  // currentProjectId drives all save/load; empty string = standalone mode (no DB save)
  const currentProjectId   = selectedProjId || null;
  const currentProjectName = dbProjects.find((p) => p.id === selectedProjId)?.project_name ?? null;

  // Load project list once on mount
  useEffect(() => {
    selectProjects('id, project_name', { orderBy: 'created_at', ascending: false })
      .then(({ data }) => setDbProjects(data ?? []));
  }, []);

  // Pre-populate picker when arriving from a project context (e.g. clicking a project then navigating here)
  useEffect(() => {
    if (contextProjectId && !selectedProjId) setSelectedProjId(contextProjectId);
  }, [contextProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Calculator state ────────────────────────────────────────────────────────
  const [projectType,    setProjectType]    = useState('bathroom-medium');
  const [inputs,         setInputs]         = useState(() => defaultInputs('bathroom-medium'));
  const [specLevel,      setSpecLevel]      = useState('mid');
  const [pctRates,       setPctRates]       = useState(DEFAULT_PCT_RATES);
  const [userVals,       setUserVals]       = useState({});
  const [overrideFlags,  setOverrideFlags]  = useState({});
  const [openDivs,       setOpenDivs]       = useState({});
  const [layout,         setLayout]         = useState(EMPTY_LAYOUT);  // added / renamed / removed lines
  const [layoutError,    setLayoutError]    = useState('');

  // ── Actuals state ───────────────────────────────────────────────────────────
  const [actualParts,    setActualParts]    = useState({});   // { wbs: { material, labor, sub, unsplit } }
  const [unsplitWbs,     setUnsplitWbs]     = useState(() => new Set());  // lines loaded with an older, unsplit total
  const [openActual,     setOpenActual]     = useState(null); // wbs whose breakdown is open
  const [actualsOn,      setActualsOn]      = useState(true);
  const [breakdownOn,    setBreakdownOn]    = useState(false);   // Materials / Subcontract / Other view
  const [viewMode,       setViewMode]       = useState(() => {   // 'phase' | 'trade' (Subs & Materials)
    try { return localStorage.getItem('rb-view-mode') === 'trade' ? 'trade' : 'phase'; } catch { return 'phase'; }
  });
  const [actualsError,   setActualsError]   = useState('');
  const [scopeDefaults,  setScopeDefaults]  = useState({});      // trade → saved default Scope of Work
  const [scopeSave,      setScopeSave]      = useState({});      // trade → { status, msg }
  const [subDirectory,   setSubDirectory]   = useState(null);    // subcontractor_directory rows (null = loading)
  const [subDirError,    setSubDirError]    = useState('');
  const [showSheetAmounts, setShowSheetAmounts] = useState(() => {   // budget amounts on trade sheets (off by default)
    try { return localStorage.getItem('rb-sheet-amounts') === '1'; } catch { return false; }
  });
  const actualVals = useMemo(
    () => Object.fromEntries(Object.entries(actualParts).map(([wbs, p]) => [wbs, partsTotal(p)])),
    [actualParts]
  );

  // ── Design specs ────────────────────────────────────────────────────────────
  const [approvedSpecs,  setApprovedSpecs]  = useState([]);
  const [specsDivOpen,   setSpecsDivOpen]   = useState(true);

  // ── Approved change orders ──────────────────────────────────────────────────
  const [approvedChangeOrders, setApprovedChangeOrders] = useState([]);
  const [generatingContract,   setGeneratingContract]   = useState(false);
  const [contractError,        setContractError]        = useState('');
  const [coDivOpen,            setCoDivOpen]            = useState(true);

  // ── Persistence state ───────────────────────────────────────────────────────
  const [budgetLoading,  setBudgetLoading]  = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [lastSaved,      setLastSaved]      = useState(null);

  // Refs for debounced save — avoids closure-staleness
  const syncingRef      = useRef(false);  // true while loading from DB (suppress saves)
  const saveTimerRef    = useRef(null);
  const savePayloadRef  = useRef(null);
  const allowancesSnapshotRef = useRef([]);  // [{ key, label, amount }] saved for Designer Workspace
  const actualTimers    = useRef({});     // per-wbs debounce timers

  // ── Load design specs ───────────────────────────────────────────────────────
  const loadApprovedSpecs = useCallback(async (pid) => {
    if (!pid) { setApprovedSpecs([]); return; }
    const { data } = await supabase
      .from('design_specs')
      .select('id, product_name, supplier, quantity, unit_type, unit_price, installed_cost, room_category')
      .eq('project_id', pid)
      .eq('status', 'approved')
      .order('room_category');
    setApprovedSpecs(data ?? []);
  }, []);

  // ── Load approved change orders ─────────────────────────────────────────────
  const loadApprovedChangeOrders = useCallback(async (pid) => {
    if (!pid) { setApprovedChangeOrders([]); return; }
    const { data } = await supabase
      .from('change_works')
      .select('id, title, category, original_cost, new_cost, approved_at, approved_by')
      .eq('project_id', pid)
      .eq('status', 'approved')
      .order('approved_at', { ascending: true });
    setApprovedChangeOrders(data ?? []);
  }, []);

  // ── Load budget from DB ─────────────────────────────────────────────────────
  const loadBudget = useCallback(async (projectId) => {
    syncingRef.current = true;
    setBudgetLoading(true);
    setLastSaved(null);

    const [{ data: budget }, { data: actuals }] = await Promise.all([
      supabase
        .from('remodel_budgets')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle(),
      supabase
        .from('remodel_budget_actuals')
        .select(`wbs_key, actual_cost, ${ACTUAL_COLUMNS.join(', ')}`)
        .eq('project_id', projectId)
        .then(async (res) => {
          if (!res.error) return res;
          // Before migration 051 there is no other_cost; before 037 no by-type columns.
          const res037 = await supabase.from('remodel_budget_actuals')
            .select('wbs_key, actual_cost, material_cost, labor_cost, sub_cost').eq('project_id', projectId);
          return res037.error
            ? supabase.from('remodel_budget_actuals').select('wbs_key, actual_cost').eq('project_id', projectId)
            : res037;
        }),
    ]);

    if (!budget) {
      // New budget: start from "My template" for the default type, if saved.
      const tpl = templatesRef.current?.['bathroom-medium'];
      if (tpl) applyTemplateRef.current?.('bathroom-medium', tpl.template, EMPTY_LAYOUT);
    }
    if (budget) {
      const type = budget.project_type || 'bathroom-medium';
      setProjectType(type);
      setInputs({ ...defaultInputs(type), ...(budget.inputs_json || {}) });
      setSpecLevel(budget.spec_level || 'mid');
      // Budgets saved before the sales tax line keep their totals (0% until set).
      setPctRates({ ...DEFAULT_PCT_RATES, salesTaxPct: 0, ...(budget.pct_rates_json || {}) });
      setUserVals(budget.overrides_json || {});
      setOverrideFlags(budget.flags_json || {});
      setLayout(upgradeLayout(normalizeLayout(budget.layout_json), getProjectConfig(type)));
      // Open all divisions
      const cfg = getProjectConfig(type);
      if (cfg) setOpenDivs(Object.fromEntries(cfg.divisions.map((d) => [d.key, true])));
    }

    const loaded = {};
    for (const a of actuals ?? []) {
      const parts = {
        material: Number(a.material_cost) || 0, labor: Number(a.labor_cost) || 0,
        sub: Number(a.sub_cost) || 0, other: Number(a.other_cost) || 0,
      };
      const split = parts.material + parts.labor + parts.sub + parts.other;
      loaded[a.wbs_key] = { ...parts, unsplit: Math.max(0, (Number(a.actual_cost) || 0) - split) };
    }
    setActualParts(loaded);
    setUnsplitWbs(new Set(Object.keys(loaded).filter((w) => loaded[w].unsplit > 0)));

    setBudgetLoading(false);
    // Allow auto-save one tick after state settles
    setTimeout(() => { syncingRef.current = false; }, 50);
  }, []);

  // ── Wipe + reload when selected project changes ────────────────────────────
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    syncingRef.current = true;

    // Full calculator reset on every project switch
    setProjectType('bathroom-medium');
    setInputs(defaultInputs('bathroom-medium'));
    setSpecLevel('mid');
    setPctRates(DEFAULT_PCT_RATES);
    setUserVals({});
    setOverrideFlags({});
    setOpenDivs({});
    setLayout(EMPTY_LAYOUT);
    setLayoutError('');
    setActualParts({});
    setUnsplitWbs(new Set());
    setOpenActual(null);
    setActualsError('');
    setApprovedSpecs([]);
    setApprovedChangeOrders([]);
    setLastSaved(null);
    setSaving(false);

    if (!selectedProjId) {
      syncingRef.current = false;
      return;
    }

    loadBudget(selectedProjId);
    loadApprovedSpecs(selectedProjId);
    loadApprovedChangeOrders(selectedProjId);
  }, [selectedProjId, loadBudget, loadApprovedSpecs, loadApprovedChangeOrders]);

  // ── Debounced auto-save for budget header ───────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!currentProjectId || syncingRef.current) return;

    savePayloadRef.current = {
      project_id:    currentProjectId,
      project_type:  projectType,
      spec_level:    specLevel,
      inputs_json:   inputs,
      pct_rates_json: pctRates,
      overrides_json: userVals,
      flags_json:    overrideFlags,
      layout_json:   layout,
    };

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!savePayloadRef.current) return;
      setSaving(true);
      // The allowance list is read now (it is refreshed after every render).
      let payload = { ...savePayloadRef.current, allowances_json: allowancesSnapshotRef.current };
      let { error } = await supabase
        .from('remodel_budgets')
        .upsert(payload, { onConflict: 'project_id' });
      // Before migration 052 there is no allowances_json column (Designer
      // Workspace comparison); before 050 no layout_json: save the rest.
      if (error && /allowances_json/.test(error.message ?? '')) {
        payload = { ...payload };
        delete payload.allowances_json;
        ({ error } = await supabase.from('remodel_budgets').upsert(payload, { onConflict: 'project_id' }));
      }
      if (error && /layout_json/.test(error.message ?? '')) {
        const { layout_json, ...rest } = payload;
        delete rest.allowances_json;
        ({ error } = await supabase.from('remodel_budgets').upsert(rest, { onConflict: 'project_id' }));
        setLayoutError(layoutIsEmpty(layout_json) ? '' : 'Added, renamed and removed lines are not saved yet — run migration 050 in Supabase.');
      } else {
        setLayoutError('');
      }
      setSaving(false);
      if (!error) setLastSaved(new Date());
    }, 1500);

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  // Using JSON.stringify is intentional here to detect deep object changes
  // without adding object identity instability to the effect deps.
  }, [
    currentProjectId, projectType, specLevel,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(inputs), JSON.stringify(pctRates),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(userVals), JSON.stringify(overrideFlags),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(layout),
  ]);

  // ── Save actual cost for one WBS line (debounced 800ms) ────────────────────
  function handleActualPartChange(wbs, key, val) {
    const parts = { ...EMPTY_PARTS, ...actualParts[wbs], [key]: val };
    setActualParts((p) => ({ ...p, [wbs]: parts }));
    if (!currentProjectId) return;

    if (actualTimers.current[wbs]) clearTimeout(actualTimers.current[wbs]);
    actualTimers.current[wbs] = setTimeout(async () => {
      const row = {
        project_id:    currentProjectId,
        wbs_key:       wbs,
        actual_cost:   partsTotal(parts),
        material_cost: parts.material, labor_cost: parts.labor, sub_cost: parts.sub, other_cost: parts.other,
      };
      let { error } = await supabase.from('remodel_budget_actuals').upsert(row, { onConflict: 'project_id,wbs_key' });
      let hint = '';
      // Before migration 051 there is no other_cost column: save the rest.
      if (error && /other_cost/.test(error.message ?? '')) {
        const { other_cost, ...rest } = row;
        if (other_cost > 0) hint = ' Other / Fees amounts need migration 051 in Supabase.';
        ({ error } = await supabase.from('remodel_budget_actuals')
          .upsert({ ...rest, actual_cost: rest.actual_cost - other_cost }, { onConflict: 'project_id,wbs_key' }));
      }
      setActualsError(error ? `Actual cost for line ${wbs} was not saved: ${error.message}` : hint ? `Line ${wbs}:${hint}` : '');
    }, 800);
  }

  // ── Derived config ──────────────────────────────────────────────────────────
  // The project type's lines with this budget's added / renamed / removed lines.
  const config = useMemo(() => applyLayout(getProjectConfig(projectType), layout), [projectType, layout]);

  const resolvedOpenDivs = useMemo(() => {
    if (!config) return {};
    if (Object.keys(openDivs).length > 0) return openDivs;
    return Object.fromEntries(config.divisions.map((d) => [d.key, true]));
  }, [config, openDivs]);

  // ── My templates (migration 054) ────────────────────────────────────────────
  // "Save as my template" stores this budget's setup for its project type; new
  // budgets of that type start from it. Typed prices on built-in lines are kept
  // as adjustments (× the built-in price), so they follow the job size.
  // Size, actuals, scopes and subcontractors stay with each budget.
  const [myTemplates,    setMyTemplates]    = useState({});      // project_type → { template, updatedAt }
  const [templateMsg,    setTemplateMsg]    = useState(null);    // { status, msg }
  useEffect(() => {
    let live = true;
    supabase.from('remodel_budget_templates').select('project_type, template_json, updated_at').then(({ data, error }) => {
      if (live && !error && Array.isArray(data)) {
        setMyTemplates(Object.fromEntries(data.map((r) => [r.project_type, { template: r.template_json, updatedAt: r.updated_at }])));
      }
    });
    return () => { live = false; };
  }, []);

  const templatesRef = useRef({});
  const applyTemplateRef = useRef(null);
  useEffect(() => { templatesRef.current = myTemplates; applyTemplateRef.current = applyTemplate; });

  function buildTemplate() {
    const formula = computeBaseLineValues(projectType, inputs, specLevel);
    const factors = { ...(layout.factors ?? {}) };
    const amounts = {};
    for (const div of config.divisions) {
      for (const item of div.items) {
        if (item.unit === 'pct') continue;
        if (item.custom) { amounts[item.wbs] = Math.round(userVals[item.wbs] ?? 0); continue; }
        if (!overrideFlags[item.wbs]) continue;
        const base = formula[item.wbs] ?? 0;
        const val = Number(userVals[item.wbs]) || 0;
        if (base > 0) {
          const f = Math.round((val / base) * 10000) / 10000;
          if (f === 1) delete factors[item.wbs]; else factors[item.wbs] = f;
        } else {
          delete factors[item.wbs];
          amounts[item.wbs] = Math.round(val);
        }
      }
    }
    const { added, labels, removed, splits, allowances, trades, v } = layout;
    return { version: 1, specLevel, pctRates, layout: { added, labels, removed, splits, allowances, trades, factors, v }, amounts };
  }

  // Starts this budget from a saved template (keeps size, scopes and subs).
  // Lines with actual costs entered are never removed.
  function applyTemplate(typeId, tpl, keep) {
    const cfg = getProjectConfig(typeId);
    if (!cfg || !tpl || typeof tpl !== 'object') return;
    const l = upgradeLayout(normalizeLayout(tpl.layout), cfg);
    l.removed = l.removed.filter((w) => !((actualVals[w] ?? 0) > 0));
    l.scopes = keep.scopes ?? {};
    l.subs = keep.subs ?? {};
    const valid = new Set([...cfg.divisions.flatMap((d) => d.items.filter((it) => it.unit !== 'pct').map((it) => it.wbs)), ...l.added.map((a) => a.id)]);
    const amounts = Object.fromEntries(Object.entries(tpl.amounts && typeof tpl.amounts === 'object' ? tpl.amounts : {})
      .filter(([w, v]) => valid.has(w) && Number.isFinite(Number(v)) && Number(v) >= 0)
      .map(([w, v]) => [w, Math.round(Number(v))]));
    for (const a of l.added) if (amounts[a.id] == null) amounts[a.id] = 0;
    const rate = (v, d) => (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) < 100 ? Number(v) : d);
    setLayout(l);
    setSpecLevel(SPEC_LEVELS.includes(tpl.specLevel) ? tpl.specLevel : 'mid');
    setPctRates({
      profitPct: rate(tpl.pctRates?.profitPct, DEFAULT_PCT_RATES.profitPct),
      contingencyPct: rate(tpl.pctRates?.contingencyPct, DEFAULT_PCT_RATES.contingencyPct),
      salesTaxPct: rate(tpl.pctRates?.salesTaxPct, DEFAULT_PCT_RATES.salesTaxPct),
    });
    setUserVals(amounts);
    setOverrideFlags(Object.fromEntries(Object.keys(amounts).map((w) => [w, true])));
  }

  const templateErr = (error) => (/remodel_budget_templates|schema cache|does not exist/i.test(error?.message ?? '')
    ? 'Not saved — run migration 054 in Supabase first.'
    : `Not saved: ${error?.message ?? 'unknown error'}`);
  async function saveMyTemplate() {
    if (myTemplates[projectType] && !confirm(`Replace your saved template for ${config.label} with this budget's setup?`)) return;
    const template = buildTemplate();
    setTemplateMsg({ status: 'saving', msg: 'Saving…' });
    const { error } = await supabase.from('remodel_budget_templates')
      .upsert({ project_type: projectType, template_json: template }, { onConflict: 'project_type' });
    if (error) { setTemplateMsg({ status: 'error', msg: templateErr(error) }); return; }
    setMyTemplates((t) => ({ ...t, [projectType]: { template, updatedAt: new Date().toISOString() } }));
    setTemplateMsg({ status: 'saved', msg: `Saved. New ${config.label} budgets will start from your template.` });
  }
  function applyMyTemplate() {
    const t = myTemplates[projectType];
    if (!t || !confirm('Replace this budget\'s lines, prices, splits and margin with your template? Size, actual costs, scopes and subcontractors stay.')) return;
    applyTemplate(projectType, t.template, layout);
    setTemplateMsg({ status: 'saved', msg: 'Your template was applied to this budget.' });
  }
  async function deleteMyTemplate() {
    if (!myTemplates[projectType] || !confirm(`Delete your template for ${config.label}? New budgets will start from the Orozco Homes built-in prices. Budgets already made don't change.`)) return;
    const { error } = await supabase.from('remodel_budget_templates').delete().eq('project_type', projectType);
    if (error) { setTemplateMsg({ status: 'error', msg: templateErr(error).replace('Not saved', 'Not deleted') }); return; }
    setMyTemplates((t) => { const n = { ...t }; delete n[projectType]; return n; });
    setTemplateMsg({ status: 'saved', msg: 'Template deleted.' });
  }

  // ── Project type change ─────────────────────────────────────────────────────
  function changeProjectType(typeId) {
    if (typeId !== projectType && !layoutIsEmpty(layout)
      && !confirm('Changing the project type starts a new list of lines. Your added, renamed and removed lines will be cleared. Continue?')) return;
    setLayout((l) => ({ ...EMPTY_LAYOUT, scopes: l.scopes ?? {}, subs: l.subs ?? {} }));   // scopes and subs are per trade, not per line
    setProjectType(typeId);
    setInputs(defaultInputs(typeId));
    setPctRates(DEFAULT_PCT_RATES);
    setUserVals({});
    setOverrideFlags({});
    setTemplateMsg(null);
    if (myTemplates[typeId]) applyTemplate(typeId, myTemplates[typeId].template, layout);   // start from "My template"
    const cfg = getProjectConfig(typeId);
    if (cfg) setOpenDivs(Object.fromEntries(cfg.divisions.map((d) => [d.key, true])));
  }

  // ── Design specs total — must be declared before lineVals uses it ────────────
  const designSpecsTotal = useMemo(
    () => approvedSpecs.reduce((s, sp) => s + (Number(sp.installed_cost) || 0), 0),
    [approvedSpecs]
  );

  // ── Approved change orders total (new cost − original cost, as the client
  // approved it) ───────────────────────────────────────────────────────────────
  const changeOrdersTotal = useMemo(
    () => approvedChangeOrders.reduce((s, co) => s + coDelta(co), 0),
    [approvedChangeOrders]
  );

  // ── Cascade engine (estimated line values) ──────────────────────────────────
  const lineVals = useMemo(() => {
    if (!config) return {};
    const formulaVals = computeBaseLineValues(projectType, inputs, specLevel);
    const vals = {};
    for (const div of config.divisions) {
      for (const item of div.items) {
        if (item.unit === 'pct') vals[item.wbs] = 0;
        else if (item.custom) vals[item.wbs] = userVals[item.wbs] ?? 0;
        else vals[item.wbs] = overrideFlags[item.wbs]
          ? (userVals[item.wbs] ?? formulaVals[item.wbs] ?? 0)
          : (formulaVals[item.wbs] ?? 0) * (layout.factors?.[item.wbs] ?? 1);
      }
    }
    const nonPctWbs = allNonPctWbs(config);
    const baseSum = nonPctWbs.reduce((s, w) => s + (vals[w] ?? 0), 0) + designSpecsTotal;
    // Materials sales tax: on each line's materials share (its cost split) plus
    // approved design selections. A real cost, so contingency and margin apply to it.
    const materialsBase = config.divisions.flatMap((d) => d.items).filter((it) => it.unit !== 'pct')
      .reduce((s, it) => s + (vals[it.wbs] ?? 0) * (lineSplit(it, layout).m / 100), 0) + designSpecsTotal;
    vals['M.4'] = overrideFlags['M.4'] ? (userVals['M.4'] ?? 0) : materialsBase * ((pctRates.salesTaxPct ?? 0) / 100);
    const costBase = baseSum + vals['M.4'];
    vals['M.3'] = overrideFlags['M.3'] ? (userVals['M.3'] ?? 0) : costBase * (pctRates.contingencyPct / 100);
    // Final Price = (Direct Costs + Contingency) / (1 - Target Gross Margin %).
    // M.2 is the gross margin, which covers overhead and profit.
    vals['M.2'] = overrideFlags['M.2']
      ? (userVals['M.2'] ?? 0)
      : grossMarginAmount(costBase + vals['M.3'], pctRates.profitPct);
    return vals;
  }, [config, projectType, inputs, specLevel, pctRates, userVals, overrideFlags, designSpecsTotal, layout]);

  // ── Aggregate totals (budget + actual) ──────────────────────────────────────
  const totals = useMemo(() => {
    if (!config) return {};
    const nonPct = allNonPctWbs(config);

    // Approved change orders are added to the client price exactly as approved.
    // They are assumed to carry the same target gross margin, so that share goes
    // to margin and the rest to direct cost (and the cost budget).
    const changeOrderMargin  = changeOrdersTotal * ((pctRates.profitPct ?? 0) / 100);
    const changeOrderCost    = changeOrdersTotal - changeOrderMargin;

    // Budget
    const directCosts        = nonPct.reduce((s, w) => s + (lineVals[w] ?? 0), 0) + designSpecsTotal + changeOrderCost;
    const profit             = (lineVals['M.2'] ?? 0) + changeOrderMargin;   // gross margin (overhead + profit)
    const contingency        = lineVals['M.3'] ?? 0;
    const salesTax           = lineVals['M.4'] ?? 0;   // materials sales tax (a cost)
    const totalClientPrice   = directCosts + salesTax + contingency + profit;
    const contractorMargin   = profit;
    const marginPct          = totalClientPrice > 0 ? contractorMargin / totalClientPrice : 0;
    const marginTarget       = (pctRates.profitPct ?? 0) / 100;
    const sqftInput          = config.inputFields.find((f) => f.key === 'sqft');
    const costPerSqft        = sqftInput && inputs.sqft > 0 ? totalClientPrice / inputs.sqft : null;

    // Actual — compared with the COST budget (direct + contingency), never with
    // the client price, which also contains the gross margin.
    const budgetCost         = directCosts + salesTax + contingency;
    const actualDirectCosts  = nonPct.reduce((s, w) => s + (actualVals[w] ?? 0), 0);
    const actualOverhead     = actualVals['M.1'] ?? 0;   // legacy line from before the gross-margin model
    const actualContingency  = actualVals['M.3'] ?? 0;
    const actualTotalCost    = actualDirectCosts + actualOverhead + actualContingency + (actualVals['M.4'] ?? 0);
    const totalVariance      = budgetCost - actualTotalCost;
    const projectedMargin    = totalClientPrice - actualTotalCost;
    const projectedMarginPct = totalClientPrice > 0 ? projectedMargin / totalClientPrice : 0;

    // Per-division sums
    const divSums = {};
    for (const div of config.divisions)
      divSums[div.key] = div.items.reduce((s, item) => s + (lineVals[item.wbs] ?? 0), 0);

    return {
      directCosts, profit, contingency, salesTax, totalClientPrice,
      contractorMargin, marginPct, marginTarget, costPerSqft, divSums,
      budgetCost, actualDirectCosts, actualOverhead, actualContingency,
      actualTotalCost, totalVariance, projectedMargin, projectedMarginPct,
      changeOrderCost, changeOrderMargin,
    };
  }, [config, lineVals, inputs.sqft, designSpecsTotal, changeOrdersTotal, actualVals, pctRates.profitPct]);

  // ── Event handlers ──────────────────────────────────────────────────────────
  function handleLineChange(wbs, num)  {
    setUserVals((p) => ({ ...p, [wbs]: num })); setOverrideFlags((p) => ({ ...p, [wbs]: true }));
    // Typing the amount of a quantity-priced line makes it a lump sum.
    setLayout((l) => (l.added.some((a) => a.id === wbs && a.unit)
      ? { ...l, added: l.added.map((a) => (a.id === wbs ? { id: a.id, div: a.div, label: a.label } : a)) } : l));
  }
  // Quantity × unit cost for an added line (null = back to lump sum, amount kept).
  function setLineMeasure(item, measure) {
    const m = measure ? lineMeasure(measure) : null;
    setLayout((l) => ({ ...l, added: l.added.map((a) => (a.id === item.wbs ? { id: a.id, div: a.div, label: a.label, ...(m ?? {}) } : a)) }));
    if (m) { setUserVals((p) => ({ ...p, [item.wbs]: measureAmount(m) })); setOverrideFlags((p) => ({ ...p, [item.wbs]: true })); }
  }
  function resetLine(wbs)              {
    setOverrideFlags((p) => ({ ...p, [wbs]: false })); setUserVals((p) => { const n = { ...p }; delete n[wbs]; return n; });
    setLayout((l) => { if (l.factors?.[wbs] == null) return l; const factors = { ...l.factors }; delete factors[wbs]; return { ...l, factors }; });
  }
  // Amounts of added lines are their own values, not overrides: keep them.
  const isCustomWbs = (w) => layout.added.some((a) => a.id === w);
  function resetAll() {
    setOverrideFlags((p) => Object.fromEntries(Object.entries(p).filter(([w]) => isCustomWbs(w))));
    setUserVals((p) => Object.fromEntries(Object.entries(p).filter(([w]) => isCustomWbs(w))));
    setLayout((l) => ({ ...l, factors: {} }));
  }
  function addLine(divKey, label, amount, measure = null, split = null) {
    const id = newLineId();
    setLayout((l) => ({
      ...l,
      added: [...l.added, { id, div: divKey, label, ...(measure ?? {}) }],
      ...(split ? { splits: { ...(l.splits ?? {}), [id]: clampSplit(split) } } : {}),
    }));
    setUserVals((p) => ({ ...p, [id]: amount }));
    setOverrideFlags((p) => ({ ...p, [id]: true }));
  }
  function renameLine(item, label) {
    if (item.custom) setLayout((l) => ({ ...l, added: l.added.map((a) => (a.id === item.wbs ? { ...a, label } : a)) }));
    else setLayout((l) => {
      const labels = { ...l.labels };
      if (label === item.originalLabel) delete labels[item.wbs]; else labels[item.wbs] = label;
      return { ...l, labels };
    });
  }
  function removeLine(item) {
    if ((actualVals[item.wbs] ?? 0) > 0) {
      alert(`"${item.label}" has actual costs recorded. Clear its actual costs first, then remove it.`);
      return;
    }
    if (!confirm(`Remove "${item.label}" from this budget?${item.custom ? '' : ' You can restore it later.'}`)) return;
    if (item.custom) {
      setLayout((l) => ({ ...l, added: l.added.filter((a) => a.id !== item.wbs) }));
      setUserVals((p) => { const n = { ...p }; delete n[item.wbs]; return n; });
      setOverrideFlags((p) => { const n = { ...p }; delete n[item.wbs]; return n; });
    } else {
      setLayout((l) => ({ ...l, removed: [...new Set([...l.removed, item.wbs])] }));
    }
  }
  function setAllowance(item, patch) {
    setLayout((l) => {
      const allowances = { ...(l.allowances ?? {}) };
      const cur = allowances[item.wbs] ?? { on: isDefaultAllowance(item.originalLabel ?? item.label), amount: null };
      const next = { ...cur, ...patch };
      if (next.on === isDefaultAllowance(item.originalLabel ?? item.label) && next.amount == null) delete allowances[item.wbs];
      else allowances[item.wbs] = next;
      return { ...l, allowances };
    });
  }
  // Default Scope of Work per trade (migration 053). Without the table the
  // built-in starter scopes are used.
  useEffect(() => {
    let live = true;
    supabase.from('trade_scope_templates').select('trade_key, scope').then(({ data, error }) => {
      if (live && !error && Array.isArray(data)) setScopeDefaults(Object.fromEntries(data.map((r) => [r.trade_key, r.scope])));
    });
    return () => { live = false; };
  }, []);
  // Subcontractor directory for "Performed by" (only when the Subs & Materials tab is used).
  const needSubs = viewMode === 'trade' && subDirectory === null;
  useEffect(() => {
    if (!needSubs) return undefined;
    let live = true;
    supabase.from('subcontractor_directory')
      .select('id, display_name, company, name, service, specialty, phone, email, license, address, coi_expires_on, coi_file_path')
      .order('display_name')
      .then(({ data, error }) => {
        if (!live) return;
        if (error) { setSubDirectory([]); setSubDirError('Could not load the Subcontractors directory.'); return; }
        setSubDirectory(data ?? []); setSubDirError('');
      });
    return () => { live = false; };
  }, [needSubs]);
  function assignTradeSub(trade, pick) {
    setLayout((l) => {
      const subs = { ...(l.subs ?? {}) };
      if (pick) subs[trade] = pick; else delete subs[trade];
      return { ...l, subs };
    });
  }
  // Subcontractor bids per trade (migration 059), loaded with the Subs & Materials tab.
  const [tradeBids,      setTradeBids]      = useState({ project: null, list: [], missing: false });
  const [bidMsg,         setBidMsg]         = useState(null);
  const [subAgreements,  setSubAgreements]  = useState({ project: null, list: [], missing: false });
  const [agreementMsg,   setAgreementMsg]   = useState(null);
  const needBids = viewMode === 'trade' && !!currentProjectId && tradeBids.project !== currentProjectId;
  useEffect(() => {
    if (!needBids) return undefined;
    let live = true;
    const project = currentProjectId;
    supabase.from('remodel_trade_bids').select('*').eq('project_id', project).order('created_at')
      .then(({ data, error }) => {
        if (!live) return;
        const missing = !!error && /remodel_trade_bids|schema cache|does not exist/i.test(error.message ?? '');
        setTradeBids({ project, list: error ? [] : (data ?? []), missing });
      });
    return () => { live = false; };
  }, [needBids, currentProjectId]);
  const bidsApi = {
    missing: tradeBids.missing,
    msg: bidMsg,
    setMsg: setBidMsg,
    forTrade: (key) => (tradeBids.project === currentProjectId ? tradeBids.list.filter((b) => b.trade_key === key) : []),
    async add(row) {
      const { data, error } = await supabase.from('remodel_trade_bids').insert({ project_id: currentProjectId, ...row }).select('*').single();
      if (error) { setBidMsg({ trade: row.trade_key, status: 'error', text: `Bid not saved: ${error.message}` }); return false; }
      setTradeBids((t) => ({ ...t, list: [...t.list, data] }));
      setBidMsg({ trade: row.trade_key, status: 'ok', text: `Bid from ${data.sub_name} added.` });
      return true;
    },
    async select(bid) {
      const others = tradeBids.list.filter((b) => b.trade_key === bid.trade_key && b.selected && b.id !== bid.id).map((b) => b.id);
      if (others.length) {
        const { error } = await supabase.from('remodel_trade_bids').update({ selected: false }).in('id', others);
        if (error) { setBidMsg({ trade: bid.trade_key, status: 'error', text: `Not selected: ${error.message}` }); return; }
      }
      const { error } = await supabase.from('remodel_trade_bids').update({ selected: true }).eq('id', bid.id);
      if (error) { setBidMsg({ trade: bid.trade_key, status: 'error', text: `Not selected: ${error.message}` }); return; }
      setTradeBids((t) => ({ ...t, list: t.list.map((b) => (b.trade_key === bid.trade_key ? { ...b, selected: b.id === bid.id } : b)) }));
      const sub = bid.sub_id != null ? subDirectory?.find((s) => s.id === bid.sub_id) : null;
      if (sub) assignTradeSub(bid.trade_key, { id: sub.id, name: subLabel(sub) });
      setBidMsg({ trade: bid.trade_key, status: 'ok', text: sub
        ? `Selected ${bid.sub_name} — also set as "Performed by".`
        : `Selected ${bid.sub_name}. "Performed by" was not changed — add them in Subcontractors to assign them.` });
    },
    async remove(bid) {
      if (!confirm(`Delete the bid from ${bid.sub_name} (${fmt(bid.amount)})?`)) return;
      const { error } = await supabase.from('remodel_trade_bids').delete().eq('id', bid.id);
      if (error) { setBidMsg({ trade: bid.trade_key, status: 'error', text: `Not deleted: ${error.message}` }); return; }
      setTradeBids((t) => ({ ...t, list: t.list.filter((b) => b.id !== bid.id) }));
    },
  };
  const subsApi = {
    list: subDirectory,
    assigned: (trade) => layout.subs?.[trade],
    onAssign: assignTradeSub,
  };
  // Subcontract Agreements per trade (migration 060), loaded with the Subs & Materials tab.
  const needAgreements = viewMode === 'trade' && !!currentProjectId && subAgreements.project !== currentProjectId;
  useEffect(() => {
    if (!needAgreements) return undefined;
    let live = true;
    const project = currentProjectId;
    supabase.from('sub_agreements').select('*').eq('project_id', project).order('created_at')
      .then(({ data, error }) => {
        if (!live) return;
        const missing = !!error && /sub_agreements|schema cache|does not exist/i.test(error.message ?? '');
        setSubAgreements({ project, list: error ? [] : (data ?? []), missing });
      });
    return () => { live = false; };
  }, [needAgreements, currentProjectId]);
  const agreementList = subAgreements.project === currentProjectId ? subAgreements.list : [];
  const putAgreement = (row) => setSubAgreements((a) => ({ ...a, list: a.list.some((x) => x.id === row.id) ? a.list.map((x) => (x.id === row.id ? row : x)) : [...a.list, row] }));
  const agreementFail = (trade, what, error) => setAgreementMsg({ trade, status: 'error', text: `${what}: ${error.message}` });
  const tradeSubInfo = (key) => {
    const pick = layout.subs?.[key];
    const sub = pick ? subDirectory?.find((x) => x.id === pick.id) ?? null : null;
    return { pick, sub, coi: sub ? coiState(sub.coi_expires_on) : null };
  };
  async function agreementSnapshot(terms, trade) {
    const { sub } = tradeSubInfo(trade.key);
    const problem = sendProblem({ terms, sub, scope: scopeApi.of(trade.key) });
    if (problem) { setAgreementMsg({ trade: trade.key, status: 'error', text: problem }); return null; }
    const { version } = await loadLatestStandards(supabase);
    return buildSnapshot({
      terms, trade, standards: version,
      scope: scopeApi.of(trade.key),
      project: { name: currentProjectName ?? config.label, type: config.label },
      sub: { name: sub.company || subLabel(sub), contact: sub.name ?? '', license: sub.license ?? '', phone: sub.phone?.[0] ?? '', email: sub.email?.[0] ?? '', address: sub.address ?? '' },
      items: trade.lines.map((l) => ({ label: l.item.label, section: l.div.label, by: suppliedBy(l.item) })),
      company: companyInfo(),
    });
  }
  const agreementsApi = {
    missing: subAgreements.missing,
    msg: agreementMsg,
    rep: { name: companyInfo().rep, title: companyInfo().title },
    current: (key) => {
      const list = agreementList.filter((a) => a.trade_key === key);
      return list.find((a) => a.status === 'draft' || a.status === 'sent') ?? list.at(-1) ?? null;
    },
    count: (key) => agreementList.filter((a) => a.trade_key === key).length,
    selectedBid: (key) => bidsApi.forTrade(key).find((b) => b.selected) ?? null,
    scopeOf: (key) => scopeApi.of(key),
    buildSnapshot: agreementSnapshot,
    subInfo: tradeSubInfo,
    async create(trade) {
      const { sub } = tradeSubInfo(trade.key);
      if (!sub) return;
      const bid = agreementsApi.selectedBid(trade.key);
      // The job address from this project's contract, when there is one.
      const { data: contract } = await supabase.from('contracts').select('project_address').eq('project_id', currentProjectId)
        .not('project_address', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle();
      const terms = defaultTerms(trade.key, { amount: bid ? String(bid.amount) : '', address: contract?.project_address ?? '' });
      const { data, error } = await supabase.from('sub_agreements')
        .insert({ project_id: currentProjectId, trade_key: trade.key, sub_id: sub.id, sub_name: subLabel(sub).slice(0, 120), terms })
        .select('*').single();
      if (error) { agreementFail(trade.key, 'Agreement not created', error); return; }
      putAgreement(data);
      setAgreementMsg({ trade: trade.key, status: 'ok', text: 'Draft created. Check the price, payment schedule and dates, then send it.' });
    },
    async save(ag, terms) {
      const { data, error } = await supabase.from('sub_agreements').update({ terms }).eq('id', ag.id).select('*').single();
      if (error) { agreementFail(ag.trade_key, 'Draft not saved', error); return; }
      putAgreement(data);
      setAgreementMsg({ trade: ag.trade_key, status: 'ok', text: 'Draft saved.' });
    },
    async send(ag, terms, trade) {
      const snapshot = await agreementSnapshot(terms, trade);
      if (!snapshot) return;
      const { sub } = tradeSubInfo(trade.key);
      const { data, error } = await supabase.from('sub_agreements')
        .update({ terms, snapshot, status: 'sent', sub_id: sub.id, sub_name: subLabel(sub).slice(0, 120) })
        .eq('id', ag.id).select('*').single();
      if (error) { agreementFail(ag.trade_key, 'Not sent', error); return; }
      putAgreement(data);
      setAgreementMsg({ trade: ag.trade_key, status: 'ok', text: 'Ready to sign — copy the link or click "Email…" to send it to the subcontractor.' });
    },
    async recall(ag) {
      if (!confirm('Take this agreement back to edit? The link you sent will stop working; you\'ll send a new link after your changes.')) return;
      const { data, error } = await supabase.from('sub_agreements').update({ status: 'draft' }).eq('id', ag.id).select('*').single();
      if (error) { agreementFail(ag.trade_key, 'Not changed', error); return; }
      putAgreement(data);
      setAgreementMsg({ trade: ag.trade_key, status: 'ok', text: 'Back to draft. The old link no longer works.' });
    },
    async remove(ag) {
      if (!confirm(ag.status === 'sent' ? 'Cancel this agreement? The link you sent will stop working.' : 'Delete this draft agreement?')) return;
      const { error } = await supabase.from('sub_agreements').delete().eq('id', ag.id);
      if (error) { agreementFail(ag.trade_key, 'Not deleted', error); return; }
      setSubAgreements((a) => ({ ...a, list: a.list.filter((x) => x.id !== ag.id) }));
      setAgreementMsg(null);
    },
    async countersign(ag, sig) {
      const { data, error } = await supabase.from('sub_agreements')
        .update({ status: 'countersigned', contractor_signature: { name: sig.name.trim(), title: sig.title.trim() } })
        .eq('id', ag.id).select('*').single();
      if (error) { agreementFail(ag.trade_key, 'Not countersigned', error); return; }
      putAgreement(data);
      setAgreementMsg({ trade: ag.trade_key, status: 'ok', text: 'Countersigned — the agreement is fully signed and locked.' });
    },
    async copy(trade, url) {
      let ok = false;
      try { await navigator.clipboard.writeText(url); ok = true; } catch { /* clipboard blocked */ }
      setAgreementMsg({ trade, status: ok ? 'ok' : 'error', text: ok ? 'Link copied.' : 'Could not copy — select the link and copy it.' });
    },
  };
  const sheetsApi = {
    amounts: showSheetAmounts,
    setAmounts: (on) => {
      setShowSheetAmounts(on);
      try { localStorage.setItem('rb-sheet-amounts', on ? '1' : '0'); } catch { /* storage unavailable */ }
    },
    print: (keys) => handleTradeSheets(keys),
  };
  const defaultScopeOf = (trade) => withoutLegacyGeneral(scopeDefaults[trade]) ?? starterScope(trade);
  function setTradeScope(trade, text) {
    setLayout((l) => ({ ...l, scopes: { ...(l.scopes ?? {}), [trade]: String(text).slice(0, MAX_SCOPE) } }));
    setScopeSave((p) => ({ ...p, [trade]: undefined }));
  }
  function resetTradeScope(trade) {
    setLayout((l) => {
      const scopes = { ...(l.scopes ?? {}) };
      delete scopes[trade];
      return { ...l, scopes };
    });
  }
  async function saveDefaultScope(trade) {
    const text = withoutLegacyGeneral(layout.scopes?.[trade]) ?? defaultScopeOf(trade);
    setScopeSave((p) => ({ ...p, [trade]: { status: 'saving' } }));
    const { error } = await supabase.from('trade_scope_templates').upsert({ trade_key: trade, scope: text }, { onConflict: 'trade_key' });
    if (error) {
      const missing = /trade_scope_templates|schema cache|does not exist/i.test(error.message ?? '');
      setScopeSave((p) => ({ ...p, [trade]: { status: 'error', msg: missing ? 'Not saved — run migration 053 in Supabase first.' : `Not saved: ${error.message}` } }));
      return;
    }
    setScopeDefaults((d) => ({ ...d, [trade]: text }));
    resetTradeScope(trade);   // this budget now follows the new default
    setScopeSave((p) => ({ ...p, [trade]: { status: 'saved', msg: 'Saved as your default scope.' } }));
  }
  const scopeApi = {
    of: (trade) => withoutLegacyGeneral(layout.scopes?.[trade]) ?? defaultScopeOf(trade),
    isEdited: (trade) => layout.scopes?.[trade] != null,
    hasSavedDefault: (trade) => scopeDefaults[trade] != null,
    saveState: scopeSave,
    onChange: setTradeScope,
    onReset: resetTradeScope,
    onSaveDefault: saveDefaultScope,
  };
  function changeViewMode(mode) {
    setViewMode(mode);
    try { localStorage.setItem('rb-view-mode', mode); } catch { /* storage unavailable */ }
  }
  function setLineTrade(item, div, trade) {
    if (!TRADE_KEYS.has(trade)) return;
    const def = defaultTrade(item.originalLabel ?? item.label, div.label);
    setLayout((l) => {
      const trades = { ...(l.trades ?? {}) };
      if (trade === def) delete trades[item.wbs]; else trades[item.wbs] = trade;
      return { ...l, trades };
    });
  }
  function setLineSplit(item, split) {
    const sp = clampSplit(split);
    const def = defaultCostSplit(item.originalLabel ?? item.label);
    setLayout((l) => {
      const splits = { ...(l.splits ?? {}) };
      if (sp.m === def.m && sp.o === def.o) delete splits[item.wbs]; else splits[item.wbs] = sp;
      return { ...l, splits };
    });
  }
  function restoreLine(wbs) { setLayout((l) => ({ ...l, removed: l.removed.filter((w) => w !== wbs) })); }
  function setInput(key, val)          { setInputs((p) => ({ ...p, [key]: val })); }
  function setPctRate(key, val)        { setPctRates((p) => ({ ...p, [key]: val })); }
  function toggleDiv(key)              { setOpenDivs((p) => ({ ...p, [key]: !(resolvedOpenDivs[key] ?? true) })); }

  // The Project Type drop-downs show the group that holds the current type.
  const currentGroup = PROJECT_GROUPS.find((g) => g.types.includes(projectType)) ?? PROJECT_GROUPS[0];
  const hasOverrides = Object.entries(overrideFlags).some(([w, on]) => on && !isCustomWbs(w)) || Object.keys(layout.factors ?? {}).length > 0;
  const showActuals  = !!currentProjectId && actualsOn;
  const actualByType = Object.entries(actualParts).reduce((acc, [wbs, p]) => {
    if (wbs === 'M.2') return acc;
    for (const k of Object.keys(EMPTY_PARTS)) acc[k] += p[k] || 0;
    return acc;
  }, { ...EMPTY_PARTS });
  const hasActuals   = Object.entries(actualVals).some(([wbs, v]) => wbs !== 'M.2' && (Number(v) || 0) > 0);

  // Cost breakdown of the direct costs: budget lines by their split, approved
  // design selections as materials, approved change orders on their own.
  const lineBreakdown = (item) => splitAmounts(lineVals[item.wbs] ?? 0, lineSplit(item, layout));
  // Who supplies a line's materials (trade sheets and agreements).
  const suppliedBy = (item) => (lineBreakdown(item).m > 0.5 ? 'Orozco Homes' : 'Subcontractor');
  const divBreakdown = (div) => div.items.filter((it) => it.unit !== 'pct').reduce((acc, it) => {
    const b = lineBreakdown(it);
    return { m: acc.m + b.m, s: acc.s + b.s, o: acc.o + b.o };
  }, { m: 0, s: 0, o: 0 });
  const budgetByType = config ? config.divisions.reduce((acc, div) => {
    const b = divBreakdown(div);
    return { m: acc.m + b.m, s: acc.s + b.s, o: acc.o + b.o };
  }, { m: designSpecsTotal, s: 0, o: 0 }) : { m: 0, s: 0, o: 0 };
  // Subs & Materials view: subcontract amounts by trade, materials by section.
  const subsMaterials = (() => {
    if (!config) return null;
    const byTrade = {}; const materials = []; const fees = [];
    for (const div of config.divisions) {
      const mats = [];
      for (const item of div.items) {
        if (item.unit === 'pct') continue;
        const lineTotal = lineVals[item.wbs] ?? 0;
        const sp = lineSplit(item, layout);
        const b = splitAmounts(lineTotal, sp);
        if (b.s > 0) {
          const trade = lineTrade(item, div, layout);
          (byTrade[trade] ??= []).push({ item, div, amount: b.s, lineTotal, pct: 100 - sp.m - sp.o, isDefault: !layout.trades?.[item.wbs] });
        }
        if (b.m > 0) mats.push({ item, amount: b.m });
        if (b.o > 0) fees.push({ item, div, amount: b.o });
      }
      if (mats.length) materials.push({ div, lines: mats, total: mats.reduce((s, l) => s + l.amount, 0) });
    }
    const trades = TRADES.filter((t) => byTrade[t.key]).map((t) => ({
      ...t, lines: byTrade[t.key], total: byTrade[t.key].reduce((s, l) => s + l.amount, 0),
    }));
    const sum = (arr) => arr.reduce((s, x) => s + (x.total ?? x.amount), 0);
    return {
      trades, materials, fees, designSpecsTotal, changeOrderCost: totals.changeOrderCost || 0,
      subTotal: sum(trades), materialTotal: sum(materials) + designSpecsTotal, feeTotal: sum(fees),
      directCosts: totals.directCosts,
    };
  })();
  const spentByType = { m: actualByType.material, s: actualByType.sub + actualByType.labor, o: actualByType.other };

  // Client allowances (shown on proposals and contracts).
  const allowanceOf = (item) => {
    const user = layout.allowances?.[item.wbs];
    const on = user ? user.on : isDefaultAllowance(item.originalLabel ?? item.label);
    const auto = roundTo50(lineBreakdown(item).m);
    return { on, amount: user?.amount ?? auto, isAuto: user?.amount == null };
  };
  const allowanceList = config ? config.divisions.flatMap((div) => div.items
    .filter((it) => it.unit !== 'pct')
    .map((it) => ({ item: it, div, ...allowanceOf(it) }))
    .filter((a) => a.on && a.amount > 0)) : [];
  const allowancesForClient = allowanceList.map((a) => ({ label: a.item.label, amount: a.amount }));
  // Client-facing names, as on proposals: no "(Mat + Labor)".
  const allowancesSnapshot = JSON.stringify(allowanceList.map((a) => ({
    key: a.item.wbs, label: a.item.label.replace(/\s*\((mat|material)s?\s*\+\s*labor\)/i, '').trim(), amount: a.amount,
  })));
  useEffect(() => { allowancesSnapshotRef.current = JSON.parse(allowancesSnapshot); }, [allowancesSnapshot]);
  // Keep the saved allowance list current for Designer Workspace, also for
  // budgets saved before it existed. Updates only that column of an existing
  // budget row (never creates one); errors (e.g. before migration 052) are ignored.
  const lastAllowanceWrite = useRef('');
  useEffect(() => {
    if (!currentProjectId) return undefined;
    const key = `${currentProjectId}|${allowancesSnapshot}`;
    const t = setTimeout(() => {
      if (syncingRef.current || lastAllowanceWrite.current === key) return;
      lastAllowanceWrite.current = key;
      supabase.from('remodel_budgets').update({ allowances_json: JSON.parse(allowancesSnapshot) }).eq('project_id', currentProjectId).then(() => {});
    }, 2000);
    return () => clearTimeout(t);
  }, [currentProjectId, allowancesSnapshot]);
  const allowanceTotal = allowanceList.reduce((s, a) => s + a.amount, 0);

  if (!config) return null;

  // ── Generate Contract ───────────────────────────────────────────────────────
  // Sends only client-facing values to the Contracts page (see contractPrefill.js):
  // client details, work descriptions, selections and the total client price.
  // Loads the selected project and its Manage Clients record.
  async function loadProjectAndClient(kind) {
    setContractError('');
    setGeneratingContract(kind);
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, project_name, managed_client_id')
      .eq('id', currentProjectId)
      .single();
    let client = null;
    if (!projectError && project.managed_client_id) {
      ({ data: client } = await supabase
        .from('clients')
        .select('id, full_name, email, phone')
        .eq('id', project.managed_client_id)
        .maybeSingle());
    }
    setGeneratingContract(false);
    if (projectError) { setContractError('Could not load the project. Try again.'); return null; }
    return { project, client };
  }

  // Work descriptions and selections only — never amounts.
  const clientScope = () => config.divisions
    .filter((div) => !div.items.every(isMarginLine))
    .map((div) => ({
      division: div.label,
      items: div.items.filter((item) => !isMarginLine(item) && (lineVals[item.wbs] ?? 0) > 0).map((item) => item.label),
    }));
  const clientMaterials = () => approvedSpecs.map((sp) =>
    [sp.product_name, sp.supplier && `(${sp.supplier})`, sp.quantity && `— ${sp.quantity} ${sp.unit_type ?? ''}`.trim()]
      .filter(Boolean).join(' '));

  async function handleGenerateContract() {
    if (!currentProjectId) return;
    const loaded = await loadProjectAndClient('contract');
    if (!loaded) return;
    const { project, client } = loaded;

    const values = buildContractPrefill({
      client,
      projectType: project.project_name || config.label,
      scope: clientScope(),
      changeOrders: approvedChangeOrders.filter((co) => coDelta(co) !== 0).map((co) => co.title),
      materials: clientMaterials(),
      allowances: allowancesForClient,
      clientPrice: totals.totalClientPrice,
    });

    dispatch({
      type: 'OPEN_CONTRACT_DRAFT',
      draft: {
        values,
        source: project.project_name,
        projectId: project.id,
        managedClientId: client?.id ?? null,
      },
    });
  }

  // ── Generate Proposal ───────────────────────────────────────────────────────
  // Same client-safe data as the contract; the price becomes an estimated range.
  async function handleGenerateProposal() {
    if (!currentProjectId) return;
    const loaded = await loadProjectAndClient('proposal');
    if (!loaded) return;
    const { project, client } = loaded;

    const values = buildProposalPrefill({
      client,
      projectTitle: project.project_name || config.label,
      scope: clientScope(),
      materials: clientMaterials(),
      allowances: allowancesForClient,
      clientPrice: totals.totalClientPrice,
    });

    dispatch({
      type: 'OPEN_PROPOSAL_DRAFT',
      draft: {
        values,
        source: project.project_name,
        projectId: project.id,
        managedClientId: client?.id ?? null,
        budgetPrice: Math.round(totals.totalClientPrice),
      },
    });
  }

  // ── Export to print window ──────────────────────────────────────────────────
  function handleExport() {
    const dateStr        = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const projectTypeName = TYPE_BUTTON_LABELS[projectType] ?? projectType;

    let specsTableHTML = '';
    if (approvedSpecs.length > 0) {
      const rows = approvedSpecs.map((sp) => `
        <tr>
          <td>${escHtml(sp.product_name)}</td>
          <td>${escHtml(sp.supplier || '—')}</td>
          <td class="amount">${escHtml(`${sp.quantity} ${sp.unit_type}`)}</td>
          <td class="amount">$${(Number(sp.installed_cost) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>`).join('');
      specsTableHTML = `
        <h2>Design Selections (Approved)</h2>
        <table>
          <thead><tr><th>Product</th><th>Supplier</th><th class="amount">Qty / Unit</th><th class="amount">Installed Cost</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td colspan="3" class="amount-label">Design Selections Total</td><td class="amount">$${designSpecsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr></tfoot>
        </table>`;
    }

    let changeOrdersHTML = '';
    if (approvedChangeOrders.length > 0) {
      // approved_by is the client's typed signature, so escape everything.
      const esc = escHtml;
      const money = (n) => `${n < 0 ? '−' : '+'}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      const rows = approvedChangeOrders.map((co) => `
        <tr>
          <td>${esc(co.title)}${co.category ? ` <span style="color:#9CA3AF">(${esc(co.category)})</span>` : ''}</td>
          <td>${esc([fmtCoDate(co.approved_at), co.approved_by].filter(Boolean).join(' · ') || '—')}</td>
          <td class="amount">${money(coDelta(co))}</td>
        </tr>`).join('');
      changeOrdersHTML = `
        <h2>Approved Change Orders</h2>
        <table>
          <thead><tr><th>Change Order</th><th>Approved</th><th class="amount">Price Change</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td colspan="2" class="amount-label">Approved Change Orders Total</td><td class="amount">${money(changeOrdersTotal)}</td></tr></tfoot>
        </table>`;
    }

    const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
    let wbsRowsHTML = '';
    for (const div of config.divisions) {
      const divTotal  = totals.divSums?.[div.key] ?? 0;
      const divActual = div.items.reduce((s, item) => (isMarginLine(item) ? s : s + (actualVals[item.wbs] ?? 0)), 0);
      const divVar    = divCostBudget(div, lineVals) - divActual;
      const varCol    = divVar < 0 ? '#DC2626' : '#065F46';
      const db = divBreakdown(div);
      const isPctDiv = div.items.every((it) => it.unit === 'pct');
      wbsRowsHTML += `<tr class="div-header">
        <td colspan="2">${escHtml(div.label)}</td>
        ${isPctDiv ? '<td></td><td></td><td></td>' : `<td class="amount m">${money(db.m)}</td><td class="amount s">${money(db.s)}</td><td class="amount o">${money(db.o)}</td>`}
        <td class="amount">$${Math.round(divTotal).toLocaleString('en-US')}</td>
        ${hasActuals ? `<td class="amount">$${Math.round(divActual).toLocaleString('en-US')}</td><td class="amount" style="color:${varCol}">${divVar >= 0 ? '+' : '−'}$${Math.round(Math.abs(divVar)).toLocaleString('en-US')}</td>` : ''}
      </tr>`;
      for (const item of div.items) {
        const val = lineVals[item.wbs] ?? 0;
        if (val === 0) continue;
        const act = isMarginLine(item) ? 0 : (actualVals[item.wbs] ?? 0);
        const vari = val - act;
        const lb = item.unit === 'pct' ? null : lineBreakdown(item);
        const al = item.unit === 'pct' ? null : allowanceOf(item);
        wbsRowsHTML += `<tr>
          <td class="wbs-code">${escHtml(item.badge ?? item.wbs)}</td>
          <td>${escHtml(item.label)}${al?.on && al.amount > 0 ? ' <span class="tag">Allowance</span>' : ''}</td>
          ${lb ? `<td class="amount m">${money(lb.m)}</td><td class="amount s">${money(lb.s)}</td><td class="amount o">${money(lb.o)}</td>` : '<td></td><td></td><td></td>'}
          <td class="amount">$${Math.round(val).toLocaleString('en-US')}</td>
          ${hasActuals ? `<td class="amount">${act > 0 ? '$' + Math.round(act).toLocaleString('en-US') : '—'}</td><td class="amount" style="color:${vari < 0 ? '#DC2626' : '#374151'}">${act > 0 ? (vari >= 0 ? '+' : '−') + '$' + Math.round(Math.abs(vari)).toLocaleString('en-US') : '—'}</td>` : ''}
        </tr>`;
      }
    }

    const paramRows = config.inputFields.map((f) =>
      `<div class="param-item"><div class="param-label">${f.label}</div><div class="param-value">${inputs[f.key] ?? f.default} ${f.unit}</div></div>`
    ).join('');

    const extraColHeaders = hasActuals ? '<th class="amount">Actual</th><th class="amount">Variance</th>' : '';

    // Cost breakdown and client allowances (internal printout).
    const bdBase = budgetByType.m + budgetByType.s + budgetByType.o;
    const breakdownHTML = `
      <h2>Cost Breakdown</h2>
      <table>
        <thead><tr><th>Type</th><th class="amount">Share</th><th class="amount">Budget</th>${hasActuals ? '<th class="amount">Spent</th><th class="amount">Left</th>' : ''}</tr></thead>
        <tbody>${COST_TYPES.map((t) => {
          const b = budgetByType[t.key]; const sp = spentByType[t.key];
          return `<tr><td style="font-weight:700;color:${t.color}">${t.label}</td>
            <td class="amount">${bdBase > 0 ? Math.round((b / bdBase) * 100) + '%' : '—'}</td>
            <td class="amount">${money(b)}</td>
            ${hasActuals ? `<td class="amount">${money(sp)}</td><td class="amount" style="color:${b - sp < 0 ? '#DC2626' : '#065F46'}">${b - sp < 0 ? '−' : ''}${money(Math.abs(b - sp))}${b - sp < 0 ? ' over' : ''}</td>` : ''}</tr>`;
        }).join('')}</tbody>
        <tfoot><tr><td class="amount-label">Direct costs by type</td><td></td><td class="amount">${money(bdBase)}</td>${hasActuals ? '<td></td><td></td>' : ''}</tr></tfoot>
      </table>
      <p class="note">${designSpecsTotal > 0 ? 'Approved design selections count as materials. ' : ''}${totals.changeOrderCost ? 'Approved change orders and contingency are not split.' : 'Contingency is not split.'}</p>`;
    const allowancesHTML = allowanceList.length ? `
      <h2>Client Allowances <span class="h2-note">(shown to the client — included in the price)</span></h2>
      <table>
        <thead><tr><th>Item</th><th>Section</th><th class="amount">Allowance</th></tr></thead>
        <tbody>${allowanceList.map((a) => `<tr><td>${escHtml(a.item.label)}</td><td>${escHtml(a.div.label)}</td><td class="amount">${money(a.amount)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="2" class="amount-label">Total Allowances</td><td class="amount">${money(allowanceTotal)}</td></tr></tfoot>
      </table>` : '';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Orozco Homes — Budget Estimate</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11pt;color:#1A1A1A;padding:40px 48px;max-width:820px;margin:0 auto}
    .header{display:flex;align-items:center;justify-content:space-between;padding-bottom:20px;border-bottom:2.5px solid #002147;margin-bottom:24px}
    .brand-mark{width:44px;height:44px;border-radius:10px;background:#002147;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14pt;color:#D4AF37;flex-shrink:0}
    .brand-info{margin-left:12px;flex:1}
    .brand-name{font-size:18pt;font-weight:900;color:#002147}
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
    th.m,td.m{color:#B45309} th.s,td.s{color:#0369A1} th.o,td.o{color:#6B7280}
    .tag{font-size:7pt;font-weight:700;color:#7C3AED;background:#F5F3FF;border-radius:3px;padding:1px 4px;margin-left:4px}
    .note{font-size:8pt;color:#9CA3AF;margin-bottom:6px}
    .h2-note{font-size:7.5pt;font-weight:600;color:#9CA3AF;text-transform:none;letter-spacing:0}
    tfoot tr td{font-weight:700;border-top:1.5px solid #D1D5DB;border-bottom:none;background:#F9FAFB}
    .totals-block{margin-top:20px;border:2px solid #002147;border-radius:8px;overflow:hidden}
    .totals-row{display:flex;justify-content:space-between;align-items:center;padding:8px 14px;font-size:10pt;border-bottom:1px solid #E5E7EB}
    .totals-row:last-child{border-bottom:none}
    .totals-row.sub{background:#F9FAFB}
    .totals-row.grand{background:#002147;color:#D4AF37;font-weight:900;font-size:14pt}
    .totals-row.grand .t-label{color:rgba(212,175,55,.75);font-size:10pt}
    .t-label{font-weight:600;color:#374151;font-size:9pt}
    .t-value{font-weight:700;font-variant-numeric:tabular-nums}
.internal{display:inline-block;margin-top:4px;font-size:7.5pt;font-weight:800;letter-spacing:.1em;color:#B45309;border:1px solid #FDE68A;background:#FFFBEB;border-radius:4px;padding:1px 6px}
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
    <div class="doc-meta"><strong>Budget Estimate — ${escHtml(currentProjectName ?? '')}</strong>${dateStr}<br><span class="internal">INTERNAL — NOT FOR THE CLIENT</span></div>
  </div>
  <h2>Project Parameters</h2>
  <div class="params-grid">
    <div class="param-item"><div class="param-label">Project Type</div><div class="param-value">${projectTypeName}</div></div>
    <div class="param-item"><div class="param-label">Spec Level</div><div class="param-value">${SPEC_LABELS[specLevel]}</div></div>
    ${paramRows}
  </div>
  ${specsTableHTML}
  ${changeOrdersHTML}
  <h2>Work Breakdown Structure${hasActuals ? ' — Budget vs Actual' : ''}</h2>
  <table>
    <thead><tr><th style="width:40px">WBS</th><th>Description</th><th class="amount m">Materials</th><th class="amount s">Subcontract</th><th class="amount o">Other / Fees</th><th class="amount">Budget</th>${extraColHeaders}</tr></thead>
    <tbody>${wbsRowsHTML}</tbody>
  </table>
  ${breakdownHTML}
  ${allowancesHTML}
  <div class="totals-block">
    <div class="totals-row sub"><span class="t-label">Direct Costs (Materials + Labor)</span><span class="t-value">$${Math.round(totals.directCosts).toLocaleString('en-US')}</span></div>
    ${totals.salesTax > 0 ? `<div class="totals-row sub"><span class="t-label">Materials Sales Tax (${pctRates.salesTaxPct ?? 0}% of materials)</span><span class="t-value">$${Math.round(totals.salesTax).toLocaleString('en-US')}</span></div>` : ''}
    <div class="totals-row sub"><span class="t-label">Contingency (${pctRates.contingencyPct}%)</span><span class="t-value">$${Math.round(totals.contingency).toLocaleString('en-US')}</span></div>
    <div class="totals-row sub"><span class="t-label">Gross Margin (${pctRates.profitPct}% of client price — covers overhead + profit)</span><span class="t-value">$${Math.round(totals.profit).toLocaleString('en-US')}</span></div>
    ${hasActuals ? `<div class="totals-row sub"><span class="t-label">Cost Budget (Direct${totals.salesTax > 0 ? ' + Tax' : ''} + Contingency)</span><span class="t-value">$${Math.round(totals.budgetCost).toLocaleString('en-US')}</span></div>` : ''}
    ${hasActuals ? `<div class="totals-row sub"><span class="t-label">Actual Cost Expended</span><span class="t-value" style="color:#0369A1">$${Math.round(totals.actualTotalCost).toLocaleString('en-US')}</span></div>` : ''}
    ${hasActuals ? `<div class="totals-row sub"><span class="t-label">Cost Variance (Cost Budget − Actual)</span><span class="t-value" style="color:${totals.totalVariance < 0 ? '#DC2626' : '#065F46'}">${totals.totalVariance >= 0 ? '+' : '−'}$${Math.round(Math.abs(totals.totalVariance)).toLocaleString('en-US')}</span></div>` : ''}
    <div class="totals-row grand"><span class="t-label">TOTAL CLIENT PRICE (BUDGET)</span><span class="t-value">$${Math.round(totals.totalClientPrice).toLocaleString('en-US')}</span></div>
  </div>
  <div class="footer-note">Orozco Homes LLC · Virginia Beach, VA · orozcoventures@gmail.com · Estimate valid 30 days.</div>
  <script>window.onload=function(){window.print()}</script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  }

  // ── Materials List (internal): what to buy, by section ─────────────────────
  // Each line's materials budget (from the cost breakdown), marked when it is a
  // client allowance, plus approved design selections at their material price.
  function handleMaterialsList() {
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
    let rowsHTML = '';
    let total = 0;
    for (const div of config.divisions) {
      const lines = div.items.filter((it) => it.unit !== 'pct')
        .map((it) => ({ it, m: lineBreakdown(it).m, al: allowanceOf(it) }))
        .filter((x) => x.m > 0.5);
      if (!lines.length) continue;
      const sub = lines.reduce((t, x) => t + x.m, 0);
      total += sub;
      rowsHTML += `<tr class="div-header"><td colspan="2">${escHtml(div.label)}</td><td></td><td class="amount">${money(sub)}</td></tr>`;
      rowsHTML += lines.map(({ it, m, al }) => `<tr>
        <td class="wbs-code">${escHtml(it.badge ?? it.wbs)}</td>
        <td>${escHtml(it.label)}</td>
        <td class="amount">${al.on && al.amount > 0 ? `<span class="tag">Allowance ${money(al.amount)}</span>` : ''}</td>
        <td class="amount">${money(m)}</td></tr>`).join('');
    }
    const specCost = (sp) => (Number(sp.unit_price) || 0) * (Number(sp.quantity) || 0) || (Number(sp.installed_cost) || 0);
    const specsTotal = approvedSpecs.reduce((t, sp) => t + specCost(sp), 0);
    const specsHTML = approvedSpecs.length ? `
      <h2>Approved Design Selections</h2>
      <table>
        <thead><tr><th>Product</th><th>Supplier</th><th class="amount">Qty</th><th class="amount">Material Price</th></tr></thead>
        <tbody>${approvedSpecs.map((sp) => `<tr><td>${escHtml(sp.product_name)}</td><td>${escHtml(sp.supplier || '—')}</td>
          <td class="amount">${escHtml(`${sp.quantity} ${sp.unit_type ?? ''}`)}</td><td class="amount">${money(specCost(sp))}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="3" class="amount-label">Design Selections Total</td><td class="amount">${money(specsTotal)}</td></tr></tfoot>
      </table>` : '';
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Orozco Homes — Materials List</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10.5pt;color:#1A1A1A;padding:40px 48px;max-width:820px;margin:0 auto}
  .header{display:flex;align-items:center;justify-content:space-between;padding-bottom:16px;border-bottom:2.5px solid #002147;margin-bottom:18px}
  .brand-name{font-size:17pt;font-weight:900;color:#002147}
  .brand-sub{font-size:8pt;color:#6B7280;text-transform:uppercase;letter-spacing:.12em;font-weight:600}
  .doc-meta{text-align:right;font-size:8pt;color:#6B7280}
  .doc-meta strong{display:block;font-size:10pt;color:#002147;margin-bottom:2px}
  .internal{display:inline-block;margin-top:4px;font-size:7.5pt;font-weight:800;letter-spacing:.1em;color:#B45309;border:1px solid #FDE68A;background:#FFFBEB;border-radius:4px;padding:1px 6px}
  h2{font-size:10pt;font-weight:800;color:#002147;text-transform:uppercase;letter-spacing:.1em;margin:18px 0 8px;border-left:3px solid #D4AF37;padding-left:8px}
  table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:9.5pt}
  th{text-align:left;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6B7280;border-bottom:1.5px solid #E5E7EB;padding:5px 6px}
  td{padding:5px 6px;border-bottom:1px solid #F3F4F6;vertical-align:top}
  .amount{text-align:right;font-variant-numeric:tabular-nums}
  .amount-label{text-align:right;font-weight:700;font-size:9pt;color:#002147}
  tr.div-header td{background:#F5F4F0;font-weight:700;font-size:9pt;color:#002147;border-bottom:1px solid #E5E7EB}
  .wbs-code{font-size:8pt;font-weight:700;color:#7C3AED;width:40px}
  .tag{font-size:7.5pt;font-weight:700;color:#7C3AED;background:#F5F3FF;border-radius:3px;padding:1px 5px}
  tfoot tr td{font-weight:700;border-top:1.5px solid #D1D5DB;border-bottom:none;background:#F9FAFB}
  .grand{margin-top:14px;display:flex;justify-content:space-between;padding:10px 14px;border:2px solid #002147;border-radius:8px;font-weight:800;color:#002147}
  .note{font-size:8pt;color:#9CA3AF;margin-top:14px}
  @media print{body{padding:0}@page{margin:.6in;size:letter portrait}}
</style></head><body>
  <div class="header">
    <div><div class="brand-name">Orozco Homes</div><div class="brand-sub">Design &amp; Construction · Virginia Beach, VA</div></div>
    <div class="doc-meta"><strong>Materials List — ${escHtml(currentProjectName ?? config.label)}</strong>${dateStr}<br><span class="internal">INTERNAL</span></div>
  </div>
  <h2>Materials by Section</h2>
  <table>
    <thead><tr><th style="width:40px">WBS</th><th>Item</th><th class="amount">Client Allowance</th><th class="amount">Materials Budget</th></tr></thead>
    <tbody>${rowsHTML || '<tr><td colspan="4">No materials in this budget.</td></tr>'}</tbody>
    <tfoot><tr><td colspan="3" class="amount-label">Materials Budget Total</td><td class="amount">${money(total)}</td></tr></tfoot>
  </table>
  ${specsHTML}
  <div class="grand"><span>Total Materials (budget${approvedSpecs.length ? ' + approved selections' : ''})</span><span>${money(total + specsTotal)}</span></div>
  <p class="note">Materials budget = each line's budget × its Materials %. Use for ordering and supplier quotes; compare purchases with these amounts. Internal — not for the client.</p>
  <script>window.onload=function(){window.print()}</script>
</body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  }

  // ── Trade sheets (Subs & Materials) ─────────────────────────────────────────
  // One printable page per trade for the subcontractor: project, scope of
  // work, work items, who supplies materials. Budget amounts only when "Show
  // amounts on trade sheets" is ticked. The sub signs the Subcontract
  // Agreement (online), not the sheet.
  function agreementNote(key) {
    const ag = agreementsApi.current(key);
    if (ag?.sub_signed_at) return `Signed Subcontract Agreement on file (signed by ${escHtml(ag.sub_signature?.name ?? '')} on ${escHtml(fmtLongDate(ag.sub_signed_at.slice(0, 10)))}). The agreement — Scope of Work plus the Orozco Homes Subcontractor Standards — governs this work.`;
    return 'This sheet is for reference. The work is performed under the Orozco Homes Subcontract Agreement for this trade (Scope of Work plus the Orozco Homes Subcontractor Standards), signed online before work starts.';
  }
  function handleTradeSheets(tradeKeys) {
    if (!subsMaterials) return;
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
    const company = COMPANY;
    const projectName = currentProjectName ?? config.label;
    const trades = subsMaterials.trades.filter((t) => tradeKeys.includes(t.key));
    if (!trades.length) return;
    const sheets = trades.map((t) => {
      const pick = layout.subs?.[t.key];
      const sub = pick ? subDirectory?.find((s) => s.id === pick.id) : null;
      const coi = sub ? coiState(sub.coi_expires_on) : null;
      const subName = sub ? subLabel(sub) : pick?.name ?? '';
      const subHTML = subName
        ? `<strong>${escHtml(subName)}</strong>${sub?.name && sub.name !== subName ? `<br>${escHtml(sub.name)}` : ''}
           ${sub?.phone?.[0] ? `<br>${escHtml(sub.phone[0])}` : ''}${sub?.email?.[0] ? `<br>${escHtml(sub.email[0])}` : ''}
           ${sub ? `<br><span class="coi ${coi}">${escHtml(COI_CHIP[coi].label)}${sub.coi_expires_on ? ` · ${coi === 'expired' ? 'expired' : 'expires'} ${escHtml(formatCoiDate(sub.coi_expires_on))}` : ''}</span>` : ''}`
        : '<span class="blank">Not assigned</span>';
      const rows = t.lines.map((l) => `<tr><td>${escHtml(l.item.label)}</td><td class="muted">${escHtml(l.div.label)}</td>
          <td>${suppliedBy(l.item)}</td>${showSheetAmounts ? `<td class="amount">${money(l.amount)}</td>` : ''}</tr>`).join('');
      return `<section class="sheet">
  <div class="header">
    <div><div class="brand-name">Orozco Homes</div><div class="brand-sub">Design &amp; Construction · Virginia Beach, VA</div></div>
    <div class="doc-meta"><strong>Trade Sheet — ${escHtml(t.label)}</strong>${dateStr}</div>
  </div>
  <div class="info">
    <div><div class="label">Project</div><strong>${escHtml(projectName)}</strong><br><span class="muted">${escHtml(config.label)}</span></div>
    <div><div class="label">Subcontractor</div>${subHTML}</div>
    <div><div class="label">Orozco Homes contact</div>${escHtml(company.company_rep_name)}${company.company_rep_title ? `, ${escHtml(company.company_rep_title)}` : ''}<br>${escHtml(company.company_phone)}<br>${escHtml(company.company_email)}</div>
  </div>
  <h2>Scope of Work</h2>
  <div class="scope">${escHtml(scopeApi.of(t.key)) || '<span class="blank">No scope written yet.</span>'}</div>
  <h2>Work Items</h2>
  <table>
    <thead><tr><th>Item</th><th>Section</th><th>Materials supplied by</th>${showSheetAmounts ? '<th class="amount">Amount</th>' : ''}</tr></thead>
    <tbody>${rows}</tbody>
    ${showSheetAmounts ? `<tfoot><tr><td colspan="3" class="amount-label">Total — ${escHtml(t.label)}</td><td class="amount">${money(t.total)}</td></tr></tfoot>` : ''}
  </table>
  <h2>Agreement</h2>
  <p class="small">${agreementNote(t.key)}</p>
  <p class="foot">Orozco Homes · ${escHtml(company.company_license)} · ${escHtml(company.company_phone)} · ${escHtml(company.company_email)}</p>
</section>`;
    }).join('');
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Orozco Homes — Trade Sheet${trades.length > 1 ? 's' : ''}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10.5pt;color:#1A1A1A;padding:40px 48px;max-width:820px;margin:0 auto}
  .sheet + .sheet{margin-top:48px;padding-top:40px;border-top:1px dashed #D1D5DB}
  .header{display:flex;align-items:center;justify-content:space-between;padding-bottom:16px;border-bottom:2.5px solid #002147;margin-bottom:16px}
  .brand-name{font-size:17pt;font-weight:900;color:#002147}
  .brand-sub{font-size:8pt;color:#6B7280;text-transform:uppercase;letter-spacing:.12em;font-weight:600}
  .doc-meta{text-align:right;font-size:8pt;color:#6B7280}
  .doc-meta strong{display:block;font-size:11pt;color:#002147;margin-bottom:2px}
  .info{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;padding:12px 14px;background:#F8F9FB;border:1px solid #E5E7EB;border-radius:8px;font-size:9.5pt;line-height:1.45}
  .label{font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6B7280;margin-bottom:3px}
  .muted{color:#6B7280}
  .blank{color:#9CA3AF;font-style:italic}
  .coi{font-size:8pt;font-weight:700}
  .coi.active{color:#166534}.coi.expiring{color:#92400E}.coi.expired{color:#991B1B}.coi.none{color:#6B7280}
  h2{font-size:10pt;font-weight:800;color:#002147;text-transform:uppercase;letter-spacing:.1em;margin:18px 0 8px;border-left:3px solid #D4AF37;padding-left:8px}
  .scope{white-space:pre-wrap;font-size:10pt;line-height:1.55}
  table{width:100%;border-collapse:collapse;font-size:9.5pt}
  th{text-align:left;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6B7280;border-bottom:1.5px solid #E5E7EB;padding:5px 6px}
  td{padding:5px 6px;border-bottom:1px solid #F3F4F6;vertical-align:top}
  .amount{text-align:right;font-variant-numeric:tabular-nums}
  .amount-label{text-align:right;font-weight:700;color:#002147}
  tfoot td{font-weight:700;border-top:1.5px solid #D1D5DB;background:#F9FAFB}
  .small{font-size:9pt;color:#374151;line-height:1.5}
  .foot{margin-top:28px;font-size:7.5pt;color:#9CA3AF;text-align:center}
  @media print{body{padding:0}.sheet + .sheet{margin-top:0;padding-top:0;border-top:none;break-before:page}@page{margin:.6in;size:letter portrait}}
</style></head><body>
${sheets}
  <script>window.onload=function(){window.print()}</script>
</body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  }

  // ── Estimate versions (migration 056) ───────────────────────────────────────
  // What a saved version keeps: the estimate's saved fields, each line's amount
  // and the totals at that moment.
  function versionSnapshot() {
    return {
      budget: {
        project_type: projectType, spec_level: specLevel, inputs_json: inputs, pct_rates_json: pctRates,
        overrides_json: userVals, flags_json: overrideFlags, layout_json: layout,
      },
      lines: config.divisions.flatMap((div) => div.items.map((it) => ({
        wbs: it.wbs, label: it.label, section: div.label, value: Math.round(lineVals[it.wbs] ?? 0),
      }))),
      totals: {
        clientPrice: Math.round(totals.totalClientPrice ?? 0), directCosts: Math.round(totals.directCosts ?? 0),
        budgetCost: Math.round(totals.budgetCost ?? 0), margin: Math.round(totals.profit ?? 0),
      },
    };
  }
  function restoreVersion(b) {
    if (!b || typeof b !== 'object') return;
    const type = getProjectConfig(b.project_type) ? b.project_type : projectType;
    setProjectType(type);
    setInputs({ ...defaultInputs(type), ...(b.inputs_json || {}) });
    setSpecLevel(SPEC_LEVELS.includes(b.spec_level) ? b.spec_level : 'mid');
    setPctRates({ ...DEFAULT_PCT_RATES, salesTaxPct: 0, ...(b.pct_rates_json || {}) });
    setUserVals(b.overrides_json || {});
    setOverrideFlags(b.flags_json || {});
    setLayout(upgradeLayout(normalizeLayout(b.layout_json), getProjectConfig(type)));
  }

  // ── Delete this budget ──────────────────────────────────────────────────────
  // Removes only this project's budget (remodel_budgets row) and its actual
  // costs. The project, client, photos, updates, selections, change orders,
  // proposals and contracts stay.
  async function deleteThisBudget() {
    if (!currentProjectId) return;
    const id = currentProjectId;
    const name = currentProjectName ?? 'this project';
    if (!confirm(`Delete the budget for "${name}" (Total Client Price ${fmt(totals.totalClientPrice)})?\n\n`
      + 'This removes this budget\'s lines, prices and actual costs. The project, client, photos, updates, '
      + 'proposals and contracts stay.\n\nThis can\'t be undone.')) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    syncingRef.current = true;   // no auto-save while deleting
    setDeleteMsg({ status: 'deleting', msg: 'Deleting…' });
    const actualsRes = await supabase.from('remodel_budget_actuals').delete().eq('project_id', id);
    const budgetRes = actualsRes.error ? actualsRes : await supabase.from('remodel_budgets').delete().eq('project_id', id);
    if (budgetRes.error) {
      syncingRef.current = false;
      setDeleteMsg({ status: 'error', msg: `Not deleted: ${budgetRes.error.message}` });
      return;
    }
    setSelectedProjId('');       // clears the page; picking the project again starts a fresh budget
    setDeleteMsg({ status: 'deleted', msg: `The budget for "${name}" was deleted.` });
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between mb-6 gap-4">
        <div className="min-w-[260px] flex-1">
          <p className="text-xs font-bold tracking-[0.18em] uppercase mb-0.5" style={{ color: '#D4AF37' }}>
            Contractor Tool
          </p>
          <h1 className="text-2xl font-extrabold" style={{ color: '#002147' }}>
            Remodel Estimate
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Live WBS estimator — Virginia Beach / Hampton Roads, 2026.
          </p>

          {/* Project picker */}
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <div className="flex items-center gap-2 flex-1 min-w-48 max-w-xs">
              <select
                value={selectedProjId}
                onChange={(e) => { setSelectedProjId(e.target.value); setDeleteMsg(null); }}
                className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
                style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}
              >
                <option value="">— No project (unsaved estimate) —</option>
                <ProjectOptions projects={dbProjects} />
              </select>
            </div>
            {saving && <span className="text-xs" style={{ color: '#9CA3AF' }}>Saving…</span>}
            {!saving && lastSaved && (
              <span className="text-xs" style={{ color: '#9CA3AF' }}>
                Saved {lastSaved.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
            {budgetLoading && <span className="text-xs" style={{ color: '#9CA3AF' }}>Loading…</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-1">
          {hasOverrides && (
            <button onClick={resetAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
              style={{ backgroundColor: '#FFFBEB', color: '#D97706', border: '1px solid #FCD34D' }}>
              &#8635; Reset overrides
            </button>
          )}
          <button onClick={handleMaterialsList}
            title="Internal list of materials to buy, by section. Don't send this to clients."
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
            style={{ backgroundColor: '#fff', color: '#B45309', border: '1.5px solid #FDE68A' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Materials List
          </button>
          <button onClick={handleExport}
            title="Internal budget with costs and margin. Don't send this to clients."
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
            style={{ backgroundColor: '#fff', color: '#002147', border: '1.5px solid #E8E6E1' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="12" y2="18"/>
              <line x1="15" y1="15" x2="12" y2="18"/>
            </svg>
            Export Budget (Internal)
          </button>
          <button onClick={handleGenerateProposal}
            disabled={!currentProjectId || generatingContract || budgetLoading}
            title={currentProjectId ? 'Open a project proposal filled with this client and an estimated range' : 'Pick a project first'}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#D4AF37', color: '#002147' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
            </svg>
            {generatingContract === 'proposal' ? 'Opening…' : 'Generate Proposal'}
          </button>
          <button onClick={handleGenerateContract}
            disabled={!currentProjectId || generatingContract || budgetLoading}
            title={currentProjectId ? 'Open a contract filled with this client and the total price' : 'Pick a project first'}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#002147', color: '#D4AF37' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <path d="M9 15l2 2 4-4"/>
            </svg>
            {generatingContract === 'contract' ? 'Opening…' : 'Generate Contract'}
          </button>
        </div>
      </div>
      {!currentProjectId && (
        <p className="-mt-4 mb-4 text-xs text-right" style={{ color: '#9CA3AF' }}>
          Pick a project to generate its proposal or contract.
        </p>
      )}
      {contractError && (
        <p role="alert" className="-mt-4 mb-4 text-xs text-right" style={{ color: '#DC2626' }}>{contractError}</p>
      )}

      {/* Saved versions of this estimate (full width, under the header) */}
      <div className="-mt-3 mb-5">
        <BudgetVersions projectId={currentProjectId} getSnapshot={versionSnapshot} onRestore={restoreVersion} />
      </div>

      {/* Project type selector */}
      <div className="rounded-2xl p-5 mb-5"
        style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.05)' }}>
        <p className="text-xs font-bold tracking-[0.14em] uppercase mb-3" style={{ color: '#002147' }}>Project Type</p>
        {/* Two drop-downs: pick a category, then a project in it */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="rb-category" className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Category</label>
            <select id="rb-category" value={currentGroup?.label ?? ''}
              onChange={(e) => {
                const group = PROJECT_GROUPS.find((g) => g.label === e.target.value);
                if (group) changeProjectType(group.types[0]);
              }}
              className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold focus:outline-none"
              style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#002147' }}>
              {PROJECT_GROUPS.map((g) => <option key={g.label} value={g.label}>{g.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="rb-project-type" className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Project</label>
            <select id="rb-project-type" value={projectType} onChange={(e) => changeProjectType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold focus:outline-none"
              style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#002147' }}>
              {(currentGroup?.types ?? []).map((typeId) => (
                <option key={typeId} value={typeId}>{getProjectConfig(typeId)?.label ?? TYPE_BUTTON_LABELS[typeId]}{myTemplates[typeId] ? ' — my template' : ''}</option>
              ))}
            </select>
          </div>
        </div>
        {/* My template for this project type */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-4 pt-4 text-xs" style={{ borderTop: '1px solid #F3F4F6' }} data-testid="my-template">
          {myTemplates[projectType] ? (
            <span style={{ color: '#059669' }} className="font-semibold">
              ✓ My template saved for {config.label}
              {myTemplates[projectType].updatedAt ? ` (${new Date(myTemplates[projectType].updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})` : ''}
            </span>
          ) : (
            <span style={{ color: '#6B7280' }}>Using the Orozco Homes built-in template.</span>
          )}
          <button type="button" onClick={saveMyTemplate} disabled={templateMsg?.status === 'saving'}
            className="px-3 py-1.5 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-60"
            style={{ backgroundColor: '#002147', color: '#fff' }}>
            {myTemplates[projectType] ? 'Update my template' : 'Save as my template'}
          </button>
          {myTemplates[projectType] && (
            <>
              <button type="button" onClick={applyMyTemplate}
                className="px-3 py-1.5 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-sky-300"
                style={{ border: '1px solid #002147', color: '#002147', backgroundColor: '#fff' }}>
                Apply my template
              </button>
              <button type="button" onClick={deleteMyTemplate} className="font-semibold hover:underline focus:outline-none" style={{ color: '#9CA3AF' }}>
                Delete template
              </button>
            </>
          )}
          {templateMsg?.msg && templateMsg.status !== 'saving' && (
            <span role={templateMsg.status === 'error' ? 'alert' : 'status'} className="font-semibold"
              style={{ color: templateMsg.status === 'error' ? '#DC2626' : '#059669' }}>{templateMsg.msg}</span>
          )}
          <p className="w-full" style={{ color: '#9CA3AF' }}>
            Your template keeps this budget's lines, names, prices, cost splits, trades, allowances, margin and contingency.
            New {config.label} budgets start from it; size, actual costs, scopes and subcontractors stay with each job.
          </p>
        </div>

      </div>

      {/* Project parameters */}
      <div className="rounded-2xl p-6 mb-5"
        style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.05)' }}>
        <p className="text-xs font-bold tracking-[0.14em] uppercase mb-4" style={{ color: '#002147' }}>Project Parameters</p>
        {config.inputFields.length > 0 && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          {config.inputFields.map((field) => (
            <NumberInput key={field.key} label={field.label}
              value={inputs[field.key] ?? field.default}
              onChange={(v) => setInput(field.key, v)}
              min={field.min} max={field.max} step={field.step} suffix={field.unit}
            />
          ))}
        </div>}
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
          <SummaryCard label="Total Client Price (Budget)" value={fmt(totals.totalClientPrice)}
            sub={totals.costPerSqft != null ? `${fmt(totals.costPerSqft)}/sqft` : undefined}
            highlight />
        </div>
        <SummaryCard label="Direct Costs" value={fmt(totals.directCosts)} sub="Materials + labor" />
        <SummaryCard label="Contractor Margin" value={fmt(totals.contractorMargin)} sub="Overhead + profit" />
        <SummaryCard label="Gross Margin %" value={fmtPct(totals.marginPct)} sub={`Target ${pctRates.profitPct}% of client price`}
          color={totals.marginPct >= totals.marginTarget - 0.0005 ? '#059669' : '#D97706'} />
      </div>

      {/* Cost breakdown — Materials / Subcontract / Other (internal) */}
      {breakdownOn && (() => {
        const rows = COST_TYPES.map((t) => ({ ...t, budget: budgetByType[t.key], spent: spentByType[t.key] }));
        const base = rows.reduce((s, r) => s + r.budget, 0);
        return (
          <div className="rounded-2xl p-5 mb-5" style={{ backgroundColor: '#fff', border: '1.5px solid #FDE68A', boxShadow: '0 2px 12px rgba(180,83,9,0.06)' }}>
            <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
              <p className="text-xs font-bold tracking-[0.14em] uppercase" style={{ color: '#B45309' }}>Cost Breakdown</p>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>Internal — not shown on proposals or contracts</p>
            </div>
            {base > 0 && (
              <div className="flex h-2.5 rounded-full overflow-hidden mb-4" aria-hidden="true">
                {rows.map((r) => <div key={r.key} style={{ width: `${(r.budget / base) * 100}%`, backgroundColor: r.color }} />)}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                    <th className="text-left font-semibold pb-1.5">Type</th>
                    <th className="text-right font-semibold pb-1.5">Share</th>
                    <th className="text-right font-semibold pb-1.5">Budget</th>
                    {hasActuals && <th className="text-right font-semibold pb-1.5">Spent</th>}
                    {hasActuals && <th className="text-right font-semibold pb-1.5">Left</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key} style={{ borderTop: '1px solid #F3F4F6' }}>
                      <td className="py-1.5 font-semibold" style={{ color: r.color }}>{r.label}</td>
                      <td className="py-1.5 text-right" style={{ color: '#6B7280' }}>{base > 0 ? `${Math.round((r.budget / base) * 100)}%` : '—'}</td>
                      <td className="py-1.5 text-right font-bold" style={{ color: '#002147' }}>{fmt(r.budget)}</td>
                      {hasActuals && <td className="py-1.5 text-right" style={{ color: '#0369A1' }}>{fmt(r.spent)}</td>}
                      {hasActuals && (
                        <td className="py-1.5 text-right font-bold" style={{ color: r.budget - r.spent < 0 ? '#DC2626' : '#059669' }}>
                          {r.budget - r.spent < 0 ? '−' : ''}{fmt(Math.abs(r.budget - r.spent))}{r.budget - r.spent < 0 ? ' over' : ''}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs mt-3" style={{ color: '#9CA3AF' }}>
              Direct costs by type{designSpecsTotal > 0 ? ' (approved design selections count as materials)' : ''}.
              {totals.changeOrderCost ? ` Approved change orders (${fmt(totals.changeOrderCost)} cost) and contingency are not split.` : ' Contingency is not split.'}
              {actualByType.unsplit > 0 ? ` ${fmt(actualByType.unsplit)} of actuals was entered before the split and isn't counted here.` : ''}
              {' '}Change any line's split under it.
            </p>
          </div>
        );
      })()}

      {/* Allowances — what the client sees on proposals and contracts */}
      {breakdownOn && (
        <div className="rounded-2xl p-5 mb-5" style={{ backgroundColor: '#fff', border: '1.5px solid #DDD6FE' }}>
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
            <p className="text-xs font-bold tracking-[0.14em] uppercase" style={{ color: '#7C3AED' }}>Client Allowances</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Shown on proposals and contracts — already included in the price</p>
          </div>
          {allowanceList.length === 0 ? (
            <p className="text-xs" style={{ color: '#9CA3AF' }}>No allowances. Tick "Allowance" under any line to add one.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {allowanceList.map((a) => (
                  <tr key={a.item.wbs} style={{ borderTop: '1px solid #F3F4F6' }}>
                    <td className="py-1.5" style={{ color: '#374151' }}>{a.item.label} <span className="text-xs" style={{ color: '#9CA3AF' }}>· {a.div.label}</span></td>
                    <td className="py-1.5 text-right font-bold" style={{ color: '#002147' }}>{fmt(a.amount)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '1.5px solid #DDD6FE' }}>
                  <td className="py-1.5 text-xs font-bold uppercase tracking-wide" style={{ color: '#7C3AED' }}>Total allowances</td>
                  <td className="py-1.5 text-right font-extrabold" style={{ color: '#7C3AED' }}>{fmt(allowanceTotal)}</td>
                </tr>
              </tbody>
            </table>
          )}
          <p className="text-xs mt-3" style={{ color: '#9CA3AF' }}>
            Amounts start as each line's materials amount (rounded) and can be changed under the line. If the client's selections cost more,
            the difference is added by change order; if less, it's credited.
          </p>
        </div>
      )}

      {/* Budget vs Actual summary bar — shown once actuals exist */}
      {hasActuals && (
        <div className="rounded-2xl p-5 mb-5"
          style={{ backgroundColor: '#fff', border: '1.5px solid #BAE6FD', boxShadow: '0 2px 12px rgba(3,105,161,0.08)' }}>
          <p className="text-xs font-bold tracking-[0.14em] uppercase mb-4" style={{ color: '#0369A1' }}>
            Budget vs. Actual — Project Summary
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>Cost Budget</p>
              <p className="text-lg font-extrabold" style={{ color: '#002147' }}>{fmt(totals.budgetCost)}</p>
              <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Direct + contingency</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>Actual Cost</p>
              <p className="text-lg font-extrabold" style={{ color: '#0369A1' }}>{fmt(totals.actualTotalCost)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>Variance</p>
              <p className="text-lg font-extrabold"
                style={{ color: totals.totalVariance < 0 ? '#DC2626' : '#059669' }}>
                {totals.totalVariance >= 0 ? '+' : '−'}{fmt(Math.abs(totals.totalVariance))}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                {totals.totalVariance >= 0 ? 'Under budget' : 'Over budget'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>Projected Margin</p>
              <p className="text-lg font-extrabold"
                style={{ color: totals.projectedMarginPct >= totals.marginTarget - 0.0005 ? '#059669' : '#D97706' }}>
                {fmt(totals.projectedMargin)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                {fmtPct(totals.projectedMarginPct)} of client price
              </p>
            </div>
          </div>
          {/* Visual progress bar */}
          {totals.budgetCost > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1" style={{ color: '#9CA3AF' }}>
                <span>Actuals: {Math.round((totals.actualTotalCost / totals.budgetCost) * 100)}% of cost budget spent</span>
                <span>{fmt(totals.budgetCost)} cost budget</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((totals.actualTotalCost / totals.budgetCost) * 100, 100)}%`,
                    backgroundColor: totals.totalVariance < 0 ? '#EF4444' : '#0369A1',
                  }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* View by: Estimate (the budget sections) | Subs & Materials (by trade) */}
      <div className="flex items-center gap-3 px-1 mb-3 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6B7280' }} id="rb-view-label">View by</span>
        <div role="radiogroup" aria-labelledby="rb-view-label" className="inline-flex rounded-xl p-0.5" style={{ backgroundColor: '#EEF0F3' }}>
          {[['phase', 'Estimate'], ['trade', 'Subs & Materials']].map(([mode, label]) => (
            <button key={mode} type="button" role="radio" aria-checked={viewMode === mode} onClick={() => changeViewMode(mode)}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300"
              style={viewMode === mode
                ? { backgroundColor: '#002147', color: '#fff' }
                : { backgroundColor: 'transparent', color: '#4B5563' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'trade' && subsMaterials && (
        <>
          {layoutError && (
            <p role="alert" className="px-4 mb-2 text-xs font-semibold" style={{ color: '#DC2626' }}>{layoutError}</p>
          )}
          {subDirError && (
            <p role="alert" className="px-4 mb-2 text-xs font-semibold" style={{ color: '#DC2626' }}>{subDirError}</p>
          )}
          <SubsMaterialsView data={subsMaterials} onTradeChange={setLineTrade} scope={scopeApi} subs={subsApi} sheets={sheetsApi} bids={bidsApi} agreements={agreementsApi} />
        </>
      )}

      {viewMode === 'phase' && (<>
      {/* Actuals + cost breakdown switches, column headers (headers on desktop only) */}
      <div className="flex items-center gap-4 px-4 pb-1 mb-0.5 flex-wrap">
        {currentProjectId && (
        <button type="button" role="switch" aria-checked={actualsOn} onClick={() => setActualsOn((v) => !v)}
          className="flex items-center gap-2 text-xs font-semibold focus:outline-none" style={{ color: '#0369A1' }}>
          <span className="relative inline-block w-8 h-4 rounded-full transition-colors"
            style={{ backgroundColor: actualsOn ? '#0369A1' : '#D1D5DB' }}>
            <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
              style={{ left: actualsOn ? '1.125rem' : '0.125rem' }} />
          </span>
          Show actuals
        </button>
        )}
        <button type="button" role="switch" aria-checked={breakdownOn} onClick={() => setBreakdownOn((v) => !v)}
          className="flex items-center gap-2 text-xs font-semibold focus:outline-none" style={{ color: '#B45309' }}>
          <span className="relative inline-block w-8 h-4 rounded-full transition-colors"
            style={{ backgroundColor: breakdownOn ? '#B45309' : '#D1D5DB' }}>
            <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
              style={{ left: breakdownOn ? '1.125rem' : '0.125rem' }} />
          </span>
          Show cost breakdown
        </button>
        <div className="flex-1" />
        {showActuals && (
          <>
            <div className="w-14 hidden sm:block" />
            <div className="hidden sm:block text-xs font-bold uppercase tracking-wide text-center shrink-0" style={{ width: 110, color: '#6B7280' }}>Budgeted</div>
            <div className="w-6 hidden sm:block shrink-0" />
            <div className="hidden sm:block text-xs font-bold uppercase tracking-wide text-center shrink-0" style={{ width: 110, color: '#0369A1' }}>Actual</div>
            <div className="hidden sm:block text-xs font-bold uppercase tracking-wide text-center shrink-0" style={{ width: 86, color: '#6B7280' }}>Variance</div>
          </>
        )}
      </div>
      {actualsError && (
        <p role="alert" className="px-4 mb-2 text-xs font-semibold" style={{ color: '#DC2626' }}>{actualsError}</p>
      )}
      {layoutError && (
        <p role="alert" className="px-4 mb-2 text-xs font-semibold" style={{ color: '#DC2626' }}>{layoutError}</p>
      )}

      {/* Design Selections division */}
      <div className="space-y-3 mb-3">
        <DesignSpecsSection
          approvedSpecs={approvedSpecs}
          total={designSpecsTotal}
          isOpen={specsDivOpen}
          onToggle={() => setSpecsDivOpen((o) => !o)}
        />
        <ChangeOrdersSection
          changeOrders={approvedChangeOrders}
          total={changeOrdersTotal}
          cost={totals.changeOrderCost}
          margin={totals.changeOrderMargin}
          marginPct={pctRates.profitPct}
          isOpen={coDivOpen}
          onToggle={() => setCoDivOpen((o) => !o)}
        />
      </div>

      {/* WBS divisions */}
      <div className="space-y-3">
        {config.divisions.map((div) => {
          const ds       = divStyle(div.num);
          const isOpen   = resolvedOpenDivs[div.key] ?? true;
          const divTotal = totals.divSums?.[div.key] ?? 0;
          const divActual = div.items.reduce((s, item) => (isMarginLine(item) ? s : s + (actualVals[item.wbs] ?? 0)), 0);
          const divVariance = divCostBudget(div, lineVals) - divActual;
          const divHasActual = div.items.some((item) => !isMarginLine(item) && (actualVals[item.wbs] ?? 0) > 0);

          return (
            <div key={div.key} className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${ds.border}` }}>

              {/* Division header */}
              <button onClick={() => toggleDiv(div.key)}
                className="w-full flex items-center justify-between px-5 py-4 focus:outline-none"
                style={{ backgroundColor: ds.bg }}>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0"
                    style={{ backgroundColor: ds.color, color: '#fff' }}>{div.num}</span>
                  <span className="text-sm font-bold text-left" style={{ color: ds.color }}>{div.label}</span>
                </div>

                <div className="flex items-center gap-4">
                  {/* Budget total */}
                  <div className="text-right">
                    <p className="text-xs hidden sm:block" style={{ color: `${ds.color}90` }}>Budget</p>
                    <p className="text-sm font-extrabold" style={{ color: ds.color }}>{fmt(divTotal)}</p>
                  </div>

                  {/* Actual total (desktop, only when there are actuals for this div) */}
                  {hasActuals && divHasActual && (
                    <div className="text-right hidden md:block">
                      <p className="text-xs" style={{ color: '#0369A1' }}>Actual</p>
                      <p className="text-sm font-bold" style={{ color: '#0369A1' }}>{fmt(divActual)}</p>
                    </div>
                  )}

                  {/* Variance (desktop) */}
                  {hasActuals && divHasActual && (
                    <div className="text-right hidden md:block">
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>Variance</p>
                      <p className="text-sm font-bold"
                        style={{ color: divVariance < 0 ? '#DC2626' : '#059669' }}>
                        {divVariance >= 0 ? '+' : '−'}{fmt(Math.abs(divVariance))}
                      </p>
                    </div>
                  )}

                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                    stroke={ds.color} strokeWidth="2" strokeLinecap="round"
                    style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
                    <polyline points="1 4 6 8 11 4" />
                  </svg>
                </div>
              </button>

              {/* Line items */}
              {isOpen && (
                <div style={{ backgroundColor: '#fff' }}>
                  {div.items.map((item, i) => (
                    <LineRow
                      key={item.wbs}
                      item={item}
                      divStyle={ds}
                      value={lineVals[item.wbs] ?? 0}
                      isOverridden={!item.custom && (!!overrideFlags[item.wbs] || layout.factors?.[item.wbs] != null)}
                      onChange={(num) => handleLineChange(item.wbs, num)}
                      onReset={() => resetLine(item.wbs)}
                      pctRate={item.pctKey ? pctRates[item.pctKey] : null}
                      onPctChange={setPctRate}
                      isFirst={i === 0}
                      actualParts={actualParts[item.wbs]}
                      showUnsplit={unsplitWbs.has(item.wbs)}
                      actualOpen={openActual === item.wbs}
                      onToggleActual={() => setOpenActual((w) => (w === item.wbs ? null : item.wbs))}
                      onActualPartChange={handleActualPartChange}
                      showActuals={showActuals}
                      actualsDisabled={isMarginLine(item)}
                      onRename={item.unit === 'pct' ? null : (label) => renameLine(item, label)}
                      onRemove={item.unit === 'pct' ? null : () => removeLine(item)}
                      breakdown={breakdownOn && item.unit !== 'pct' ? {
                        split: lineSplit(item, layout),
                        isDefault: !layout.splits?.[item.wbs],
                        onChange: (sp) => setLineSplit(item, sp),
                        onReset: () => setLineSplit(item, defaultCostSplit(item.originalLabel ?? item.label)),
                        allowance: (() => {
                          const a = allowanceOf(item);
                          return { ...a, onToggle: (on) => setAllowance(item, { on }), onAmount: (amount) => setAllowance(item, { amount }) };
                        })(),
                      } : null}
                      isAllowance={item.unit !== 'pct' && allowanceOf(item).on && allowanceOf(item).amount > 0}
                      onMeasure={item.custom ? (m) => setLineMeasure(item, m) : null}
                    />
                  ))}

                  {div.items.some((it) => it.unit === 'pct') ? null : (
                    <AddLineForm div={div} ds={ds} catalog={catalog} onAdd={(label, amount, measure, split) => addLine(div.key, label, amount, measure, split)} />
                  )}
                  {div.removedItems?.length > 0 && (
                    <div className="px-4 py-2 text-xs flex flex-wrap items-center gap-x-3 gap-y-1" style={{ borderTop: '1px solid #F3F4F6', color: '#9CA3AF' }}>
                      <span>Removed:</span>
                      {div.removedItems.map((it) => (
                        <span key={it.wbs} className="flex items-center gap-1">
                          <span style={{ textDecoration: 'line-through' }}>{it.label}</span>
                          <button type="button" onClick={() => restoreLine(it.wbs)} className="font-bold underline" style={{ color: ds.color }}
                            aria-label={`Restore ${it.label}`}>Restore</button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Division subtotal */}
                  {breakdownOn && !div.items.every((it) => it.unit === 'pct') && (() => {
                    const b = divBreakdown(div);
                    return (
                      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 px-4 py-2 text-xs font-semibold"
                        style={{ borderTop: `1px solid ${ds.border}`, backgroundColor: '#FCFCFB' }}>
                        <span style={{ color: '#9CA3AF' }}>{div.label} by type:</span>
                        {COST_TYPES.map((t) => (
                          <span key={t.key}><span style={{ color: t.color }}>{t.label}</span> <span style={{ color: '#002147' }}>{fmt(b[t.key])}</span></span>
                        ))}
                      </div>
                    );
                  })()}
                  <div className="flex items-center justify-between px-4 py-3"
                    style={{ borderTop: `1px solid ${ds.border}`, backgroundColor: ds.bg }}>
                    <span className="text-xs font-bold tracking-wide" style={{ color: ds.color }}>
                      {div.label} Total
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-extrabold" style={{ color: ds.color }}>{fmt(divTotal)}</span>
                      {hasActuals && divHasActual && (
                        <span className="text-sm font-bold hidden sm:block" style={{ color: '#0369A1' }}>
                          Actual: {fmt(divActual)}
                        </span>
                      )}
                      {hasActuals && divHasActual && (
                        <span className="text-sm font-bold hidden sm:block"
                          style={{ color: divVariance < 0 ? '#DC2626' : '#059669' }}>
                          {divVariance >= 0 ? '+' : '−'}{fmt(Math.abs(divVariance))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </>)}

      {/* Grand total footer — reads left to right like the pricing formula:
          Direct + Contingency = Total Project Cost; ÷ (1 − margin) = Client Price */}
      <div className="mt-6 rounded-2xl p-6" style={{ backgroundColor: '#002147' }}>
        <div className={`grid gap-6 grid-cols-2 ${totals.salesTax > 0 ? 'sm:grid-cols-6' : 'sm:grid-cols-5'}`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>Direct Costs</p>
            <p className="text-base font-extrabold text-white">{fmt(totals.directCosts)}</p>
            {hasActuals && totals.actualDirectCosts > 0 && (
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Actual: {fmt(totals.actualDirectCosts)}
              </p>
            )}
          </div>
          {totals.salesTax > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>
                + Materials Tax{overrideFlags['M.4'] ? '' : ` (${pctRates.salesTaxPct ?? 0}%)`}
              </p>
              <p className="text-base font-extrabold text-white">{fmt(totals.salesTax)}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>
              + Contingency{overrideFlags['M.3'] ? '' : ` (${pctRates.contingencyPct}%)`}
            </p>
            <p className="text-base font-extrabold text-white">{fmt(totals.contingency)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>= Total Project Cost</p>
            <p className="text-base font-extrabold text-white">{fmt(totals.budgetCost)}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {hasActuals && totals.actualTotalCost > 0 ? `Actual: ${fmt(totals.actualTotalCost)}` : 'Your cost'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>Total Client Price</p>
            <p className="text-xl font-extrabold" style={{ color: '#D4AF37' }}>{fmt(totals.totalClientPrice)}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {overrideFlags['M.2']
                ? 'Margin entered by hand'
                : `Total project cost ÷ ${(1 - (pctRates.profitPct ?? 0) / 100).toFixed(2)}`}
              {totals.costPerSqft != null && ` · ${fmtD(totals.costPerSqft)}/sqft`}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>Overhead + Profit</p>
            <p className="text-base font-extrabold text-white">{fmt(totals.contractorMargin)}</p>
            <p className="text-xs mt-0.5 font-semibold"
              style={{ color: totals.marginPct >= totals.marginTarget - 0.0005 ? '#34D399' : '#FBBF24' }}>
              {fmtPct(totals.marginPct)} of client price
            </p>
          </div>
        </div>

        {hasActuals && totals.actualTotalCost > 0 && (
          <div className="mt-5 pt-4 flex flex-wrap items-baseline justify-between gap-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(212,175,55,0.6)' }}>Total Variance</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <span className="text-lg font-extrabold mr-2"
                style={{ color: totals.totalVariance < 0 ? '#F87171' : '#34D399' }}>
                {totals.totalVariance >= 0 ? '+' : '−'}{fmt(Math.abs(totals.totalVariance))}
              </span>
              {totals.totalVariance >= 0 ? 'Under budget' : 'Over budget'} · Actual cost {fmt(totals.actualTotalCost)} vs {fmt(totals.budgetCost)} project cost
            </p>
            <p className="w-full text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <span className="font-semibold uppercase tracking-wide mr-2" style={{ color: 'rgba(212,175,55,0.6)' }}>Actual spent by type</span>
              {[`Materials ${fmt(spentByType.m)}`, `Subcontract ${fmt(spentByType.s)}`, `Other / Fees ${fmt(spentByType.o)}`].join(' · ')}
              {actualByType.unsplit > 0 && ` · Not split ${fmt(actualByType.unsplit)}`}
            </p>
          </div>
        )}
      </div>

      {/* Actuals hint when none entered yet */}
      {!hasActuals && (
        <p className="text-xs text-center mt-4" style={{ color: '#9CA3AF' }}>
          {currentProjectId
            ? 'Click an Actual cell to enter what you spent on that line by Material, Labor and Subcontractor.'
            : 'Pick a project to track actual costs against this budget.'}
        </p>
      )}

      {/* Delete this budget (only this project's budget and its actual costs) */}
      {currentProjectId && (
        <div className="mt-10 pt-5 flex flex-col items-center gap-1.5" style={{ borderTop: '1px solid #E8E6E1' }}>
          <button type="button" onClick={deleteThisBudget} disabled={deleteMsg?.status === 'deleting'}
            className="px-4 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-60"
            style={{ border: '1.5px solid #FCA5A5', color: '#B91C1C', backgroundColor: '#fff' }}>
            {deleteMsg?.status === 'deleting' ? 'Deleting…' : 'Delete this budget'}
          </button>
          <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
            Removes only this budget and its actual costs — the project, client, photos and documents stay.
          </p>
        </div>
      )}
      {deleteMsg?.msg && deleteMsg.status !== 'deleting' && (
        <p role={deleteMsg.status === 'error' ? 'alert' : 'status'} className="mt-4 text-sm font-semibold text-center"
          style={{ color: deleteMsg.status === 'error' ? '#DC2626' : '#059669' }}>{deleteMsg.msg}</p>
      )}
    </div>
  );
}
