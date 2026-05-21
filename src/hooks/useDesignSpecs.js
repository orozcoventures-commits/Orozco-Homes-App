import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const SPEC_SELECT = `
  id, project_id, room_category, product_name, supplier,
  unit_price, unit_type, quantity, labor_rate, installed_cost,
  phase_tag, designer_notes, status, client_feedback, created_by, created_at, updated_at,
  project:projects(id, project_name)
`;

export function useDesignSpecs(projectId = null) {
  const [specs,   setSpecs]   = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSpecs = useCallback(async (pid) => {
    const target = pid ?? projectId;
    if (!target) { setSpecs([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('design_specs')
      .select(SPEC_SELECT)
      .eq('project_id', target)
      .order('created_at');
    setSpecs(data ?? []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchSpecs(projectId); }, [projectId, fetchSpecs]);

  const createSpec = useCallback(async (payload) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('design_specs')
      .insert({ ...payload, created_by: user?.id })
      .select(SPEC_SELECT)
      .single();
    if (error) return { error: error.message };
    setSpecs((prev) => [...prev, data]);
    return { data };
  }, []);

  const updateSpec = useCallback(async (id, payload) => {
    const { data, error } = await supabase
      .from('design_specs')
      .update(payload)
      .eq('id', id)
      .select(SPEC_SELECT)
      .single();
    if (error) return { error: error.message };
    setSpecs((prev) => prev.map((s) => (s.id === id ? data : s)));
    return { data };
  }, []);

  const deleteSpec = useCallback(async (id) => {
    const { error } = await supabase.from('design_specs').delete().eq('id', id);
    if (error) return { error: error.message };
    setSpecs((prev) => prev.filter((s) => s.id !== id));
    return {};
  }, []);

  // Client action: approve or decline a spec
  const clientRespond = useCallback(async (specId, status, feedback = '') => {
    const { error } = await supabase.rpc('client_respond_to_spec', {
      p_spec_id:  specId,
      p_status:   status,
      p_feedback: feedback,
    });
    if (error) return { error: error.message };
    setSpecs((prev) =>
      prev.map((s) => s.id === specId ? { ...s, status, client_feedback: feedback } : s)
    );
    return {};
  }, []);

  // Fetch approved specs across all projects (for RemodelBudget injection)
  const fetchApprovedByProject = useCallback(async (pid) => {
    if (!pid) return [];
    const { data } = await supabase
      .from('design_specs')
      .select(SPEC_SELECT)
      .eq('project_id', pid)
      .eq('status', 'approved')
      .order('room_category');
    return data ?? [];
  }, []);

  return {
    specs,
    loading,
    createSpec,
    updateSpec,
    deleteSpec,
    clientRespond,
    fetchApprovedByProject,
    refresh: () => fetchSpecs(projectId),
  };
}
