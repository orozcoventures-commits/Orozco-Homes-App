-- Migration 016: Fix get_pin_portal_data runtime failures
--
-- The function references columns that may not exist if earlier migrations were
-- skipped. This migration adds all of them defensively before recreating the
-- function so it succeeds regardless of which prior migrations were applied.

-- ── 1. photo_logs.image_url (added in migration 013 — may have been skipped) ──
ALTER TABLE public.photo_logs ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ── 2. messages.content (renamed from 'body' in migration 007) ───────────────
-- Three cases:
--   a. Only 'body' exists   → rename it to 'content'
--   b. Both exist           → nothing to do (007 already ran)
--   c. Only 'content' exists → nothing to do (007 ran and was cleaned up)
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

-- ── 3. messages.sender_id nullable (migration 015 may have only partially run) ─
ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;

-- ── 4. Recreate get_pin_portal_data with correct column names ────────────────
CREATE OR REPLACE FUNCTION public.get_pin_portal_data(p_project_id UUID, p_pin TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_valid BOOLEAN;
  result  JSONB;
BEGIN
  -- Verify PIN is still valid
  SELECT EXISTS(
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND project_pin = TRIM(p_pin)
  ) INTO v_valid;

  IF NOT v_valid THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'project', (
      SELECT jsonb_build_object(
        'id', p.id,
        'project_name', p.project_name,
        'label', p.label,
        'category', p.category,
        'status', p.status
      )
      FROM public.projects p
      WHERE p.id = p_project_id
    ),

    'weekly_update', (
      SELECT row_to_json(wu)
      FROM public.weekly_updates wu
      WHERE wu.project_id = p_project_id
      ORDER BY wu.updated_at DESC
      LIMIT 1
    ),

    'change_orders', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id',            cw.id,
          'title',         cw.title,
          'description',   cw.description,
          'category',      cw.category,
          'original_cost', cw.original_cost,
          'new_cost',      cw.new_cost,
          'status',        cw.status,
          'submitted_at',  cw.submitted_at
        ) ORDER BY cw.submitted_at DESC
      ), '[]'::jsonb)
      FROM public.change_works cw
      WHERE cw.project_id = p_project_id
    ),

    'photo_logs', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id',         pl.id,
          'category',   pl.category,
          'caption',    pl.caption,
          'image_url',  pl.image_url,
          'created_at', pl.created_at
        ) ORDER BY pl.created_at DESC
      ), '[]'::jsonb)
      FROM public.photo_logs pl
      WHERE pl.project_id = p_project_id
      LIMIT 20
    ),

    'messages', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id',          m.id,
          'sender_role', m.sender_role,
          'content',     m.content,
          'created_at',  m.created_at
        ) ORDER BY m.created_at ASC
      ), '[]'::jsonb)
      FROM public.messages m
      WHERE m.project_id = p_project_id
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pin_portal_data TO anon, authenticated;

-- ── 5. Ensure send_pin_message uses the correct column name too ──────────────
CREATE OR REPLACE FUNCTION public.send_pin_message(
  p_project_id UUID,
  p_pin        TEXT,
  p_content    TEXT
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  INSERT INTO public.messages (project_id, sender_id, sender_role, content)
  VALUES (p_project_id, NULL, 'client', TRIM(p_content));

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_pin_message TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
