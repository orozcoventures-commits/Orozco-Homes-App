import { supabase } from './supabase';

// Signed paper copies of proposals and contracts (migration 043). Files live
// in the private "signed-documents" bucket; only admins can read or upload.

export const SIGNED_BUCKET = 'signed-documents';
export const SIGNED_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif';
const MAX_BYTES = 15 * 1024 * 1024;

// Returns an error message, or null when the file can be uploaded.
export function checkSignedFile(file) {
  if (!file) return 'Choose the signed file first.';
  if (!SIGNED_ACCEPT.split(',').includes(file.type)) return 'The signed copy must be a PDF or a photo (JPG, PNG, HEIC).';
  if (file.size > MAX_BYTES) return 'The file is larger than 15 MB.';
  return null;
}

// kind: 'proposals' | 'contracts'. Returns { path } or { error }.
export async function uploadSignedCopy(kind, id, file) {
  const problem = checkSignedFile(file);
  if (problem) return { error: problem };
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf';
  const path = `${kind}/${id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(SIGNED_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: `Upload failed: ${error.message}` };
  return { path };
}

export async function removeSignedCopy(path) {
  if (path) await supabase.storage.from(SIGNED_BUCKET).remove([path]);
}

// Opens the signed copy in a new tab through a short-lived signed URL.
// The tab is opened before the await so popup blockers allow it.
export async function openSignedCopy(path) {
  const tab = window.open('', '_blank');
  const { data, error } = await supabase.storage.from(SIGNED_BUCKET).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) {
    tab?.close();
    return { error: 'Could not open the signed copy.' };
  }
  if (tab) tab.location.href = data.signedUrl;
  else window.location.href = data.signedUrl;
  return {};
}
