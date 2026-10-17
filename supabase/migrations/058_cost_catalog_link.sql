-- Migration 058: website link on Cost Catalog items
--
-- Optional product / supplier page or spec sheet for an item. Internal only.
-- Only http(s) addresses are accepted.
--
-- Safe to re-run.

ALTER TABLE public.cost_catalog_items
  ADD COLUMN IF NOT EXISTS link TEXT NOT NULL DEFAULT ''
  CHECK (link = '' OR (char_length(link) <= 500 AND link ~* '^https?://'));

NOTIFY pgrst, 'reload schema';
