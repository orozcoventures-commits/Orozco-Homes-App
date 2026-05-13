-- Migration 016: Bulletproof PIN portal data function
--
-- Root cause of "Could not load project data":
--   PostgreSQL validates plpgsql function bodies at CREATE time (check_function_bodies=on).
--   If ANY column referenced in get_pin_portal_data does not exist at paste time,
--   the CREATE silently fails — verify_project_pin still works (touches only
--   projects+clients), but get_pin_portal_data never lands in the database.
--
-- Fix strategy:
--   1. Add every potentially-missing column (IF NOT EXISTS) first.
--   2. Rewrite get_pin_portal_data using EXECUTE (dynamic SQL) for risky
--      subqueries so the function body passes validation regardless of schema state.
--   3. Add EXCEPTION handlers so one bad section never kills the whole call.


-- ── 1. photo_logs: image_url (migration 013 may have been skipped) ────────────
ALTER TABLE public.photo_logs
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ── 2. change_works: optional columns (migrations 010/011/014 may be missing) ─
ALTER TABLE public.change_works
  ADD COLUMN IF NOT EXISTS category     TEXT;

ALTER TABLE public.change_works
  ADD COLUMN IF NOT EXISTS original_cost NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.change_works
  ADD COLUMN IF NOT EXISTS new_cost NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.change_works
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.change_works
  ADD COLUMN IF NOT EXISTS approved_at  TIMESTAMPTZ;

ALTER TABLE public.change_works
  ADD COLUMN IF NOT EXISTS approved_by  TEXT;

ALTER TABLE public.change_works
  ADD COLUMN IF NOT EXISTS declined_at  TIMESTAMPTZ;

-- ── 3. messages: rename body→content if migration 007 was skipped ────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'body'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'content'
  ) THEN
    ALTER TABLE public.messages RENAME COLUMN body TO content;
  END IF;
END;
$$;

-- Ensure content column exists with a default if somehow neither body nor content exist
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '';

-- ── 4. messages: allow NULL sender_id for PIN-mode messages ──────────────────
ALTER TABLE public.messages
  ALTER COLUMN sender_id DROP NOT NULL;

-- ── 5. get_pin_portal_data — rebuilt with dynamic SQL for all risky columns ──
--
-- Using EXECUTE for change_works / photo_logs / messages subqueries means
-- PostgreSQL does NOT validate those column references at CREATE time.
-- Each section has its own EXCEPTION handler so a single missing column
-- returns empty array rather than crashing the whole call.

