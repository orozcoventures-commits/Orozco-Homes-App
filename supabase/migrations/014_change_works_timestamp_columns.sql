-- Migration 014: ensure all change_works columns exist
-- submitted_at, approved_at, approved_by, declined_at may be absent
-- if migration 004 was partially applied. Idempotent.

ALTER TABLE public.change_works
  ADD COLUMN IF NOT EXISTS submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by   TEXT,
  ADD COLUMN IF NOT EXISTS declined_at   TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
