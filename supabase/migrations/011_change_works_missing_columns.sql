-- Migration 011: add all missing change_works columns to live DB
-- The table was created before migrations 004 fully applied, leaving
-- category, original_cost, new_cost, and created_by absent.
-- ADD COLUMN IF NOT EXISTS is idempotent.

ALTER TABLE public.change_works
  ADD COLUMN IF NOT EXISTS category      TEXT,
  ADD COLUMN IF NOT EXISTS original_cost NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_cost      NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