CREATE OR REPLACE FUNCTION public.get_pin_portal_data(
  p_project_id UUID,
  p_pin        TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid   BOOLEAN;
  v_project JSONB;
  v_weekly  JSONB;
  v_orders  JSONB := '[]'::jsonb;
  v_photos  JSONB := '[]'::jsonb;
  v_msgs    JSONB := '[]'::jsonb;
BEGIN
  -- PIN verification (safe — only touches 'projects' which always exists)
  SELECT EXISTS(
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND project_pin = TRIM(p_pin)
  ) INTO v_valid;

  IF NOT v_valid THEN
    RETURN NULL;
  END IF;

  -- Project info (safe columns only — guaranteed from migration 001)
  SELECT jsonb_build_object(
    'id',           p.id,
    'project_name', p.project_name,
    'label',        p.label,
    'category',     p.category,
    'status',       p.status
  )
  INTO v_project
  FROM public.projects p
  WHERE p.id = p_project_id;

  -- Weekly update (safe — guaranteed from migration 001)
  SELECT to_jsonb(wu)
  INTO v_weekly
  FROM public.weekly_updates wu
  WHERE wu.project_id = p_project_id
  ORDER BY wu.updated_at DESC
  LIMIT 1;

  -- Change orders: dynamic SQL so missing columns (category, original_cost, etc.)
  -- don't cause a compile-time failure of this whole function.
  BEGIN
    EXECUTE $q$
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id',            id,
            'title',         title,
            'description',   description,
            'category',      category,
            'original_cost', original_cost,
            'new_cost',      new_cost,
            'status',        status,
            'submitted_at',  submitted_at
          ) ORDER BY submitted_at DESC
        ),
        '[]'::jsonb
      )
      FROM public.change_works
      WHERE project_id = $1
    $q$
    INTO v_orders
    USING p_project_id;
  EXCEPTION WHEN others THEN
    -- Fallback: base columns only (title + status always present)
    BEGIN
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id',          cw.id,
            'title',       cw.title,
            'description', cw.description,
            'status',      cw.status,
            'original_cost', 0,
            'new_cost',    0
          )
        ),
        '[]'::jsonb
      )
      INTO v_orders
      FROM public.change_works cw
      WHERE cw.project_id = p_project_id;
    EXCEPTION WHEN others THEN
      v_orders := '[]'::jsonb;
    END;
  END;

  -- Photo logs: dynamic SQL so image_url absence doesn't break function creation
  BEGIN
    EXECUTE $q$
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id',         id,
            'category',   category,
            'caption',    caption,
            'image_url',  image_url,
            'created_at', created_at
          ) ORDER BY created_at DESC
        ),
        '[]'::jsonb
      )
      FROM public.photo_logs
      WHERE project_id = $1
      LIMIT 20
    $q$
    INTO v_photos
    USING p_project_id;
  EXCEPTION WHEN others THEN
    -- image_url column missing — return photos without images
    BEGIN
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id',         pl.id,
            'category',   pl.category,
            'caption',    pl.caption,
            'image_url',  NULL,
            'created_at', pl.created_at
          ) ORDER BY pl.created_at DESC
        ),
        '[]'::jsonb
      )
      INTO v_photos
      FROM public.photo_logs pl
      WHERE pl.project_id = p_project_id
      LIMIT 20;
    EXCEPTION WHEN others THEN
      v_photos := '[]'::jsonb;
    END;
  END;

  -- Messages: dynamic SQL handles 'content' vs 'body' column name
  BEGIN
    EXECUTE $q$
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id',          id,
            'sender_role', sender_role,
            'content',     content,
            'created_at',  created_at
          ) ORDER BY created_at ASC
        ),
        '[]'::jsonb
      )
      FROM public.messages
      WHERE project_id = $1
    $q$
    INTO v_msgs
    USING p_project_id;
  EXCEPTION WHEN others THEN
    -- 'content' column might still be named 'body'
    BEGIN
      EXECUTE $q$
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id',          id,
              'sender_role', sender_role,
              'content',     body,
              'created_at',  created_at
            ) ORDER BY created_at ASC
          ),
          '[]'::jsonb
        )
        FROM public.messages
        WHERE project_id = $1
      $q$
      INTO v_msgs
      USING p_project_id;
    EXCEPTION WHEN others THEN
      v_msgs := '[]'::jsonb;
    END;
  END;

  RETURN jsonb_build_object(
    'project',      v_project,
    'weekly_update', v_weekly,
    'change_orders', v_orders,
    'photo_logs',   v_photos,
    'messages',     v_msgs
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pin_portal_data TO anon, authenticated;


-- ── 6. send_pin_message — dynamic INSERT handles body vs content ──────────────
CREATE OR REPLACE FUNCTION public.send_pin_message(
  p_project_id UUID,
  p_pin        TEXT,
  p_content    TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND project_pin = TRIM(p_pin)
  ) INTO v_valid;

  IF NOT v_valid OR TRIM(p_content) = '' THEN
    RETURN FALSE;
  END IF;

  -- Try 'content' column first; fall back to 'body' if renamed column missing
  BEGIN
    EXECUTE $q$
      INSERT INTO public.messages (project_id, sender_id, sender_role, content)
      VALUES ($1, NULL, 'client', $2)
    $q$ USING p_project_id, TRIM(p_content);
  EXCEPTION WHEN others THEN
    BEGIN
      EXECUTE $q$
        INSERT INTO public.messages (project_id, sender_role, body)
        VALUES ($1, 'client', $2)
      $q$ USING p_project_id, TRIM(p_content);
    EXCEPTION WHEN others THEN
      RETURN FALSE;
    END;
  END;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_pin_message TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
