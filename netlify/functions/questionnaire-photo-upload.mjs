// POST /api/questionnaire-photo-upload   { token?, fileType }
//
// Customers filling in the Pre-Consultation Questionnaire have no login, so
// they cannot upload to the private "questionnaire-photos" bucket themselves
// (migration 049). This function asks questionnaire_photo_upload_folder which
// folder the link may use — "link/<questionnaire id>/" for a private link
// that is still open, "public/" while the website link is on — and returns a
// one-time signed upload link for a new, randomly named file there:
//   { path, token } → supabase.storage.from('questionnaire-photos').uploadToSignedUrl(path, token, file)
// The photo only counts once the questionnaire is submitted and the database
// confirms it was uploaded to that folder.
//
// Required Netlify environment variables (server-side only, never VITE_*):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { randomUUID } from 'node:crypto';

const BUCKET = 'questionnaire-photos';
const TOKEN_RE = /^[0-9a-f]{64}$/i;
const EXT_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

function getConfig() {
  // Accept the project URL with a trailing slash or the Data API's /rest/v1 suffix.
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set');
  return { url, key };
}

async function supabasePost({ url, key }, path, body) {
  const res = await fetch(`${url}${path}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body: json };
}

// Pure input check, exported for tests. Returns { token, ext } or { error }.
export function parseUploadRequest(input) {
  const raw = input?.token == null ? '' : String(input.token).trim();
  if (raw && !TOKEN_RE.test(raw)) return { error: 'Invalid request' };
  const ext = EXT_BY_TYPE[String(input?.fileType ?? '').toLowerCase()];
  if (!ext) return { error: 'Photos must be JPG, PNG, WEBP or HEIC.' };
  return { token: raw.toLowerCase() || null, ext };
}

const unavailable = () => Response.json({ error: 'Photo upload is unavailable right now.' }, { status: 500 });

export default async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } });
  }

  let config;
  try {
    config = getConfig();
  } catch (err) {
    console.error('[questionnaire-photo-upload]', err.message);
    return unavailable();
  }

  const parsed = parseUploadRequest(await req.json().catch(() => null));
  if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 });

  const folder = await supabasePost(config, '/rest/v1/rpc/questionnaire_photo_upload_folder', { p_token: parsed.token });
  if (!folder.ok) {
    console.error('[questionnaire-photo-upload] folder check failed:', `HTTP ${folder.status}`, folder.body?.message ?? folder.body);
    return unavailable();
  }
  if (typeof folder.body !== 'string' || !/^(public\/|link\/[0-9a-f-]{36}\/)$/.test(folder.body)) {
    return Response.json({ error: 'Photos can’t be added to this questionnaire right now. You can still submit it, or text your photos to us.' }, { status: 403 });
  }

  const path = `${folder.body}${randomUUID()}.${parsed.ext}`;
  const signed = await supabasePost(config, `/storage/v1/object/upload/sign/${BUCKET}/${path}`);
  const token = signed.ok ? new URL(signed.body?.url ?? '', 'http://x').searchParams.get('token') : null;
  if (!token) {
    console.error('[questionnaire-photo-upload] signed upload failed:', `HTTP ${signed.status}`, signed.body?.message ?? signed.body);
    return unavailable();
  }

  return Response.json({ path, token });
};

export const config = {
  path: '/api/questionnaire-photo-upload',
};
