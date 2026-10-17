-- Migration 055: project stage
--
-- Where a project is in its life: potential (not approved yet), active
-- (approved, work happening), on-hold (approved but paused) or completed.
-- Existing projects become 'active' so nothing disappears from the lists.
-- Separate from a weekly update's On Track / Needs Attention / Delayed.
-- The existing projects policies apply (admins update).
--
-- Safe to re-run.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'active';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_stage_check') THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_stage_check CHECK (stage IN ('potential', 'active', 'on-hold', 'completed'));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
