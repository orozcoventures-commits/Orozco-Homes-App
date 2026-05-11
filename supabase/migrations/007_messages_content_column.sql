-- Migration 007: standardise messages column name to 'content'
-- Safe to run whether or not migration 006 was already applied.

-- 1. Create the table if it doesn't exist yet (migration 006 not run)
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id   UUID        NOT NULL REFERENCES auth.users(id),
  sender_role TEXT        NOT NULL CHECK (sender_role IN ('admin', 'client')),
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. If migration 006 already ran and created the column as 'body', rename it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'messages'
      AND column_name  = 'body'
  ) THEN
    ALTER TABLE public.messages RENAME COLUMN body TO content;
  END IF;
END $$;

-- 3. Enable RLS (idempotent)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Policies — drop first so re-running is safe
DROP POLICY IF EXISTS "messages: select own project or admin" ON public.messages;
DROP POLICY IF EXISTS "messages: insert own project or admin" ON public.messages;
DROP POLICY IF EXISTS "messages: admin update"               ON public.messages;
DROP POLICY IF EXISTS "messages: admin delete"               ON public.messages;

CREATE POLICY "messages: select own project or admin"
  ON public.messages FOR SELECT
  USING (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.client_id = auth.uid()
          OR p.managed_client_id IN (
            SELECT c.id FROM public.clients c
            WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
          )
        )
    )
  );

CREATE POLICY "messages: insert own project or admin"
  ON public.messages FOR INSERT
  WITH CHECK (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.client_id = auth.uid()
          OR p.managed_client_id IN (
            SELECT c.id FROM public.clients c
            WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
          )
        )
    )
  );

CREATE POLICY "messages: admin update"
  ON public.messages FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "messages: admin delete"
  ON public.messages FOR DELETE
  USING (get_user_role() = 'admin');

-- 5. Enable Realtime (idempotent — safe if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
