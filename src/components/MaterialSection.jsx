import { useState, useEffect, useRef, useCallback } from 'react';
import MaterialCard from './MaterialCard';
import { MATERIALS, SUPPLIERS } from '../data/materials';
import { MATERIAL_CATEGORY_LABELS } from '../data/projectTypes';
import { useProject } from '../context/ProjectContext';
import { supabase } from '../lib/supabase';
import { fmtMoney, hasDimensions, getBreakdown } from '../utils/estimate';

// ─── Shared input style helpers ────────────────────────────────────────────────
const inputBase = {
  border: '1.5px solid #E8E6E1',
  color: '#002147',
  fontFamily: 'Inter, ui-monospace, monospace',
  fontWeight: 600,
  outline: 'none',
  backgroundColor: '#FAFAF8',
};
const inputFocus = (e) => { e.target.style.borderColor = '#D4AF37'; e.target.style.backgroundColor = '#fff'; };
const inputBlur  = (e, locked) => {
  e.target.style.borderColor = '#E8E6E1';
  e.target.style.backgroundColor = locked ? '#F5F5F3' : '#FAFAF8';
};

// ─── NumInput ──────────────────────────────────────────────────────────────────
function NumInput({ label, sublabel, value, onChange, min = 0, max, step = 1, disabled, accent }) {
  return (
    <div>
      <label
        className="flex items-center gap-1 mb-1.5"
        style={{ color: '#6B7280', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}
      >
        {label}
        {sublabel && (
          <span style={{ color: '#C4B89A', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
            ({sublabel})
          </span>
        )}
      </label>
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-xl px-3 py-2.5 text-sm transition-all duration-150"
          style={{
            ...inputBase,
            ...(accent ? { borderColor: 'rgba(212,175,55,0.4)', color: '#B8942A', backgroundColor: '#FDFCF5' } : {}),
            opacity: disabled ? 0.55 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
            paddingRight: sublabel ? '1.5rem' : undefined,
          }}
          onFocus={(e) => { if (!disabled) inputFocus(e); }}
          onBlur={(e) => { if (!disabled) inputBlur(e, disabled); else { e.target.style.borderColor = accent ? 'rgba(212,175,55,0.4)' : '#E8E6E1'; } }}
        />
        {sublabel === '%' && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none"
            style={{ color: accent ? '#D4AF37' : '#9CA3AF', opacity: disabled ? 0.55 : 1 }}
          >
            %
          </span>
        )}
      </div>
    </div>
  );
}

// ─── DimensionPanel ────────────────────────────────────────────────────────────
function DimensionPanel() {
  const { state, dispatch } = useProject();
  const { dimensions, activeDbProject, wasteFactor, overheadPct, profitPct, contractorView, isLocked } = state;
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef(null);

  const upsertDimensions = useCallback(async (dims) => {
    if (!activeDbProject?.id) return;
    const { error } = await supabase
      .from('project_dimensions')
      .upsert(
        {
          project_id:   activeDbProject.id,
          floor_sqft:   Number(dims.floor_sqft)  || 0,
          wall_sqft:    Number(dims.wall_sqft)   || 0,
          linear_feet:  Number(dims.linear_feet) || 0,
          overhead_pct: (Number(state.overheadPct) || 0) / 100,
          profit_pct:   (Number(state.profitPct)   || 0) / 100,
        },
        { onConflict: 'project_id' }
      );
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  }, [activeDbProject?.id, state.overheadPct, state.profitPct]);

  function handleDimChange(field, value) {
    if (isLocked) return;
    const next = { ...dimensions, [field]: value };
    dispatch({ type: 'SET_DIMENSIONS', dimensions: { [field]: value } });
    if (activeDbProject) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => upsertDimensions(next), 800);
    }
  }

  const totalMargin = (Number(overheadPct) || 0) + (Number(profitPct) || 0);
  const divisor = (100 - totalMargin) / 100;
  const marginWarning = divisor <= 0;

  return (
    <div
      className="rounded-2xl mb-6 overflow-hidden"
      style={{
        backgroundColor: '#fff',
        border: isLocked ? '1.5px solid #D4AF37' : '1.5px solid #E8E6E1',
        boxShadow: isLocked ? '0 2px 20px rgba(212,175,55,0.18)' : '0 2px 12px rgba(0,33,71,0.06)',
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{
          borderBottom: '1px solid #F0EEE9',
          backgroundColor: isLocked ? 'rgba(212,175,55,0.04)' : 'transparent',
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#002147' }}>
            Calculations Engine
          </span>
          {isLocked && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: '#B8942A', border: '1px solid rgba(212,175,55,0.4)' }}>
              Locked
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {saved && !isLocked && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' }}>
              ✓ Saved
            </span>
          )}

          {/* Contractor / Client view toggle */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_CONTRACTOR_VIEW' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
            style={
              contractorView
                ? { backgroundColor: '#002147', color: '#D4AF37', border: '1.5px solid #002147' }
                : { backgroundColor: 'rgba(212,175,55,0.1)', color: '#B8942A', border: '1.5px solid rgba(212,175,55,0.35)' }
            }
            title={contractorView ? 'Switch to client preview' : 'Switch to contractor view'}
          >
            {contractorView ? '👷 Contractor' : '👁 Client View'}
          </button>

          {/* Lock / Unlock */}
          <button
            onClick={() => dispatch({ type: isLocked ? 'UNLOCK_ESTIMATE' : 'LOCK_ESTIMATE' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
            style={
              isLocked
                ? { backgroundColor: 'rgba(212,175,55,0.1)', color: '#B8942A', border: '1.5px solid rgba(212,175,55,0.35)' }
                : { backgroundColor: '#F0EEE9', color: '#4A4A4A', border: '1.5px solid #E0DDD8' }
            }
          >
            {isLocked ? '🔓 Unlock' : '🔒 Lock'}
          </button>
        </div>
      </div>

      {/* ── Dimension inputs ── */}
      <div className="px-5 pt-4 pb-3">
        <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#9CA3AF', fontSize: '0.6rem' }}>
          Room Dimensions
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <NumInput label="Floor Area" sublabel="sq ft" value={dimensions.floor_sqft}
            onChange={(v) => handleDimChange('floor_sqft', v)} step={0.5} disabled={isLocked} />
          <NumInput label="Wall Area" sublabel="sq ft" value={dimensions.wall_sqft}
            onChange={(v) => handleDimChange('wall_sqft', v)} step={0.5} disabled={isLocked} />
          <NumInput label="Baseboard" sublabel="LF" value={dimensions.linear_feet}
            onChange={(v) => handleDimChange('linear_feet', v)} step={0.5} disabled={isLocked} />
          <NumInput label="Waste Factor" sublabel="%" value={wasteFactor}
            onChange={(v) => dispatch({ type: 'SET_WASTE_FACTOR', value: v })}
            max={100} disabled={isLocked} accent />
        </div>
      </div>

      {/* ── Financial Settings (contractor only) ── */}
      {contractorView && (
        <div
          className="px-5 pt-3 pb-4"
          style={{ borderTop: '1px dashed #F0EEE9' }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9CA3AF', fontSize: '0.6rem' }}>
              Financial Settings — Contractor Only
            </p>
            {!marginWarning && (
              <span className="text-xs font-semibold" style={{ color: '#6B7280', fontSize: '0.65rem' }}>
                Gross divisor:{' '}
                <span style={{ color: '#002147', fontWeight: 700 }}>
                  {((100 - totalMargin) / 100).toFixed(2)}
                </span>
                {' '}→ {totalMargin}% margin
              </span>
            )}
            {marginWarning && (
              <span className="text-xs font-semibold" style={{ color: '#EF4444' }}>
                ⚠ OH + Profit ≥ 100% — invalid
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <NumInput label="Overhead" sublabel="%" value={overheadPct}
                onChange={(v) => dispatch({ type: 'SET_OVERHEAD', value: v })}
                max={99} disabled={isLocked} accent />
              <p className="text-xs mt-1" style={{ color: '#C4B89A', fontSize: '0.62rem' }}>
                Company overhead
              </p>
            </div>
            <div>
              <NumInput label="Net Profit" sublabel="%" value={profitPct}
                onChange={(v) => dispatch({ type: 'SET_PROFIT', value: v })}
                max={99} disabled={isLocked} accent />
              <p className="text-xs mt-1" style={{ color: '#C4B89A', fontSize: '0.62rem' }}>
                GC net margin
              </p>
            </div>
            {/* Summary pill */}
            <div className="sm:col-span-2 flex items-center">
              <div
                className="w-full rounded-xl px-4 py-3"
                style={{ backgroundColor: '#F5F4F0', border: '1px solid #EAE8E2' }}
              >
                <p className="text-xs mb-1" style={{ color: '#9CA3AF', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Formula Preview
                </p>
                <p className="font-mono text-sm font-semibold" style={{ color: '#002147' }}>
                  Hard Costs ÷ {divisor > 0 ? divisor.toFixed(2) : '??'}
                </p>
                <p style={{ color: '#9CA3AF', fontSize: '0.65rem', marginTop: '2px' }}>
                  = Hard Costs / (1 − {overheadPct}% − {profitPct}%)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ComparisonPanel ───────────────────────────────────────────────────────────
function ComparisonPanel({ activeCategory }) {
  const { state } = useProject();
  const { selections, dimensions, wasteFactor, overheadPct, profitPct } = state;

  const selected = Object.entries(selections)
    .filter(([, v]) => v.category === activeCategory)
    .slice(0, 2);

  if (selected.length < 2) return null;

  const [[, itemA], [, itemB]] = selected;
  const useDims = hasDimensions(dimensions);

  const bdA = getBreakdown({ price: itemA.price }, activeCategory, dimensions, wasteFactor, overheadPct, profitPct);
  const bdB = getBreakdown({ price: itemB.price }, activeCategory, dimensions, wasteFactor, overheadPct, profitPct);

  const costA = useDims ? bdA.clientPrice : itemA.price;
  const costB = useDims ? bdB.clientPrice : itemB.price;
  const diff    = Math.abs(costA - costB);
  const cheaper = costA <= costB ? 'A' : 'B';
  const label   = useDims ? 'Total Installed Price' : 'Unit Price';

  return (
    <div
      className="rounded-2xl mb-6 p-5"
      style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.06)' }}
    >
      <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#002147' }}>
        Quick Comparison
      </p>
      <div className="flex items-stretch gap-3">
        {[{ item: itemA, cost: costA, side: 'A' }, { item: itemB, cost: costB, side: 'B' }].map(({ item, cost, side }) => (
          <div key={side} className="flex-1 rounded-xl p-4 flex flex-col gap-1"
            style={{
              backgroundColor: cheaper === side ? 'rgba(16,185,129,0.06)' : '#FAFAF8',
              border: cheaper === side ? '1.5px solid rgba(16,185,129,0.3)' : '1.5px solid #F0EEE9',
            }}>
            <p className="text-xs font-semibold leading-snug" style={{ color: '#4A4A4A' }}>{item.name}</p>
            <p className="text-lg font-bold" style={{ color: '#D4AF37' }}>{fmtMoney(cost)}</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>{label}</p>
            {cheaper === side && (
              <p className="text-xs font-semibold mt-1" style={{ color: '#059669' }}>saves {fmtMoney(diff)}</p>
            )}
          </div>
        ))}
        <div className="flex items-center flex-shrink-0">
          <span className="text-sm font-bold px-1" style={{ color: '#002147', opacity: 0.3 }}>vs</span>
        </div>
      </div>
    </div>
  );
}

// ─── MaterialSection ───────────────────────────────────────────────────────────
export default function MaterialSection({ categories }) {
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [supplierFilter, setSupplierFilter] = useState([]);
  const [search, setSearch] = useState('');
  const { state, dispatch } = useProject();

  // Load project_dimensions from Supabase when activeDbProject is set
  useEffect(() => {
    if (!state.activeDbProject?.id) return;
    (async () => {
      const { data, error } = await supabase
        .from('project_dimensions')
        .select('floor_sqft, wall_sqft, linear_feet, overhead_pct, profit_pct')
        .eq('project_id', state.activeDbProject.id)
        .maybeSingle();

      if (!error && data) {
        dispatch({
          type: 'SET_DIMENSIONS',
          dimensions: {
            floor_sqft:  String(data.floor_sqft  ?? ''),
            wall_sqft:   String(data.wall_sqft   ?? ''),
            linear_feet: String(data.linear_feet ?? ''),
          },
        });
        if (data.overhead_pct != null) dispatch({ type: 'SET_OVERHEAD', value: (data.overhead_pct * 100).toFixed(0) });
        if (data.profit_pct   != null) dispatch({ type: 'SET_PROFIT',   value: (data.profit_pct   * 100).toFixed(0) });
      }
    })();
  }, [state.activeDbProject?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = MATERIALS[activeCategory] ?? [];

  const filtered = items.filter((m) => {
    const matchSupplier = supplierFilter.length === 0 || supplierFilter.includes(m.supplier);
    const matchSearch =
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.material ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (m.finish ?? '').toLowerCase().includes(search.toLowerCase());
    return matchSupplier && matchSearch;
  });

  function toggleSupplier(id) {
    setSupplierFilter((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  const suppliersInCategory = [...new Set(items.map((m) => m.supplier))];
  const selectedInCategory  = Object.values(state.selections).filter((v) => v.category === activeCategory);

  const supplierColors = {
    ferguson:    { bg: '#003087', label: 'FG' },
    homedepot:   { bg: '#F96302', label: 'HD' },
    floordecor:  { bg: '#1B5E20', label: 'F&D' },
    lowes:       { bg: '#004990', label: 'LW' },
    wayfair:     { bg: '#7B2D8B', label: 'WF' },
    msisurfaces: { bg: '#8B1A1A', label: 'MSI' },
  };

  return (
    <div>
      <DimensionPanel />

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {categories.map((cat) => {
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setSearch(''); setSupplierFilter([]); }}
              className="px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-150"
              style={
                active
                  ? { backgroundColor: '#002147', color: '#fff', border: '1.5px solid #002147' }
                  : { backgroundColor: '#fff', color: '#4A4A4A', border: '1.5px solid #E8E6E1' }
              }
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = '#D4AF37'; e.currentTarget.style.color = '#002147'; } }}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = '#E8E6E1'; e.currentTarget.style.color = '#4A4A4A'; } }}
            >
              {MATERIAL_CATEGORY_LABELS[cat] ?? cat}
            </button>
          );
        })}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-7">
        <input
          type="text"
          placeholder="Search materials..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 max-w-sm rounded-lg px-4 py-2 text-sm"
          style={{ border: '1.5px solid #E8E6E1', color: '#002147', outline: 'none', fontFamily: 'Inter, inherit' }}
          onFocus={(e) => { e.target.style.borderColor = '#D4AF37'; }}
          onBlur={(e) => { e.target.style.borderColor = '#E8E6E1'; }}
        />
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-semibold tracking-wide" style={{ color: '#9CA3AF' }}>Filter:</span>
          {suppliersInCategory.map((sid) => {
            const active = supplierFilter.includes(sid);
            const sc = supplierColors[sid];
            return (
              <button
                key={sid}
                onClick={() => toggleSupplier(sid)}
                className="px-2.5 py-1 rounded-md text-xs font-bold tracking-wide transition-all duration-150"
                style={
                  active
                    ? { backgroundColor: sc?.bg ?? '#374151', color: '#fff', border: `1px solid ${sc?.bg ?? '#374151'}` }
                    : { backgroundColor: '#fff', color: sc?.bg ?? '#374151', border: '1px solid #E8E6E1' }
                }
                title={SUPPLIERS[sid]?.name}
              >
                {sc?.label ?? sid.toUpperCase()}
              </button>
            );
          })}
          {supplierFilter.length > 0 && (
            <button onClick={() => setSupplierFilter([])} className="text-xs underline" style={{ color: '#9CA3AF' }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {selectedInCategory.length >= 2 && <ComparisonPanel activeCategory={activeCategory} />}

      {(search || supplierFilter.length > 0) && (
        <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
          Showing {filtered.length} of {items.length} items
        </p>
      )}

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-36">
          {filtered.map((m) => (
            <MaterialCard key={m.id} material={m} category={activeCategory} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-4xl mb-4 opacity-30">🔍</p>
          <p className="font-semibold mb-1" style={{ color: '#002147' }}>No materials found</p>
          <p className="text-sm mb-4" style={{ color: '#4A4A4A' }}>Try adjusting your search or filters.</p>
          <button onClick={() => { setSearch(''); setSupplierFilter([]); }}
            className="text-xs font-semibold underline" style={{ color: '#D4AF37' }}>
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
