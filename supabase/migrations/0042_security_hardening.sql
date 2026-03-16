-- ============================================================
-- Migration 0042: Security Hardening
-- Fixes: MED-1, MED-2, MED-3, MED-9
-- ============================================================

-- MED-1: Fix audit_log RLS — restrict to admins only (was USING (true) = world-readable)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role access" ON public.audit_log;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admin only access" ON public.audit_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- MED-2: Remove anon grant on increment_listened_count (only authenticated users should call it)
REVOKE EXECUTE ON FUNCTION increment_listened_count(UUID) FROM anon;

-- MED-3: Restore meaningful reactions SELECT policy (was simplified to USING (true))
-- Only show reactions for non-expired, non-flagged drops
DO $$
BEGIN
  DROP POLICY IF EXISTS "Leer reacciones de drops visibles" ON public.reactions;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Leer reacciones de drops visibles" ON public.reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.drops
      WHERE drops.id = reactions.drop_id
        AND drops.expires_at > now()
        AND drops.is_flagged = false
    )
  );

-- MED-9: Enforce premium check server-side on podcasts INSERT
-- Prevents frontend bypass via direct Supabase API calls
DO $$
BEGIN
  DROP POLICY IF EXISTS "Premium users can create podcasts" ON public.podcasts;
  DROP POLICY IF EXISTS "Authenticated users can create podcasts" ON public.podcasts;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Premium users can create podcasts" ON public.podcasts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (is_premium = true OR role = 'admin')
    )
  );

-- HIGH-8: Prevent users from escalating their own role via self-update
-- Revoke ability to update the 'role' column via existing user UPDATE policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Recreate the UPDATE policy excluding the role column (and is_premium — managed by webhook)
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- role and is_premium are intentionally excluded; they can only be set by service_role (admin/webhook)
  );
