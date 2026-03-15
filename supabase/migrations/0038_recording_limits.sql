-- Migration 0038: Recording limits (seconds) + fix duration constraint
-- Separates recording limit (seconds) from drop expiry (minutes).

-- ─── 1. Fix drops_duration_seconds_check constraint ──────────────────────────
-- Drop the old constraint (was blocking values > 60) and allow up to 3600s
ALTER TABLE public.drops
  DROP CONSTRAINT IF EXISTS drops_duration_seconds_check;

ALTER TABLE public.drops
  ADD CONSTRAINT drops_duration_seconds_check
  CHECK (duration_seconds >= 0 AND duration_seconds <= 3600);

-- ─── 2. Recording limit settings (in seconds) ─────────────────────────────────
INSERT INTO public.site_settings (key, value)
VALUES
  ('recording_limit_freemium', '30'::jsonb),
  ('recording_limit_premium',  '60'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
