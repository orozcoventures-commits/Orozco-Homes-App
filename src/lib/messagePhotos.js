import { supabase } from './supabase';

// Photos attached to messages (migration 045). Files live in the public
// "message-photos" bucket under "<project_id>/<random>.<ext>"; they open by
// direct link, and only admins can upload.

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

export async function removeMessagePhoto(path) {
  if (path) await supabase.storage.from(MESSAGE_PHOTO_BUCKET).remove([path]);
}

export function messagePhotoUrl(path) {
  if (!path) return null;
  return supabase.storage.from(MESSAGE_PHOTO_BUCKET).getPublicUrl(path).data?.publicUrl ?? null;
}
