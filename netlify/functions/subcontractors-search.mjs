// GET /api/subcontractors/search?taskName=Drywall
//
// Returns subcontractors whose `specialty` or `service` contains `taskName`
// (case-insensitive). With no taskName, or no matches, returns the full list.
//
// Data comes from subcontractors.json at the repo root. That file holds
// personal contact details and is intentionally not committed, so it must be
// present at deploy time (see netlify.toml `included_files`) or pointed to via
// the SUBCONTRACTORS_FILE environment variable.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_FILE = 'subcontractors.json';

function candidatePaths() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return [
    process.env.SUBCONTRACTORS_FILE,
    path.resolve(process.cwd(), DATA_FILE),
    path.resolve(here, '../..', DATA_FILE),
  ].filter(Boolean);
}

let cache = null;

async function loadSubcontractors() {
  if (cache) return cache;
  for (const file of candidatePaths()) {
    try {
      cache = JSON.parse(await readFile(file, 'utf8'));
      return cache;
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
  throw new Error(`${DATA_FILE} not found`);
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

  let subcontractors;
  try {
    subcontractors = await loadSubcontractors();
  } catch (err) {
    console.error('[subcontractors-search]', err.message);
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
