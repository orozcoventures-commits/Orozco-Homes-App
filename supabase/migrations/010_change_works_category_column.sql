-- Migration 010: ensure change_works.category column exists
-- The column is defined in migration 004 but may be absent if the table
-- was created by an earlier partial run. ADD COLUMN IF NOT EXISTS is idempotent.

ALTER TABLE public.change_works
  ADD COLUMN IF NOT EXISTS category TEXT;

NOTIFY pgrst, 'reload schema';
