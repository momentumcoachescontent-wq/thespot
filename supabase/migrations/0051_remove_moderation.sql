-- Migration: Remove all moderation infrastructure
-- This removes the AI moderation system that is not being shipped.

-- 1. Drop moderation_logs table
DROP TABLE IF EXISTS public.moderation_logs CASCADE;

-- 2. Remove is_flagged and moderation_notes columns from drops
ALTER TABLE public.drops
  DROP COLUMN IF EXISTS is_flagged,
  DROP COLUMN IF EXISTS moderation_notes;

-- 3. Remove flag_count column from profiles
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS flag_count;

-- 4. Remove moderation-related site_settings keys
DELETE FROM public.site_settings
WHERE key IN (
  'ai_moderation_enabled',
  'auto_moderation_mode',
  'moderation_rules',
  'ai_model_provider'
);
