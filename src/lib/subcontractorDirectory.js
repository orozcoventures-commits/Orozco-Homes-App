import { supabase } from './supabase';

// Create/update rows in public.subcontractor_directory (migrations 028, 030).
// Writes go straight to Supabase; RLS only lets admins write.
// COI files live in the private "subcontractor-coi" storage bucket.

export const COI_BUCKET = 'subcontractor-coi';
export const COI_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif';
const COI_MAX_BYTES = 10 * 1024 * 1024;

export const EMPTY_SUBCONTRACTOR_FORM = {
  company: '', name: '', service: '', specialty: '',
  phone: '', email: '', website: '',
  address: '', license: '', reference: '', notes: '',
  coi_expires_on: '',
  coi_file_path: '',  // existing stored file; cleared when the user removes it
  coi_file: null,     // newly chosen File to upload on save
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
    coi_expires_on: sub.coi_expires_on ?? '',
    coi_file_path: sub.coi_file_path ?? '',
    coi_file: null,
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
  if (form.coi_file) {
    if (!COI_ACCEPT.split(',').includes(form.coi_file.type)) return 'The COI file must be a PDF or a photo (JPG, PNG, HEIC).';
    if (form.coi_file.size > COI_MAX_BYTES) return 'The COI file is larger than 10 MB.';
  }
  return null;
}

// Form fields → table row. Specialty falls back to the trade (the column is required).
function toRow(form, coiFilePath) {
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
    coi_expires_on: form.coi_expires_on || null,
    coi_file_path: coiFilePath || null,
  };
}

function friendlyError(error) {
  // RLS hides the row from non-admins, so .single() finds nothing to return.
  if (error.code === 'PGRST116' || error.code === '42501') {
    return 'You need to be signed in as an admin to save subcontractors.';
  }
  return error.message || 'Could not save the subcontractor.';
}

// ── COI files ─────────────────────────────────────────────────────────────
async function uploadCoi(file) {
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(COI_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: `COI upload failed: ${error.message}` };
  return { path };
}

async function removeCoi(path) {
  if (path) await supabase.storage.from(COI_BUCKET).remove([path]);
}

// Opens the stored COI in a new tab through a short-lived signed URL.
// The tab is opened before the await so popup blockers allow it.
export async function openCoi(path) {
  const tab = window.open('', '_blank');
  const { data, error } = await supabase.storage.from(COI_BUCKET).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) {
    tab?.close();
    return { error: 'Could not open the COI file.' };
  }
  if (tab) tab.location.href = data.signedUrl;
  else window.location.href = data.signedUrl;
  return {};
}

// 'none' (no date), 'active' (expires today or later) or 'expired' (before today).
export function coiStatus(expiresOn) {
  if (!expiresOn) return 'none';
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return expiresOn < today ? 'expired' : 'active';
}

// 'YYYY-MM-DD' → 'Oct 12, 2026' without a timezone shift.
export function formatCoiDate(expiresOn) {
  const [y, m, d] = expiresOn.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Save ──────────────────────────────────────────────────────────────────
// `previousFilePath` is the COI stored before editing, so a replaced or
// removed file can be deleted once the row is saved.
async function save(write, form, previousFilePath = null) {
  let filePath = form.coi_file_path || null;
  let uploaded = null;
  if (form.coi_file) {
    const { path, error } = await uploadCoi(form.coi_file);
    if (error) return { error };
    filePath = uploaded = path;
  }

  const { data, error } = await write(toRow(form, filePath));
  if (error) {
    await removeCoi(uploaded);   // don't leave an orphaned upload behind
    return { error: friendlyError(error) };
  }
  if (previousFilePath && previousFilePath !== filePath) await removeCoi(previousFilePath);
  return { data };
}

export function createSubcontractor(form) {
  return save(
    (row) => supabase.from('subcontractor_directory').insert(row).select('id').single(),
    form,
  );
}

export function updateSubcontractor(id, form, previousFilePath) {
  return save(
    (row) => supabase.from('subcontractor_directory').update(row).eq('id', id).select('id').single(),
    form,
    previousFilePath,
  );
}
