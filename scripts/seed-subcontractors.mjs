// One-time seed: uploads subcontractors.json into the public.subcontractors
// table (migration 028). Safe to re-run — rows are upserted by id.
// Delete this script once the data is in Supabase.
//
// Usage (from the repo root, with 028_subcontractors.sql already applied):
//   SUPABASE_URL=https://<project>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service role key> \
//   node scripts/seed-subcontractors.mjs
//
// Add --dry-run to validate the file without connecting to Supabase.
// The service role key bypasses RLS: never commit it or use it in the browser.

import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');
const FILE = process.env.SUBCONTRACTORS_FILE || 'subcontractors.json';

const toArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

function toRow(s) {
  if (!Number.isInteger(s.id)) throw new Error(`Invalid id: ${JSON.stringify(s.id)}`);
  if (!s.service || !s.specialty) throw new Error(`Row ${s.id} is missing service or specialty`);
  return {
    id: s.id,
    service: s.service,
    name: s.name,
    company: s.company,
    specialty: s.specialty,
    phone: toArray(s.phone),
    email: toArray(s.email),
    website: toArray(s.website),
    address: s.address,
    license: s.license,
    reference: s.reference,
    notes: s.notes,
  };
}

const rows = JSON.parse(await readFile(FILE, 'utf8')).map(toRow);
if (new Set(rows.map((r) => r.id)).size !== rows.length) throw new Error('Duplicate ids in file');
console.log(`Validated ${rows.length} subcontractors from ${FILE}`);

if (DRY_RUN) process.exit(0);

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { error } = await supabase.from('subcontractors').upsert(rows, { onConflict: 'id' });
if (error) {
  console.error('Upload failed:', error.message);
  process.exit(1);
}

const { count, error: countError } = await supabase
  .from('subcontractors')
  .select('id', { count: 'exact', head: true })
  .in('id', rows.map((r) => r.id));
if (countError) {
  console.error('Uploaded, but verification failed:', countError.message);
  process.exit(1);
}

console.log(`Done: ${count} of ${rows.length} rows present in public.subcontractors`);
process.exit(count === rows.length ? 0 : 1);
