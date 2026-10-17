import { supabase } from './supabase';

// Cost Catalog (migration 057): saved items with your own prices.

export const CATALOG_UNITS = [
  { key: 'ls',   label: 'lump sum' },
  { key: 'sqft', label: 'sq ft' },
  { key: 'lf',   label: 'linear ft' },
  { key: 'ea',   label: 'each' },
  { key: 'hr',   label: 'hour' },
  { key: 'day',  label: 'day' },
];
export const catalogUnitLabel = (key) => CATALOG_UNITS.find((u) => u.key === key)?.label ?? key;

const COLUMNS = 'id, name, category, unit, unit_cost, materials_pct, notes, updated_at';
export const catalogMissing = (error) => /cost_catalog_items|schema cache|does not exist/i.test(error?.message ?? '');

export async function fetchCatalog() {
  const { data, error } = await supabase.from('cost_catalog_items').select(COLUMNS)
    .order('category').order('name');
  return { items: data ?? [], error };
}

// Form values → row. Returns { row } or { error } with a message.
export function catalogRow(form) {
  const name = form.name.trim();
  if (!name) return { error: 'Enter the item name.' };
  const cost = Number(String(form.unit_cost).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(cost) || cost < 0) return { error: 'Enter a unit cost (0 or more).' };
  let pct = null;
  if (String(form.materials_pct).trim() !== '') {
    pct = Math.round(Number(form.materials_pct));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return { error: 'Materials % must be between 0 and 100 (or blank).' };
  }
  return {
    row: {
      name: name.slice(0, 120),
      category: form.category.trim().slice(0, 60),
      unit: CATALOG_UNITS.some((u) => u.key === form.unit) ? form.unit : 'ls',
      unit_cost: Math.round(cost * 100) / 100,
      materials_pct: pct,
      notes: form.notes.trim().slice(0, 500),
    },
  };
}

export async function saveCatalogItem(id, row) {
  const q = id
    ? supabase.from('cost_catalog_items').update(row).eq('id', id)
    : supabase.from('cost_catalog_items').insert(row);
  return q.select(COLUMNS).single();
}

export async function deleteCatalogItem(id) {
  return supabase.from('cost_catalog_items').delete().eq('id', id);
}
