CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(email)
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients: admins full access"
  ON public.clients FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

ALTER TABLE public.projects
  ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS managed_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
