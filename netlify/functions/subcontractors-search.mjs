// GET /api/subcontractors/search?taskName=Drywall
//
// Returns subcontractors whose `specialty` or `service` contains `taskName`
// (case-insensitive). With no taskName, or no matches, returns the full list.
//
// Reads from the Supabase `subcontractor_directory` table (migration 028) using the
// service role key, so callers must prove they are an admin: send the
// logged-in user's Supabase access token as `Authorization: Bearer <token>`.
//
// Required Netlify environment variables (server-side only, never VITE_*):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

// Talks to Supabase's REST endpoints with plain fetch rather than
// @supabase/supabase-js: the client's realtime module throws on Node < 22
// (no native WebSocket), and the site's functions run on Node 20.

function getConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set');
  return { url, key };
}

async function supabaseGet({ url, key }, path, bearer = key) {
  const res = await fetch(`${url}${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${bearer}`, Accept: 'application/json' },
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

async function isAdmin(config, req) {
  const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return false;

  const user = await supabaseGet(config, '/auth/v1/user', token);
  if (!user.ok || !user.body?.id) return false;

  const profile = await supabaseGet(
    config,
    `/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(user.body.id)}&limit=1`,
  );
  return profile.ok && profile.body?.[0]?.role === 'admin';
}

export function matchSubcontractors(subcontractors, taskName) {
  const term = (taskName ?? '').trim().toLowerCase();
  if (!term) return { matched: false, results: subcontractors };

  const results = subcontractors.filter((s) =>
    [s.specialty, s.service].some((field) => field?.toLowerCase().includes(term)),
  );

  return results.length
    ? { matched: true, results }
    : { matched: false, results: subcontractors };
}

export default async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'GET' } });
  }

  let config;
  try {
    config = getConfig();
  } catch (err) {
    console.error('[subcontractors-search]', err.message);
    return Response.json({ error: 'Subcontractor data is unavailable' }, { status: 500 });
  }

  if (!(await isAdmin(config, req))) {
    return Response.json({ error: 'Admin access required' }, { status: 401 });
  }

  // The whole directory is small (~115 rows), and the no-match fallback needs
  // the full list anyway, so fetch once and filter in memory.
  const { ok, status, body: subcontractors } = await supabaseGet(
    config,
    '/rest/v1/subcontractor_directory'
      + '?select=id,service,name,company,specialty,phone,email,website,address,license,reference,notes'
      + '&order=id.asc',
  );
  if (!ok || !Array.isArray(subcontractors)) {
    console.error('[subcontractors-search]', `HTTP ${status}`, subcontractors?.message ?? subcontractors);
    return Response.json({ error: 'Subcontractor data is unavailable' }, { status: 500 });
  }

  const taskName = new URL(req.url).searchParams.get('taskName');
  const { matched, results } = matchSubcontractors(subcontractors, taskName);

  return Response.json({
    taskName: taskName?.trim() || null,
    matched,
    count: results.length,
    subcontractors: results,
  });
};

export const config = {
  path: '/api/subcontractors/search',
};
