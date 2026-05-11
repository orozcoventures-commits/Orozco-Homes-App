-- Migration 013: photo uploads
-- 1. Create project-photos storage bucket (public)
-- 2. Add RLS policies on storage.objects
-- 3. Add image_url column to photo_logs
-- 4. Fix photo_logs SELECT policy (was using inline auth.users subquery)

-- ── Storage bucket ────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-photos',
  'project-photos',
  true,
  10485760,   -- 10 MB per file
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public            = true,
  file_size_limit   = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif'];

-- ── Storage RLS policies ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "project-photos: public read"   ON storage.objects;
DROP POLICY IF EXISTS "project-photos: admin upload"  ON storage.objects;
DROP POLICY IF EXISTS "project-photos: admin update"  ON storage.objects;
DROP POLICY IF EXISTS "project-photos: admin delete"  ON storage.objects;

-- Anyone (including unauthenticated) can read photos (bucket is public)
CREATE POLICY "project-photos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-photos');

-- Only admins can upload
CREATE POLICY "project-photos: admin upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-photos'
    AND get_user_role() = 'admin'
  );

-- Only admins can replace (upsert)
CREATE POLICY "project-photos: admin update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-photos'
    AND get_user_role() = 'admin'
  );

-- Only admins can delete
CREATE POLICY "project-photos: admin delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-photos'
    AND get_user_role() = 'admin'
  );

-- ── photo_logs: add image_url column ─────────────────────────────────────
ALTER TABLE public.photo_logs
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ── Fix photo_logs SELECT policy (inline auth.users → SECURITY DEFINER fn) ──
DROP POLICY IF EXISTS "photo_logs: select own project or admin" ON public.photo_logs;

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
            WHERE c.email = get_current_user_email()
          )
        )
    )
  );

NOTIFY pgrst, 'reload schema';
