-- Migration 034: Stop anyone from listing project photos
--
-- "project-photos: public read" allowed SELECT on storage.objects for the
-- whole project-photos bucket, so anyone (even signed out) could list every
-- photo file of every project. The bucket stays public so the stored image
-- links keep working in the app and the PIN portal (Supabase serves public
-- bucket files by URL without RLS), but listing and API reads are now
-- admin-only. New uploads use random, unguessable file names (PhotoLog.jsx).
--
-- Safe to re-run.

DROP POLICY IF EXISTS "project-photos: public read" ON storage.objects;
DROP POLICY IF EXISTS "project-photos: admin read"  ON storage.objects;

CREATE POLICY "project-photos: admin read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-photos' AND get_user_role() = 'admin');
