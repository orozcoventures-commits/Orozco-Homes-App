import { supabase } from './supabase';

// Projects for a picker, with their stage (migration 055) when the column
// exists; before it, the same list without stage (everything counts as Active).
export async function selectProjects(columns, { orderBy = 'project_name', ascending = true } = {}) {
  const run = (cols) => supabase.from('projects').select(cols).order(orderBy, { ascending });
  const res = await run(`${columns}, stage`);
  return res.error && /stage/i.test(res.error.message ?? '') ? run(columns) : res;
}
