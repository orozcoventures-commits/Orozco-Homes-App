// POST /api/message-photo-upload   { projectId, pin, fileType }
//
// PIN-portal clients have no Supabase login, so they cannot upload to the
// "message-photos" bucket themselves (migration 045/046). This function
// checks their project PIN (pin_photo_upload_allowed, which applies the same
// lockout as the portal) and returns a one-time signed upload link for a new,
// randomly named file in that project's folder:
//   { path, token }  → supabase.storage.from('message-photos').uploadToSignedUrl(path, token, file)
// The message itself is then posted with the send_pin_photo_message RPC.
//
// Required Netlify environment variables (server-side only, never VITE_*):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { randomUUID } from 'node:crypto';

const BUCKET = 'message-photos';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

// Pure input check, exported for tests. Returns { projectId, pin, ext } or { error }.
export function parseUploadRequest(input) {
  const projectId = String(input?.projectId ?? '').trim();
  const pin = String(input?.pin ?? '').trim();
  const ext = EXT_BY_TYPE[String(input?.fileType ?? '').toLowerCase()];
  if (!UUID_RE.test(projectId) || !pin || pin.length > 32) return { error: 'Invalid request' };
  if (!ext) return { error: 'Photos must be JPG, PNG, WEBP or HEIC.' };
  return { projectId: projectId.toLowerCase(), pin, ext };
}

export default async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } });
  }

  let config;
  try {
    config = getConfig();
  } catch (err) {
    console.error('[message-photo-upload]', err.message);
    return Response.json({ error: 'Photo upload is unavailable right now.' }, { status: 500 });
  }

  const parsed = parseUploadRequest(await req.json().catch(() => null));
  if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 });

  const check = await supabasePost(config, '/rest/v1/rpc/pin_photo_upload_allowed', {
    p_project_id: parsed.projectId,
    p_pin: parsed.pin,
  });
  if (!check.ok) {
    // P0001 is the lockout message ("Too many incorrect PIN attempts…").
    if (check.body?.code === 'P0001') return Response.json({ error: check.body.message }, { status: 429 });
    console.error('[message-photo-upload] PIN check failed:', `HTTP ${check.status}`, check.body?.message ?? check.body);
    return Response.json({ error: 'Photo upload is unavailable right now.' }, { status: 500 });
  }
  if (check.body !== true) {
    return Response.json({ error: 'Your PIN session has expired. Please sign out and sign in again.' }, { status: 403 });
  }

  const path = `${parsed.projectId}/${randomUUID()}.${parsed.ext}`;
  const signed = await supabasePost(config, `/storage/v1/object/upload/sign/${BUCKET}/${path}`);
  const token = signed.ok ? new URL(signed.body?.url ?? '', 'http://x').searchParams.get('token') : null;
  if (!token) {
    console.error('[message-photo-upload] signed upload failed:', `HTTP ${signed.status}`, signed.body?.message ?? signed.body);
    return Response.json({ error: 'Photo upload is unavailable right now.' }, { status: 500 });
  }

  return Response.json({ path, token });
};

export const config = {
  path: '/api/message-photo-upload',
};
