import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// The project's client allowances [{ key, label, amount }] from the Remodel
// Budget (migration 052). Empty when there are none or before the migration.
export function useProjectAllowances(projectId) {
  const [state, setState] = useState({ projectId: null, list: [] });
  useEffect(() => {
    if (!projectId) return undefined;
    let live = true;
    supabase.rpc('get_project_allowances', { p_project_id: projectId }).then(({ data, error }) => {
      if (!live) return;
      const list = !error && Array.isArray(data)
        ? data.filter((a) => a && a.key && a.label && Number(a.amount) > 0)
        : [];
      setState({ projectId, list });
    });
    return () => { live = false; };
  }, [projectId]);
  return state.projectId === projectId ? state.list : [];
}
