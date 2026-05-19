-- Migration 019: Add overhead and profit columns to project_dimensions
-- These allow per-project OH and profit rates, adjustable by the GC later.
-- Stored as decimals (0.18 = 18%), defaulting to industry standard 18% OH + 12% profit.

ALTER TABLE public.project_dimensions
  ADD COLUMN IF NOT EXISTS overhead_pct NUMERIC NOT NULL DEFAULT 0.18,
  ADD COLUMN IF NOT EXISTS profit_pct   NUMERIC NOT NULL DEFAULT 0.12;

NOTIFY pgrst, 'reload schema';
