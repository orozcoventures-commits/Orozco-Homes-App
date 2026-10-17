import { useEffect, useMemo, useState } from 'react';
import {
  CATALOG_UNITS, catalogUnitLabel, catalogMissing, fetchCatalog, catalogRow, saveCatalogItem, deleteCatalogItem,
} from '../lib/costCatalog';

// Cost Catalog: your own items and prices, picked into any Remodel Estimate
// with "+ Add line item → From catalog".

const NAVY = '#002147';
const EMPTY_FORM = { name: '', category: '', unit: 'ls', unit_cost: '', materials_pct: '', notes: '' };
const COMMON_CATEGORIES = ['Design & Permits', 'Demo', 'Site Prep', 'Framing', 'Plumbing', 'Electrical', 'HVAC', 'Insulation',
  'Drywall', 'Tile', 'Flooring', 'Cabinets & Countertops', 'Fixtures', 'Finish Carpentry', 'Painting', 'Exterior', 'Other'];
const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function CostCatalog() {
  const [items, setItems] = useState(null);       // null = loading
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchCatalog().then(({ items: list, error }) => {
      if (error) setLoadError(catalogMissing(error) ? 'The Cost Catalog is not set up yet — run migration 057 in Supabase first.' : `Could not load the catalog: ${error.message}`);
      setItems(list);
    });
  }, []);

  const categories = useMemo(() => [...new Set((items ?? []).map((i) => i.category).filter(Boolean))].sort(), [items]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (items ?? []).filter((i) => (!category || i.category === category)
      && (!q || `${i.name} ${i.category} ${i.notes}`.toLowerCase().includes(q)));
  }, [items, search, category]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const { row, error } = catalogRow(form);
    if (error) { setFormError(error); return; }
    setSaving(true); setFormError('');
    const { data, error: saveError } = await saveCatalogItem(editingId, row);
    setSaving(false);
    if (saveError) { setFormError(catalogMissing(saveError) ? 'Not saved — run migration 057 in Supabase first.' : `Not saved: ${saveError.message}`); return; }
    setItems((list) => {
      const rest = (list ?? []).filter((i) => i.id !== data.id);
      return [...rest, data].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    });
    setToast(editingId ? `Updated "${data.name}".` : `Added "${data.name}".`);
    setForm(EMPTY_FORM); setEditingId(null);
  }

  function startEdit(item) {
    setEditingId(item.id); setFormError('');
    setForm({
      name: item.name, category: item.category, unit: item.unit, unit_cost: String(item.unit_cost),
      materials_pct: item.materials_pct == null ? '' : String(item.materials_pct), notes: item.notes,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove(item) {
    if (!confirm(`Delete "${item.name}" from your catalog? Estimates that already use it are not changed.`)) return;
    const { error } = await deleteCatalogItem(item.id);
    if (error) { setToast(`Not deleted: ${error.message}`); return; }
    setItems((list) => list.filter((i) => i.id !== item.id));
    if (editingId === item.id) { setEditingId(null); setForm(EMPTY_FORM); }
    setToast(`Deleted "${item.name}".`);
  }

  const input = 'w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300';
  const inputStyle = { border: '1.5px solid #E5E7EB', color: NAVY, backgroundColor: '#fff' };
  const label = 'block text-xs font-semibold mb-1';

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-10">
      <p className="text-xs font-bold tracking-[0.18em] uppercase mb-0.5" style={{ color: '#D4AF37' }}>Estimating</p>
      <h1 className="text-2xl font-extrabold" style={{ color: NAVY }}>Cost Catalog</h1>
      <p className="text-sm mt-1 mb-6" style={{ color: '#6B7280' }}>
        Your own items and prices. In Remodel Estimates, use <strong>+ Add line item → From catalog</strong> to drop them into any estimate.
      </p>

      {loadError && <p role="alert" className="mb-4 text-sm font-semibold" style={{ color: '#DC2626' }}>{loadError}</p>}
      {toast && <p role="status" className="mb-4 text-sm font-semibold" style={{ color: '#059669' }}>{toast}</p>}

      {/* Add / edit */}
      <form onSubmit={submit} className="rounded-2xl p-5 mb-6" style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.05)' }}>
        <p className="text-xs font-bold tracking-[0.14em] uppercase mb-3" style={{ color: NAVY }}>{editingId ? 'Edit item' : 'Add an item'}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label className={label} htmlFor="cc-name" style={{ color: '#374151' }}>Item name</label>
            <input id="cc-name" value={form.name} onChange={set('name')} maxLength={120} placeholder="e.g. Schluter shower system" className={input} style={inputStyle} />
          </div>
          <div>
            <label className={label} htmlFor="cc-category" style={{ color: '#374151' }}>Category</label>
            <input id="cc-category" list="cc-categories" value={form.category} onChange={set('category')} maxLength={60} placeholder="e.g. Tile" className={input} style={inputStyle} />
            <datalist id="cc-categories">
              {[...new Set([...categories, ...COMMON_CATEGORIES])].map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label className={label} htmlFor="cc-unit" style={{ color: '#374151' }}>Unit</label>
            <select id="cc-unit" value={form.unit} onChange={set('unit')} className={input} style={inputStyle}>
              {CATALOG_UNITS.map((u) => <option key={u.key} value={u.key}>{u.key === 'ls' ? 'Lump sum' : `Per ${u.label}`}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="cc-cost" style={{ color: '#374151' }}>{form.unit === 'ls' ? 'Price ($)' : 'Unit cost ($)'}</label>
            <input id="cc-cost" value={form.unit_cost} onChange={set('unit_cost')} inputMode="decimal" placeholder="0" className={input} style={inputStyle} />
          </div>
          <div>
            <label className={label} htmlFor="cc-pct" style={{ color: '#374151' }}>Materials % <span className="font-normal" style={{ color: '#9CA3AF' }}>(optional)</span></label>
            <input id="cc-pct" value={form.materials_pct} onChange={set('materials_pct')} inputMode="numeric" placeholder="auto" className={input} style={inputStyle} />
          </div>
          <div className="sm:col-span-2 lg:col-span-6">
            <label className={label} htmlFor="cc-notes" style={{ color: '#374151' }}>Notes <span className="font-normal" style={{ color: '#9CA3AF' }}>(supplier, model, what's included — internal)</span></label>
            <input id="cc-notes" value={form.notes} onChange={set('notes')} maxLength={500} className={input} style={inputStyle} />
          </div>
        </div>
        {formError && <p role="alert" className="mt-3 text-sm font-semibold" style={{ color: '#DC2626' }}>{formError}</p>}
        <div className="flex items-center gap-2 mt-4">
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60" style={{ backgroundColor: NAVY, color: '#D4AF37' }}>
            {saving ? 'Saving…' : editingId ? 'Update item' : 'Add to catalog'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setFormError(''); }} className="px-3 py-2 text-sm font-semibold" style={{ color: '#6B7280' }}>Cancel</button>
          )}
        </div>
        <p className="text-xs mt-3" style={{ color: '#9CA3AF' }}>
          Materials % sets how the line splits into materials and subcontract in the estimate. Leave it blank to use the app's default for that kind of item.
        </p>
      </form>

      {/* List */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" aria-label="Search catalog"
          className="flex-1 min-w-[200px] px-3 py-2 rounded-xl text-sm focus:outline-none" style={inputStyle} />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category"
          className="px-3 py-2 rounded-xl text-sm focus:outline-none" style={inputStyle}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-xs" style={{ color: '#9CA3AF' }}>{items ? `${shown.length} of ${items.length} items` : ''}</span>
      </div>
      <div className="rounded-2xl overflow-x-auto" style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1' }}>
        {items === null ? (
          <p className="p-6 text-sm" style={{ color: '#9CA3AF' }}>Loading…</p>
        ) : shown.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: '#9CA3AF' }}>
            {items.length === 0 ? 'No items yet. Add the items you price often — fixtures, systems, your sub rates — and reuse them in every estimate.' : 'No items match.'}
          </p>
        ) : (
          <table className="w-full text-sm" data-testid="catalog-table">
            <thead>
              <tr className="text-xs uppercase tracking-wide" style={{ color: '#9CA3AF', borderBottom: '1px solid #F3F4F6' }}>
                <th className="text-left font-semibold px-4 py-2.5">Item</th>
                <th className="text-left font-semibold px-4 py-2.5">Category</th>
                <th className="text-left font-semibold px-4 py-2.5">Unit</th>
                <th className="text-right font-semibold px-4 py-2.5">Price</th>
                <th className="text-right font-semibold px-4 py-2.5">Materials</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {shown.map((i) => (
                <tr key={i.id} style={{ borderTop: '1px solid #F3F4F6' }}>
                  <td className="px-4 py-2.5">
                    <span className="font-semibold" style={{ color: NAVY }}>{i.name}</span>
                    {i.notes && <span className="block text-xs" style={{ color: '#9CA3AF' }}>{i.notes}</span>}
                  </td>
                  <td className="px-4 py-2.5" style={{ color: '#6B7280' }}>{i.category || '—'}</td>
                  <td className="px-4 py-2.5" style={{ color: '#6B7280' }}>{catalogUnitLabel(i.unit)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold" style={{ color: NAVY }}>{money(i.unit_cost)}{i.unit !== 'ls' ? <span className="font-normal text-xs" style={{ color: '#9CA3AF' }}> / {catalogUnitLabel(i.unit)}</span> : ''}</td>
                  <td className="px-4 py-2.5 text-right" style={{ color: '#6B7280' }}>{i.materials_pct == null ? 'auto' : `${i.materials_pct}%`}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button type="button" onClick={() => startEdit(i)} className="text-xs font-bold underline" style={{ color: '#0369A1' }} aria-label={`Edit ${i.name}`}>Edit</button>
                    <button type="button" onClick={() => remove(i)} className="ml-3 text-xs underline" style={{ color: '#9CA3AF' }} aria-label={`Delete ${i.name}`}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
