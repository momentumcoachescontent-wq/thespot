-- Migration 0053: Schedule nightly storage cleanup via pg_cron + pg_net
--
-- BEFORE APPLYING: replace the two placeholders below with your actual values.
--
--   YOUR_PROJECT_REF   → found in Supabase Dashboard → Settings → General
--                        e.g. "inchlsvnvdotbxqnsxmd"
--
--   YOUR_SERVICE_ROLE_KEY → Supabase Dashboard → Settings → API → service_role (secret)
--                        e.g. "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
--
-- The job runs every day at 04:00 UTC, a quiet window with minimal traffic.
-- pg_net is enabled by default on all Supabase projects.

SELECT cron.schedule(
  'cleanup-expired-storage',          -- job name (unique)
  '0 4 * * *',                        -- daily at 04:00 UTC
  $$
  SELECT net.http_post(
    url     => 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-storage',
    headers => jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type',  'application/json'
    ),
    body    => '{}'::jsonb
  );
  $$
);
