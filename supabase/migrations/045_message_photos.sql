-- Migration 045: Photos in Messages (step 1 — Orozco Homes sends photos)
--
-- 1. messages.attachment_path: optional photo for a message. The path must
--    sit in the message's own project folder ("<project_id>/<file>").
-- 2. Public "message-photos" bucket. Files have random names and are opened
--    by direct link (like project-photos); only admins can list or upload.
-- 3. get_pin_message_photos: PIN-portal clients get the photo of each
--    message in their project (same PIN guard as the other portal calls).
--
-- Safe to re-run.

-- ── Part A: messages column + PIN function ─────────────────────────────────
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_path TEXT;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_attachment_path_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_attachment_path_check
  CHECK (
    attachment_path IS NULL
    OR (left(attachment_path, 37) = project_id::text || '/'
        AND length(attachment_path) > 37
        AND position('..' IN attachment_path) = 0)
  );

CREATE OR REPLACE FUNCTION public.get_pin_message_photos(p_project_id UUID, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_key TEXT := 'project:' || coalesce(p_project_id::text, '');
BEGIN
  PERFORM pin_assert_not_locked(v_key);
  IF NOT pin_is_valid(p_project_id, p_pin) THEN
    PERFORM pin_record_failure(v_key);
    RETURN NULL;
  END IF;
  RETURN coalesce(
    (SELECT jsonb_object_agg(m.id::text, m.attachment_path)
       FROM messages m
      WHERE m.project_id = p_project_id
        AND m.attachment_path IS NOT NULL),
    '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_pin_message_photos(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pin_message_photos(UUID, TEXT) TO anon, authenticated;

-- ── Part B: storage bucket + policies ──────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-photos',
  'message-photos',
  true,
  10485760,   -- 10 MB per photo
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif'];

DROP POLICY IF EXISTS "message-photos: admin read"   ON storage.objects;
DROP POLICY IF EXISTS "message-photos: admin upload" ON storage.objects;
DROP POLICY IF EXISTS "message-photos: admin delete" ON storage.objects;

-- Photos open by their public link; listing the bucket is admin only.
CREATE POLICY "message-photos: admin read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'message-photos' AND get_user_role() = 'admin');

CREATE POLICY "message-photos: admin upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'message-photos' AND get_user_role() = 'admin');

CREATE POLICY "message-photos: admin delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'message-photos' AND get_user_role() = 'admin');

NOTIFY pgrst, 'reload schema';
