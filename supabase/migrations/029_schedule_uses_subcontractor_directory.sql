-- Migration 029: Job Schedule assigns subcontractors from the directory
-- The schedule's "Assigned to" list now comes from subcontractor_directory
-- (the 115 real contractors, admin-only) instead of the sample crew in
-- public.subcontractors (migration 024).
--
-- Existing assignments are kept: the old UUID link is renamed to
-- legacy_crew_id and a new integer assigned_to points at the directory.
-- Run this BEFORE deploying the matching useSchedule.js change.

-- 1. A single label for dropdowns and calendar chips: company, else contact name.
ALTER TABLE public.subcontractor_directory
  ADD COLUMN IF NOT EXISTS display_name TEXT
  GENERATED ALWAYS AS (COALESCE(company, name, service)) STORED;

-- 2. Re-point job_schedules.assigned_to at the directory (idempotent).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'job_schedules' AND column_name = 'legacy_crew_id'
  ) THEN
    ALTER TABLE public.job_schedules RENAME COLUMN assigned_to TO legacy_crew_id;
    ALTER TABLE public.job_schedules
      ADD COLUMN assigned_to INTEGER REFERENCES public.subcontractor_directory(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS job_schedules_assigned_to_idx ON public.job_schedules (assigned_to);

-- 3. Conflict detection now matches directory subcontractors. The directory is
--    confidential, so this SECURITY DEFINER function only answers admins.
DROP FUNCTION IF EXISTS public.check_schedule_conflicts(UUID, UUID[], TIMESTAMPTZ, TIMESTAMPTZ, UUID);

CREATE OR REPLACE FUNCTION public.check_schedule_conflicts(
  p_assigned_to INTEGER,
  p_resources   UUID[],
  p_start       TIMESTAMPTZ,
  p_end         TIMESTAMPTZ,
  p_exclude_id  UUID DEFAULT NULL
)
RETURNS TABLE (
  conflict_id      UUID,
  conflict_task    TEXT,
  conflict_project TEXT,
  conflict_type    TEXT,   -- 'subcontractor' | 'resource'
  conflict_item    TEXT    -- name of the conflicting subcontractor or tool
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- Subcontractor double-booking
  SELECT js.id, js.task_name, pr.project_name,
         'subcontractor'::TEXT, sd.display_name
  FROM   public.job_schedules           js
  JOIN   public.projects                pr ON pr.id = js.project_id
  JOIN   public.subcontractor_directory sd ON sd.id = js.assigned_to
  WHERE  public.get_user_role() = 'admin'
    AND  js.assigned_to IS NOT NULL
    AND  js.assigned_to = p_assigned_to
    AND  (p_exclude_id IS NULL OR js.id <> p_exclude_id)
    AND  js.start_datetime < p_end
    AND  js.end_datetime   > p_start

  UNION ALL

  -- Equipment / resource double-booking (unchanged)
  SELECT js.id, js.task_name, pr.project_name,
         'resource'::TEXT, r.name
  FROM   public.job_schedules js
  JOIN   public.projects      pr ON pr.id = js.project_id
  JOIN   public.resources     r  ON r.id  = ANY(js.resources_allocated)
  WHERE  public.get_user_role() = 'admin'
    AND  array_length(p_resources, 1) > 0
    AND  r.id = ANY(p_resources)
    AND  (p_exclude_id IS NULL OR js.id <> p_exclude_id)
    AND  js.start_datetime < p_end
    AND  js.end_datetime   > p_start;
$$;

GRANT EXECUTE ON FUNCTION public.check_schedule_conflicts(INTEGER, UUID[], TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
