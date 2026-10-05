import { supabase } from './supabase';
import { MESSAGE_PHOTO_ACCEPT, checkMessagePhoto } from './messagePhotos';

// Photos customers attach to the Pre-Consultation Questionnaire (migration
// 049). The bucket is private: customers upload through a one-time link from
// /api/questionnaire-photo-upload, and only admins can view the photos.

export const QUESTIONNAIRE_PHOTO_BUCKET = 'questionnaire-photos';
export const QUESTIONNAIRE_PHOTO_ACCEPT = MESSAGE_PHOTO_ACCEPT;
export const checkQuestionnairePhoto = checkMessagePhoto;

// token: the private link code, or null for the website link. Returns { path } or { error }.
export async function uploadQuestionnairePhoto(token, file) {
  const problem = checkQuestionnairePhoto(file);
  if (problem) return { error: problem };
  let grant;
  try {
    const res = await fetch('/api/questionnaire-photo-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, fileType: file.type }),
    });
    grant = await res.json().catch(() => null);
    if (!res.ok || !grant?.path || !grant?.token) return { error: grant?.error || 'Photo upload is unavailable right now.' };
  } catch {
    return { error: 'Photo upload is unavailable right now.' };
  }
  const { error } = await supabase.storage.from(QUESTIONNAIRE_PHOTO_BUCKET)
    .uploadToSignedUrl(grant.path, grant.token, file, { contentType: file.type });
  if (error) return { error: `Photo upload failed: ${error.message}` };
  return { path: grant.path };
}

// Admin only: { path: signedUrl } for viewing, valid for an hour.
export async function signedQuestionnairePhotoUrls(paths) {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from(QUESTIONNAIRE_PHOTO_BUCKET).createSignedUrls(paths, 3600);
  if (error || !data) return {};
  return Object.fromEntries(data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
}
