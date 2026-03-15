-- Enable pg_cron extension (requires Supabase Pro or manual enablement via Dashboard → Extensions)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule nightly deletion of all DM messages at 00:00 UTC
-- Messages are ephemeral: any message sent today disappears at midnight
SELECT cron.schedule(
  'delete-dm-messages-at-midnight',
  '0 0 * * *',
  $cron$
    DELETE FROM public.messages
    WHERE created_at < date_trunc('day', now());
  $cron$
);
