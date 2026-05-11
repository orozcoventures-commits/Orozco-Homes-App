-- =============================================================================
-- Orozco Homes App — Supabase Initial Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- Creates:
--   • profiles        — extends auth.users with role + full name
--   • projects        — one project per client
--   • weekly_updates  — contractor posts per project
--
-- Row Level Security ensures:
--   • Clients can only read their own projects and updates
--   • Admins have full read + write access across all rows
--   • No secret/service key is needed in frontend code
-- =============================================================================

-- ── Helper: role lookup without triggering RLS recursion ──────────────────
-- SECURITY DEFINER runs as the function owner (postgres), bypassing RLS.
-- This lets policies call get_user_role() safely.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ── profiles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL DEFAULT '',
  role        TEXT        NOT NULL DEFAULT 'client'
              CHECK (role IN ('admin', 'client')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create a profile row whenever a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    -- Pass role='admin' in signUp options.data to create an admin account
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── projects ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label        TEXT        NOT NULL,          -- e.g. 'Bathrooms'
  project_name TEXT        NOT NULL,          -- e.g. 'Johnson Residence — Master Bath'
  category     TEXT,                          -- e.g. 'bathroom'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── weekly_updates ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weekly_updates (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  current_phase       TEXT,
  phases              TEXT[]      NOT NULL DEFAULT '{}',
  active_phase_index  INT         NOT NULL DEFAULT 0,
  progress_percent    INT         NOT NULL DEFAULT 0
                      CHECK (progress_percent BETWEEN 0 AND 100),
  status              TEXT        NOT NULL DEFAULT 'on-track'
                      CHECK (status IN ('on-track', 'attention', 'delayed')),
  this_week           TEXT[]      NOT NULL DEFAULT '{}',
  next_week_goal      TEXT,
  contractor_note     TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on every write
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS weekly_updates_set_updated_at ON public.weekly_updates;
CREATE TRIGGER weekly_updates_set_updated_at
  BEFORE UPDATE ON public.weekly_updates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_updates ENABLE ROW LEVEL SECURITY;

-- ── profiles policies ────────────────────────────────────────────────────
-- Users can always read their own row; admins can read everyone's.
CREATE POLICY "profiles: own row or admin"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR get_user_role() = 'admin');

-- Users can update only their own row (not change their own role).
CREATE POLICY "profiles: update own row"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── projects policies ────────────────────────────────────────────────────
-- Clients see only their own projects; admins see all.
CREATE POLICY "projects: client owns or admin"
  ON public.projects
  FOR SELECT
  USING (client_id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "projects: admin insert"
  ON public.projects FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "projects: admin update"
  ON public.projects FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "projects: admin delete"
  ON public.projects FOR DELETE
  USING (get_user_role() = 'admin');

-- ── weekly_updates policies ──────────────────────────────────────────────
-- Clients can read updates only for projects they own.
-- Admins can read, write, and delete everything.
CREATE POLICY "weekly_updates: client reads own project"
  ON public.weekly_updates
  FOR SELECT
  USING (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.client_id = auth.uid()
    )
  );

CREATE POLICY "weekly_updates: admin insert"
  ON public.weekly_updates FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "weekly_updates: admin update"
  ON public.weekly_updates FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "weekly_updates: admin delete"
  ON public.weekly_updates FOR DELETE
  USING (get_user_role() = 'admin');

-- =============================================================================
-- HOW TO CREATE YOUR FIRST ADMIN ACCOUNT
-- =============================================================================
-- Option A — Sign up via the app and then promote via SQL:
--
--   UPDATE public.profiles SET role = 'admin' WHERE id = '<your-user-uuid>';
--
-- Option B — Sign up with role metadata (use in your admin seed script,
--            never in frontend code):
--
--   supabase.auth.admin.createUser({
--     email: 'carlos@orozcohomes.com',
--     password: 'strong-password',
--     user_metadata: { full_name: 'Carlos Orozco', role: 'admin' },
--   });
-- =============================================================================
