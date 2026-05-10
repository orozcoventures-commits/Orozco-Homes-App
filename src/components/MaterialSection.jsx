import { useState } from 'react';
import MaterialCard from './MaterialCard';
import { MATERIALS, SUPPLIERS } from '../data/materials';
import { MATERIAL_CATEGORY_LABELS } from '../data/projectTypes';

const ALL_SUPPLIERS = Object.keys(SUPPLIERS);

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
      <div className="flex gap-2 flex-wrap mb-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setSearch(''); setSupplierFilter([]); }}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150
              ${activeCategory === cat
                ? 'bg-amber-700 text-white border-amber-700 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400 hover:text-amber-700'
              }`}
          >
            {MATERIAL_CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search materials..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <div className="flex gap-2 flex-wrap">
          {suppliersInCategory.map((sid) => {
            const s = SUPPLIERS[sid];
            const active = supplierFilter.includes(sid);
            const colorMap = {
              ferguson: active ? 'bg-blue-900 text-white border-blue-900' : 'border-blue-200 text-blue-900 hover:bg-blue-50',
              homedepot: active ? 'bg-orange-500 text-white border-orange-500' : 'border-orange-200 text-orange-600 hover:bg-orange-50',
              floordecor: active ? 'bg-green-800 text-white border-green-800' : 'border-green-200 text-green-700 hover:bg-green-50',
              lowes: active ? 'bg-blue-700 text-white border-blue-700' : 'border-blue-200 text-blue-700 hover:bg-blue-50',
              wayfair: active ? 'bg-purple-700 text-white border-purple-700' : 'border-purple-200 text-purple-700 hover:bg-purple-50',
              msisurfaces: active ? 'bg-red-800 text-white border-red-800' : 'border-red-200 text-red-700 hover:bg-red-50',
            };
            return (
              <button
                key={sid}
                onClick={() => toggleSupplier(sid)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-150 ${colorMap[sid] ?? 'border-gray-200 text-gray-600'}`}
              >
                {s?.logo}
              </button>
            );
          })}
          {supplierFilter.length > 0 && (
            <button
              onClick={() => setSupplierFilter([])}
              className="text-xs text-gray-400 hover:text-gray-600 underline px-1"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Cards grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-32">
          {filtered.map((m) => (
            <MaterialCard key={m.id} material={m} category={activeCategory} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium">No materials found for your filters.</p>
          <button
            onClick={() => { setSearch(''); setSupplierFilter([]); }}
            className="mt-2 text-sm text-amber-700 underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
