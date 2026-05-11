-- Migration 008: enforce message immutability
-- Messages are append-only for all users.
-- Only the service_role (bypasses RLS entirely) or a DB admin can ever
-- delete / update a message — there is intentionally NO policy granting
-- clients or the anon role UPDATE or DELETE on this table.

-- Drop any pre-existing update/delete policies so this migration is
-- idempotent and safe to re-run.
DROP POLICY IF EXISTS "messages: admin update" ON public.messages;
DROP POLICY IF EXISTS "messages: admin delete" ON public.messages;
DROP POLICY IF EXISTS "messages: client update" ON public.messages;
DROP POLICY IF EXISTS "messages: client delete" ON public.messages;

-- Re-create update/delete policies restricted to the admin app role only.
-- service_role bypasses RLS entirely, so no explicit policy is needed for it.
CREATE POLICY "messages: admin update"
  ON public.messages FOR UPDATE
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "messages: admin delete"
  ON public.messages FOR DELETE
  USING (get_user_role() = 'admin');

-- Verify RLS is still enabled (idempotent).
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
