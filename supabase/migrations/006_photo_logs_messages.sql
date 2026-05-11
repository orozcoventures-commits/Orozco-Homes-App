-- =============================================================================
-- Migration 006: photo_logs + messages tables
-- =============================================================================

-- ── photo_logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.photo_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category    TEXT        NOT NULL,
  caption     TEXT        NOT NULL,
  created_by  UUID        NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  likes       INTEGER     NOT NULL DEFAULT 0
);

ALTER TABLE public.photo_logs ENABLE ROW LEVEL SECURITY;

-- Clients see photos for their own project(s); admin sees all.
CREATE POLICY "photo_logs: select own project or admin"
  ON public.photo_logs FOR SELECT
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

CREATE POLICY "photo_logs: admin insert"
  ON public.photo_logs FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "photo_logs: admin update"
  ON public.photo_logs FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "photo_logs: admin delete"
  ON public.photo_logs FOR DELETE
  USING (get_user_role() = 'admin');

-- ── messages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id   UUID        NOT NULL REFERENCES auth.users(id),
  sender_role TEXT        NOT NULL CHECK (sender_role IN ('admin', 'client')),
  body        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Both admin and the project's client can read messages.
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

-- Both admin and the project's client can send messages.
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

-- Enable Realtime for messages so MessageCenter gets live updates.
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

NOTIFY pgrst, 'reload schema';
