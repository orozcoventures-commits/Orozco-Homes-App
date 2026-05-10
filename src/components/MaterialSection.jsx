import { useState } from 'react';
import MaterialCard from './MaterialCard';
import { MATERIALS, SUPPLIERS } from '../data/materials';
import { MATERIAL_CATEGORY_LABELS } from '../data/projectTypes';

export default function MaterialSection({ categories }) {
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [supplierFilter, setSupplierFilter] = useState([]);
  const [search, setSearch] = useState('');

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

  return (
    <div>
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
            fontFamily: 'inherit',
          }}
          onFocus={(e) => { e.target.style.borderColor = '#D4AF37'; }}
          onBlur={(e) => { e.target.style.borderColor = '#E8E6E1'; }}
        />
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-semibold tracking-wide" style={{ color: '#9CA3AF' }}>
            Filter:
          </span>
          {suppliersInCategory.map((sid) => {
            const s = SUPPLIERS[sid];
            const active = supplierFilter.includes(sid);
            const supplierColors = {
              ferguson:    { bg: '#003087', label: 'FG' },
              homedepot:   { bg: '#F96302', label: 'HD' },
              floordecor:  { bg: '#1B5E20', label: 'F&D' },
              lowes:       { bg: '#004990', label: 'LW' },
              wayfair:     { bg: '#7B2D8B', label: 'WF' },
              msisurfaces: { bg: '#8B1A1A', label: 'MSI' },
            };
            const sc = supplierColors[sid];
            return (
              <button
                key={sid}
                onClick={() => toggleSupplier(sid)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all duration-150"
                style={
                  active
                    ? { backgroundColor: sc?.bg ?? '#374151', color: '#fff', border: `1.5px solid ${sc?.bg ?? '#374151'}` }
                    : { backgroundColor: '#fff', color: sc?.bg ?? '#374151', border: `1.5px solid #E8E6E1` }
                }
                title={s?.name}
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
