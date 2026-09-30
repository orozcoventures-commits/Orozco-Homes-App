-- Migration 030: Certificate of Insurance (COI) tracking for subcontractors
-- 1. COI expiration date + stored file path on subcontractor_directory
-- 2. Private "subcontractor-coi" storage bucket (COIs carry policy details,
--    so unlike project-photos this bucket is NOT public; the app opens files
--    through short-lived signed URLs)
-- 3. Admin-only RLS policies on storage.objects for that bucket

-- ── Columns ───────────────────────────────────────────────────────────────
ALTER TABLE public.subcontractor_directory
  ADD COLUMN IF NOT EXISTS coi_expires_on DATE,
  ADD COLUMN IF NOT EXISTS coi_file_path  TEXT;   -- object path inside the subcontractor-coi bucket

-- ── Storage bucket (private) ──────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'subcontractor-coi',
  'subcontractor-coi',
  false,
  10485760,   -- 10 MB per file
  ARRAY['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = false,
  file_size_limit    = 10485760,
  allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif'];

-- ── Storage RLS policies: admins only ─────────────────────────────────────
DROP POLICY IF EXISTS "subcontractor-coi: admin read"   ON storage.objects;
DROP POLICY IF EXISTS "subcontractor-coi: admin upload" ON storage.objects;
DROP POLICY IF EXISTS "subcontractor-coi: admin update" ON storage.objects;
DROP POLICY IF EXISTS "subcontractor-coi: admin delete" ON storage.objects;

CREATE POLICY "subcontractor-coi: admin read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'subcontractor-coi' AND get_user_role() = 'admin');

CREATE POLICY "subcontractor-coi: admin upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'subcontractor-coi' AND get_user_role() = 'admin');

CREATE POLICY "subcontractor-coi: admin update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'subcontractor-coi' AND get_user_role() = 'admin');

CREATE POLICY "subcontractor-coi: admin delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'subcontractor-coi' AND get_user_role() = 'admin');

NOTIFY pgrst, 'reload schema';
