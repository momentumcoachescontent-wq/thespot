-- Migration 0052: Fix broken RLS policies + suppress PostGIS warning
--
-- 1. Reactions SELECT policy — references is_flagged which was dropped in 0051.
--    Any query on reactions would fail at runtime with "column does not exist".
--
-- 2. spatial_ref_sys — PostGIS extension table in public schema cannot have
--    meaningful RLS; adding a permissive SELECT policy suppresses the Supabase
--    Security Advisor warning without blocking access.

-- ─── 1. Fix reactions RLS (remove is_flagged reference) ──────────────────────

DROP POLICY IF EXISTS "Leer reacciones de drops visibles" ON public.reactions;

CREATE POLICY "Leer reacciones de drops visibles" ON public.reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.drops
      WHERE drops.id = reactions.drop_id
        AND drops.expires_at > now()
    )
  );

-- ─── 2. PostGIS spatial_ref_sys — enable RLS + permissive read ───────────────
-- This table is owned by the PostGIS extension (read-only reference data).
-- Enabling RLS with USING (true) keeps it fully readable while silencing the
-- "RLS disabled" warning in the Supabase Security Advisor dashboard.

DO $$
BEGIN
  ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not enable RLS on spatial_ref_sys: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE POLICY "public_read_spatial_ref_sys"
    ON public.spatial_ref_sys
    FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN
  NULL; -- policy already exists, nothing to do
END $$;
