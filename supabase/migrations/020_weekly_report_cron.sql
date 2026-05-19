-- Migration 020: Weekly report cron job
-- Requires pg_cron and pg_net extensions (enable both in Supabase Dashboard → Database → Extensions)
--
-- BEFORE RUNNING:
--   1. Enable pg_cron and pg_net in Supabase Dashboard → Database → Extensions
--   2. Deploy the Edge Function: supabase functions deploy weekly-report
--   3. Set Edge Function secrets in Supabase Dashboard → Edge Functions → weekly-report → Secrets:
--        RESEND_API_KEY   = re_xxxxxxxxxxxxxxxx   (from resend.com)
--        CRON_SECRET      = <any strong random string you choose>
--        FROM_EMAIL       = reports@yourdomain.com (must be verified in Resend)
--        PORTAL_URL       = https://your-netlify-url.netlify.app
--   4. Replace YOUR_PROJECT_REF and YOUR_CRON_SECRET below with your actual values
--      Project ref is in Settings → General → Reference ID in Supabase dashboard

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing job if re-running this migration
SELECT cron.unschedule('orozco-weekly-report') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'orozco-weekly-report'
);

-- Schedule every Friday at 9:00 AM UTC (adjust timezone offset as needed)
-- Cron format: minute hour day-of-month month day-of-week
-- 0 9 * * 5  = 9:00 AM UTC every Friday (5 = Friday)
SELECT cron.schedule(
  'orozco-weekly-report',
  '0 9 * * 5',
  $$
  SELECT net.http_post(
    url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/weekly-report',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer YOUR_CRON_SECRET'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Confirm the job was created
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'orozco-weekly-report';
