import { supabase } from './supabase';

// Create/update rows in public.subcontractor_directory (migration 028).
// Writes go straight to Supabase; RLS only lets admins write.

export const EMPTY_SUBCONTRACTOR_FORM = {
  company: '', name: '', service: '', specialty: '',
  phone: '', email: '', website: '',
  address: '', license: '', reference: '', notes: '',
};

const splitList = (text) => text.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
const joinList = (list) => (list ?? []).join(', ');
const orNull = (text) => text.trim() || null;

function formatPhone(raw) {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return digits.length === 10 ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}` : raw;
}

// Directory row (as returned by the search API) → form fields.
export function toForm(sub) {
  return {
    company: sub.company ?? '',
    name: sub.name ?? '',
    service: sub.service ?? '',
    specialty: sub.specialty ?? '',
    phone: joinList(sub.phone),
    email: joinList(sub.email),
    website: joinList(sub.website),
    address: sub.address ?? '',
    license: sub.license ?? '',
    reference: sub.reference ?? '',
    notes: sub.notes ?? '',
  };
}

// Returns a message for the first invalid field, or null when the form can be saved.
export function validateForm(form) {
  if (!form.company.trim() && !form.name.trim()) return 'Enter a company or a contact name.';
  if (!form.service.trim()) return 'Enter the trade, e.g. Plumbing or Drywall.';
  const badEmail = splitList(form.email).find((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (badEmail) return `"${badEmail}" doesn't look like an email address.`;
  const badPhone = splitList(form.phone).find((p) => p.replace(/\D/g, '').length < 7);
  if (badPhone) return `"${badPhone}" doesn't look like a phone number.`;
  return null;
}

// Form fields → table row. Specialty falls back to the trade (the column is required).
function toRow(form) {
  return {
    company: orNull(form.company),
    name: orNull(form.name),
    service: form.service.trim(),
    specialty: form.specialty.trim() || form.service.trim(),
    phone: splitList(form.phone).map(formatPhone),
    email: splitList(form.email),
    website: splitList(form.website),
    address: orNull(form.address),
    license: orNull(form.license),
    reference: orNull(form.reference),
    notes: orNull(form.notes),
  };
}

function friendlyError(error) {
  // RLS hides the row from non-admins, so .single() finds nothing to return.
  if (error.code === 'PGRST116' || error.code === '42501') {
    return 'You need to be signed in as an admin to save subcontractors.';
  }
  return error.message || 'Could not save the subcontractor.';
}

export async function createSubcontractor(form) {
  const { data, error } = await supabase
    .from('subcontractor_directory')
    .insert(toRow(form))
    .select('id')
    .single();
  return error ? { error: friendlyError(error) } : { data };
}

export async function updateSubcontractor(id, form) {
  const { data, error } = await supabase
    .from('subcontractor_directory')
    .update(toRow(form))
    .eq('id', id)
    .select('id')
    .single();
  return error ? { error: friendlyError(error) } : { data };
}
