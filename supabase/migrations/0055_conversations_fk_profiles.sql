-- Migration 0055: Ensure conversations→profiles FK constraints exist
--
-- PostgREST resolves embedded resource joins (profile_a:profiles!fkey_name)
-- by looking for named foreign key constraints. If those constraints are
-- absent or point to auth.users instead of public.profiles, the query fails
-- with PGRST200 "Could not find a relationship between 'conversations' and 'profiles'".
--
-- This migration adds the two FK constraints (idempotent) and forces a
-- schema cache reload so PostgREST picks them up immediately.

DO $$
BEGIN
  -- participant_a → profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_participant_a_fkey'
  ) THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT conversations_participant_a_fkey
        FOREIGN KEY (participant_a) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- participant_b → profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_participant_b_fkey'
  ) THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT conversations_participant_b_fkey
        FOREIGN KEY (participant_b) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
