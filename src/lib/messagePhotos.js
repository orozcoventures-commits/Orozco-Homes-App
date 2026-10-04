import { supabase } from './supabase';

// Photos attached to messages (migrations 045–046). Files live in the public
// "message-photos" bucket under "<project_id>/<random>.<ext>" and open by
// direct link. Admins and account clients upload directly; PIN-portal
// clients get a one-time upload link from /api/message-photo-upload.

export const MESSAGE_PHOTO_BUCKET = 'message-photos';
export const MESSAGE_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';
const MAX_BYTES = 10 * 1024 * 1024;

// Returns an error message, or null when the photo can be uploaded.
export function checkMessagePhoto(file) {
  if (!file) return 'Choose a photo first.';
  if (!MESSAGE_PHOTO_ACCEPT.split(',').includes(file.type)) return 'Photos must be JPG, PNG, WEBP or HEIC.';
  if (file.size > MAX_BYTES) return 'The photo is larger than 10 MB.';
  return null;
}

// Returns { path } or { error }.
export async function uploadMessagePhoto(projectId, file) {
  const problem = checkMessagePhoto(file);
  if (problem) return { error: problem };
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${projectId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(MESSAGE_PHOTO_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: `Photo upload failed: ${error.message}` };
  return { path };
}

// PIN-portal upload. Returns { path } or { error }.
export async function uploadPinMessagePhoto(session, file) {
  const problem = checkMessagePhoto(file);
  if (problem) return { error: problem };
  let grant;
  try {
    const res = await fetch('/api/message-photo-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: session.projectId, pin: session.pin, fileType: file.type }),
    });
    grant = await res.json().catch(() => null);
    if (!res.ok || !grant?.path || !grant?.token) return { error: grant?.error || 'Photo upload is unavailable right now.' };
  } catch {
    return { error: 'Photo upload is unavailable right now.' };
  }
  const { error } = await supabase.storage.from(MESSAGE_PHOTO_BUCKET)
    .uploadToSignedUrl(grant.path, grant.token, file, { contentType: file.type });
  if (error) return { error: `Photo upload failed: ${error.message}` };
  return { path: grant.path };
}

export async function removeMessagePhoto(path) {
  if (path) await supabase.storage.from(MESSAGE_PHOTO_BUCKET).remove([path]);
}

export function messagePhotoUrl(path) {
  if (!path) return null;
  return supabase.storage.from(MESSAGE_PHOTO_BUCKET).getPublicUrl(path).data?.publicUrl ?? null;
}
