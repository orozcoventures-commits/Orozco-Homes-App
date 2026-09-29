import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const SCHEDULE_SELECT = `
  *,
  subcontractor:subcontractors(id, name, trade, color),
  project:projects(id, project_name)
`;

export function useSchedule() {
  const [schedules, setSchedules]           = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [resources, setResources]           = useState([]);
  const [projects, setProjects]             = useState([]);
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    Promise.all([
      fetchSchedules(),
      fetchSubcontractors(),
      fetchResources(),
      fetchProjects(),
    ]);
  }, []);

  async function fetchSchedules() {
    setLoading(true);
    const { data } = await supabase
      .from('job_schedules')
      .select(SCHEDULE_SELECT)
      .order('start_datetime');
    setSchedules(data ?? []);
    setLoading(false);
  }

  async function fetchSubcontractors() {
    const { data } = await supabase.from('subcontractors').select('*').order('name');
    if (data) setSubcontractors(data);
  }

  async function fetchResources() {
    const { data } = await supabase.from('resources').select('*').order('name');
    if (data) setResources(data);
  }

  async function fetchProjects() {
    const { data } = await supabase
      .from('projects')
      .select('id, project_name')
      .order('created_at', { ascending: false });
    if (data) setProjects(data);
  }

  // Returns array of conflict rows; empty means no conflict.
  const checkConflicts = useCallback(async ({
    assignedTo,
    resourcesAllocated = [],
    startDatetime,
    endDatetime,
    excludeId,
  }) => {
    if (!assignedTo && resourcesAllocated.length === 0) return [];
    const { data } = await supabase.rpc('check_schedule_conflicts', {
      p_assigned_to: assignedTo ?? null,
      p_resources:   resourcesAllocated,
      p_start:       startDatetime,
      p_end:         endDatetime,
      p_exclude_id:  excludeId ?? null,
    });
    return data ?? [];
  }, []);

  const createSchedule = useCallback(async (payload) => {
    const { data, error } = await supabase
      .from('job_schedules')
      .insert(payload)
      .select(SCHEDULE_SELECT)
      .single();
    if (error) return { error: error.message };
    setSchedules((prev) =>
      [...prev, data].sort((a, b) =>
        new Date(a.start_datetime) - new Date(b.start_datetime)
      )
    );
    return { data };
  }, []);

  const updateSchedule = useCallback(async (id, payload, { cascade = false, originalStart } = {}) => {
    const { data, error } = await supabase
      .from('job_schedules')
      .update(payload)
      .eq('id', id)
      .select(SCHEDULE_SELECT)
      .single();
    if (error) return { error: error.message };

    let cascadedCount = 0;
    if (cascade && payload.start_datetime && originalStart) {
      const diffMs = new Date(payload.start_datetime) - new Date(originalStart);
      if (diffMs !== 0) {
        const totalSecs = Math.round(Math.abs(diffMs) / 1000);
        const sign      = diffMs >= 0 ? '' : '-';
        const { data: shifted } = await supabase.rpc('cascade_dependency_shift', {
          p_root_id:  id,
          p_interval: `${sign}${totalSecs} seconds`,
        });
        cascadedCount = shifted?.length ?? 0;
        if (cascadedCount > 0) {
          await fetchSchedules();
          return { data, cascadedCount };
        }
      }
    }

    setSchedules((prev) => prev.map((s) => (s.id === id ? data : s)));
    return { data, cascadedCount };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteSchedule = useCallback(async (id) => {
    await supabase.rpc('remove_schedule_from_dependencies', { p_id: id });
    const { error } = await supabase.from('job_schedules').delete().eq('id', id);
    if (error) return { error: error.message };
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    return {};
  }, []);

  return {
    schedules,
    subcontractors,
    resources,
    projects,
    loading,
    checkConflicts,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    refresh: fetchSchedules,
  };
}
