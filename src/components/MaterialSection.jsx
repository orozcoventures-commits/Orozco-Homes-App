import { useState, useEffect, useRef, useCallback } from 'react';
import MaterialCard from './MaterialCard';
import { MATERIALS, SUPPLIERS } from '../data/materials';
import { MATERIAL_CATEGORY_LABELS } from '../data/projectTypes';
import { useProject } from '../context/ProjectContext';
import { supabase } from '../lib/supabase';
import { fmtMoney, hasDimensions, getBreakdown } from '../utils/estimate';

// ─── DimensionPanel ────────────────────────────────────────────────────────────
function DimensionPanel() {
  const { state, dispatch } = useProject();
  const { dimensions, activeDbProject, wasteFactor, isLocked } = state;
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef(null);

  const upsertDimensions = useCallback(async (dims) => {
    if (!activeDbProject?.id) return;
    const { error } = await supabase
      .from('project_dimensions')
      .upsert(
        {
          project_id:  activeDbProject.id,
          floor_sqft:  Number(dims.floor_sqft)  || 0,
          wall_sqft:   Number(dims.wall_sqft)   || 0,
          linear_feet: Number(dims.linear_feet) || 0,
        },
        { onConflict: 'project_id' }
      );
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [activeDbProject?.id]);

  function handleDimChange(field, value) {
    if (isLocked) return;
    const next = { ...dimensions, [field]: value };
    dispatch({ type: 'SET_DIMENSIONS', dimensions: { [field]: value } });
    if (activeDbProject) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => upsertDimensions(next), 800);
    }
  }

  function handleWasteChange(value) {
    if (isLocked) return;
    dispatch({ type: 'SET_WASTE_FACTOR', value });
  }

  const dimFields = [
    { key: 'floor_sqft',  label: 'Floor Area', unit: 'sq ft' },
    { key: 'wall_sqft',   label: 'Wall Area',  unit: 'sq ft' },
    { key: 'linear_feet', label: 'Baseboard',  unit: 'LF'    },
  ];

  return (
    <div
      className="rounded-2xl mb-6 overflow-hidden"
      style={{
        backgroundColor: '#fff',
        border: isLocked ? '1.5px solid #D4AF37' : '1.5px solid #E8E6E1',
        boxShadow: isLocked
          ? '0 2px 20px rgba(212,175,55,0.18)'
          : '0 2px 12px rgba(0,33,71,0.06)',
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{
          borderBottom: '1px solid #F0EEE9',
          backgroundColor: isLocked ? 'rgba(212,175,55,0.04)' : 'transparent',
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: '#002147' }}
          >
            Calculations Engine
          </span>
          {isLocked && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: '#B8942A', border: '1px solid rgba(212,175,55,0.4)' }}
            >
              Estimate Locked
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saved && !isLocked && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              ✓ Saved
            </span>
          )}
          {!activeDbProject && (
            <span className="text-xs hidden sm:block" style={{ color: '#C4B89A' }}>
              Select a project to persist
            </span>
          )}
          <button
            onClick={() => dispatch({ type: isLocked ? 'UNLOCK_ESTIMATE' : 'LOCK_ESTIMATE' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
            style={
              isLocked
                ? { backgroundColor: 'rgba(212,175,55,0.1)', color: '#B8942A', border: '1.5px solid rgba(212,175,55,0.35)' }
                : { backgroundColor: '#002147', color: '#D4AF37', border: '1.5px solid #002147' }
            }
          >
            {isLocked ? '🔓 Unlock' : '🔒 Lock Estimate'}
          </button>
        </div>
      </div>

      {/* Inputs */}
      <div className="px-5 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {dimFields.map(({ key, label, unit }) => (
            <div key={key}>
              <label
                className="flex items-center gap-1 mb-1.5"
                style={{ color: '#6B7280', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                {label}
                <span style={{ color: '#C4B89A', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                  ({unit})
                </span>
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={dimensions[key]}
                onChange={(e) => handleDimChange(key, e.target.value)}
                placeholder="0"
                disabled={isLocked}
                className="w-full rounded-xl px-3 py-2.5 text-sm transition-all duration-150"
                style={{
                  border: '1.5px solid #E8E6E1',
                  color: '#002147',
                  fontFamily: 'Inter, ui-monospace, monospace',
                  fontWeight: 600,
                  outline: 'none',
                  backgroundColor: isLocked ? '#F5F5F3' : '#FAFAF8',
                  cursor: isLocked ? 'not-allowed' : 'text',
                  opacity: isLocked ? 0.55 : 1,
                }}
                onFocus={(e) => {
                  if (!isLocked) {
                    e.target.style.borderColor = '#D4AF37';
                    e.target.style.backgroundColor = '#fff';
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E8E6E1';
                  e.target.style.backgroundColor = isLocked ? '#F5F5F3' : '#FAFAF8';
                }}
              />
            </div>
          ))}

          {/* Waste Factor */}
          <div>
            <label
              className="flex items-center gap-1 mb-1.5"
              style={{ color: '#6B7280', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              Waste Factor
              <span style={{ color: '#C4B89A', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(%)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={wasteFactor}
                onChange={(e) => handleWasteChange(e.target.value)}
                disabled={isLocked}
                className="w-full rounded-xl px-3 pr-7 py-2.5 text-sm transition-all duration-150"
                style={{
                  border: '1.5px solid rgba(212,175,55,0.4)',
                  color: '#B8942A',
                  fontFamily: 'Inter, ui-monospace, monospace',
                  fontWeight: 700,
                  outline: 'none',
                  backgroundColor: isLocked ? '#F5F5F3' : '#FDFCF5',
                  cursor: isLocked ? 'not-allowed' : 'text',
                  opacity: isLocked ? 0.55 : 1,
                }}
                onFocus={(e) => {
                  if (!isLocked) {
                    e.target.style.borderColor = '#D4AF37';
                    e.target.style.backgroundColor = '#fff';
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(212,175,55,0.4)';
                  e.target.style.backgroundColor = isLocked ? '#F5F5F3' : '#FDFCF5';
                }}
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none"
                style={{ color: '#D4AF37', opacity: isLocked ? 0.55 : 1 }}
              >
                %
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: '#C4B89A', fontSize: '0.62rem' }}>
              Material cut & overages
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ComparisonPanel ───────────────────────────────────────────────────────────
function ComparisonPanel({ activeCategory }) {
  const { state } = useProject();
  const { selections, dimensions, wasteFactor } = state;

  const selected = Object.entries(selections)
    .filter(([, v]) => v.category === activeCategory)
    .slice(0, 2);

  if (selected.length < 2) return null;

  const [[, itemA], [, itemB]] = selected;
  const useDims = hasDimensions(dimensions);

  const costA = useDims
    ? getBreakdown({ price: itemA.price }, activeCategory, dimensions, wasteFactor).total
    : itemA.price;
  const costB = useDims
    ? getBreakdown({ price: itemB.price }, activeCategory, dimensions, wasteFactor).total
    : itemB.price;

  const diff = Math.abs(costA - costB);
  const cheaper = costA <= costB ? 'A' : 'B';
  const dimLabel = useDims ? 'Installed Cost' : 'Unit Price';

  return (
    <div
      className="rounded-2xl mb-6 p-5"
      style={{
        backgroundColor: '#fff',
        border: '1.5px solid #E8E6E1',
        boxShadow: '0 2px 12px rgba(0,33,71,0.06)',
      }}
    >
      <p
        className="text-xs font-bold tracking-widest uppercase mb-4"
        style={{ color: '#002147' }}
      >
        Quick Comparison
      </p>

      <div className="flex items-stretch gap-3">
        {[{ item: itemA, cost: costA, side: 'A' }, { item: itemB, cost: costB, side: 'B' }].map(({ item, cost, side }) => (
          <div
            key={side}
            className="flex-1 rounded-xl p-4 flex flex-col gap-1"
            style={{
              backgroundColor: cheaper === side ? 'rgba(16,185,129,0.06)' : '#FAFAF8',
              border: cheaper === side ? '1.5px solid rgba(16,185,129,0.3)' : '1.5px solid #F0EEE9',
            }}
          >
            <p className="text-xs font-semibold leading-snug" style={{ color: '#4A4A4A' }}>{item.name}</p>
            <p className="text-lg font-bold" style={{ color: '#D4AF37' }}>{fmtMoney(cost)}</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>{dimLabel}</p>
            {cheaper === side && (
              <p className="text-xs font-semibold mt-1" style={{ color: '#059669' }}>
                saves {fmtMoney(diff)}
              </p>
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
        .select('floor_sqft, wall_sqft, linear_feet')
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

  const selectedInCategory = Object.values(state.selections).filter(
    (v) => v.category === activeCategory
  );

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
      {/* Calculations Engine panel */}
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
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.borderColor = '#D4AF37';
                  e.currentTarget.style.color = '#002147';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.borderColor = '#E8E6E1';
                  e.currentTarget.style.color = '#4A4A4A';
                }
              }}
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
          style={{
            border: '1.5px solid #E8E6E1',
            color: '#002147',
            outline: 'none',
            fontFamily: 'Inter, inherit',
          }}
          onFocus={(e) => { e.target.style.borderColor = '#D4AF37'; }}
          onBlur={(e) => { e.target.style.borderColor = '#E8E6E1'; }}
        />
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-semibold tracking-wide" style={{ color: '#9CA3AF' }}>
            Filter:
          </span>
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
            <button
              onClick={() => setSupplierFilter([])}
              className="text-xs underline"
              style={{ color: '#9CA3AF' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Comparison panel */}
      {selectedInCategory.length >= 2 && (
        <ComparisonPanel activeCategory={activeCategory} />
      )}

      {/* Results count */}
      {(search || supplierFilter.length > 0) && (
        <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
          Showing {filtered.length} of {items.length} items
        </p>
      )}

      {/* Cards grid */}
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
          <p className="text-sm mb-4" style={{ color: '#4A4A4A' }}>
            Try adjusting your search or filters.
          </p>
          <button
            onClick={() => { setSearch(''); setSupplierFilter([]); }}
            className="text-xs font-semibold underline"
            style={{ color: '#D4AF37' }}
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
