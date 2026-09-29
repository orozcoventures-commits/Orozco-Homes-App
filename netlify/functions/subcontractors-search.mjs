// GET /api/subcontractors/search?taskName=Drywall
//
// Returns subcontractors whose `specialty` or `service` contains `taskName`
// (case-insensitive). With no taskName, or no matches, returns the full list.
//
// Reads from the Supabase `subcontractors` table (migration 028) using the
// service role key, so callers must prove they are an admin: send the
// logged-in user's Supabase access token as `Authorization: Bearer <token>`.
//
// Required Netlify environment variables (server-side only, never VITE_*):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';

let client = null;

function getSupabase() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set');
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

async function isAdmin(supabase, req) {
  const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return false;

  const { data: { user } = {}, error } = await supabase.auth.getUser(token);
  if (error || !user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  return profile?.role === 'admin';
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

  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    console.error('[subcontractors-search]', err.message);
    return Response.json({ error: 'Subcontractor data is unavailable' }, { status: 500 });
  }

  if (!(await isAdmin(supabase, req))) {
    return Response.json({ error: 'Admin access required' }, { status: 401 });
  }

  // The whole directory is small (~115 rows), and the no-match fallback needs
  // the full list anyway, so fetch once and filter in memory.
  const { data: subcontractors, error } = await supabase
    .from('subcontractors')
    .select('id, service, name, company, specialty, phone, email, website, address, license, reference, notes')
    .order('id');
  if (error) {
    console.error('[subcontractors-search]', error.message);
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
