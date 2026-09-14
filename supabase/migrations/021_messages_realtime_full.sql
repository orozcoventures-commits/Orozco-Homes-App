-- Migration 021: Set REPLICA IDENTITY FULL on messages table.
-- Required for Supabase Realtime server-side row filters (project_id=eq.X)
-- to work reliably. Without this, filtered channels may receive all rows
-- or miss events when the primary key alone cannot satisfy the filter check.

ALTER TABLE public.messages REPLICA IDENTITY FULL;

NOTIFY pgrst, 'reload schema';
