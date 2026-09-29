-- Migration 024: Job Scheduling System
-- Creates: subcontractors, resources, job_schedules tables
-- RPCs:    check_schedule_conflicts, cascade_dependency_shift,
--          remove_schedule_from_dependencies

-- ── 1. Subcontractors ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subcontractors (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  trade      TEXT        NOT NULL DEFAULT 'General',
  email      TEXT,
  phone      TEXT,
  color      TEXT        NOT NULL DEFAULT '#1D4ED8',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subcontractors: anyone read"
  ON public.subcontractors FOR SELECT USING (true);
CREATE POLICY "subcontractors: admin write"
  ON public.subcontractors FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ── 2. Resources / Equipment ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.resources (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'Equipment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resources: anyone read"
  ON public.resources FOR SELECT USING (true);
CREATE POLICY "resources: admin write"
  ON public.resources FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ── 3. Job Schedules ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_schedules (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_name           TEXT        NOT NULL,
  assigned_to         UUID        REFERENCES public.subcontractors(id) ON DELETE SET NULL,
  resources_allocated UUID[]      NOT NULL DEFAULT '{}',
  start_datetime      TIMESTAMPTZ NOT NULL,
  end_datetime        TIMESTAMPTZ NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','in_progress','completed','delayed')),
  dependencies        UUID[]      NOT NULL DEFAULT '{}',
  notes               TEXT        NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_end_after_start CHECK (end_datetime > start_datetime)
);

ALTER TABLE public.job_schedules ENABLE ROW LEVEL SECURITY;

-- Admins: full access across all projects
CREATE POLICY "job_schedules: admin full"
  ON public.job_schedules FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Clients: read-only for their own project
CREATE POLICY "job_schedules: client read own"
  ON public.job_schedules FOR SELECT
  USING (public.user_can_access_project(project_id));

-- Auto-update updated_at on every write
CREATE OR REPLACE FUNCTION public.set_job_schedule_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_job_schedule_updated_at ON public.job_schedules;
CREATE TRIGGER trg_job_schedule_updated_at
  BEFORE UPDATE ON public.job_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_job_schedule_updated_at();

-- ── 4. Conflict Detection RPC ─────────────────────────────────────────────────
-- Returns a row for every scheduling conflict (subcontractor or equipment)
-- that overlaps the requested [p_start, p_end) window.
CREATE OR REPLACE FUNCTION public.check_schedule_conflicts(
  p_assigned_to UUID,
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
  conflict_item    TEXT    -- name of the conflicting person or tool
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- Subcontractor double-booking
  SELECT js.id, js.task_name, pr.project_name,
         'subcontractor'::TEXT, sc.name
  FROM   public.job_schedules  js
  JOIN   public.projects       pr ON pr.id = js.project_id
  JOIN   public.subcontractors sc ON sc.id = js.assigned_to
  WHERE  js.assigned_to IS NOT NULL
    AND  js.assigned_to = p_assigned_to
    AND  (p_exclude_id IS NULL OR js.id <> p_exclude_id)
    AND  js.start_datetime < p_end
    AND  js.end_datetime   > p_start

  UNION ALL

  -- Equipment / resource double-booking
  SELECT js.id, js.task_name, pr.project_name,
         'resource'::TEXT, r.name
  FROM   public.job_schedules js
  JOIN   public.projects      pr ON pr.id = js.project_id
  JOIN   public.resources     r  ON r.id  = ANY(js.resources_allocated)
  WHERE  array_length(p_resources, 1) > 0
    AND  r.id = ANY(p_resources)
    AND  (p_exclude_id IS NULL OR js.id <> p_exclude_id)
    AND  js.start_datetime < p_end
    AND  js.end_datetime   > p_start;
$$;

GRANT EXECUTE ON FUNCTION public.check_schedule_conflicts TO authenticated;

-- ── 5. Dependency Cascade RPC ─────────────────────────────────────────────────
-- Shifts every schedule that directly or transitively depends on p_root_id
-- by the given interval.  The root itself is NOT moved here — caller already
-- updated it.  Returns the UUID of each row that was shifted.
CREATE OR REPLACE FUNCTION public.cascade_dependency_shift(
  p_root_id  UUID,
  p_interval INTERVAL,
  p_visited  UUID[] DEFAULT '{}'
)
RETURNS SETOF UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  dep_id UUID;
BEGIN
  FOR dep_id IN
    SELECT id FROM public.job_schedules
    WHERE  p_root_id = ANY(dependencies)
      AND  id <> ALL(p_visited || p_root_id)
  LOOP
    UPDATE public.job_schedules
    SET    start_datetime = start_datetime + p_interval,
           end_datetime   = end_datetime   + p_interval
    WHERE  id = dep_id;

    RETURN NEXT dep_id;

    -- Recurse: shift dependents of dep_id
    RETURN QUERY SELECT * FROM public.cascade_dependency_shift(
      dep_id, p_interval, p_visited || dep_id
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cascade_dependency_shift TO authenticated;

-- ── 6. Dependency cleanup on delete ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.remove_schedule_from_dependencies(p_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.job_schedules
  SET    dependencies = array_remove(dependencies, p_id)
  WHERE  p_id = ANY(dependencies);
$$;

GRANT EXECUTE ON FUNCTION public.remove_schedule_from_dependencies TO authenticated;

-- ── 7. Seed: sample subcontractors ───────────────────────────────────────────
INSERT INTO public.subcontractors (name, trade, color) VALUES
  ('Mike Rivera',  'Framing',          '#1D4ED8'),
  ('Sara Nguyen',  'Plumbing',         '#0369A1'),
  ('Carlos Díaz',  'Electrical',       '#7C3AED'),
  ('Jamie Kelso',  'HVAC',             '#059669'),
  ('Tony Cruz',    'Finish Carpentry', '#B45309')
ON CONFLICT DO NOTHING;

-- ── 8. Seed: sample resources ─────────────────────────────────────────────────
INSERT INTO public.resources (name, type) VALUES
  ('Concrete Mixer', 'Equipment'),
  ('Scissor Lift',   'Equipment'),
  ('Tile Saw',       'Tool'),
  ('Air Compressor', 'Tool'),
  ('Dump Trailer',   'Vehicle')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
