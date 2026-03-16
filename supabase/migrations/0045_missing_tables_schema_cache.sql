-- ============================================================
-- Migration 0045: Create missing tables + reload PostgREST schema cache
-- Fixes:
--   - interactions table missing (AdminPage analytics)
--   - moderation_logs table missing in production
--   - flag_count column on profiles (re-ensure)
--   - PostgREST schema cache stale (PGRST200 on conversations FK)
-- ============================================================

-- ── flag_count on profiles (idempotent) ─────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS flag_count INTEGER DEFAULT 0;

-- ── moderation_logs (re-create if missing) ───────────────────
CREATE TABLE IF NOT EXISTS public.moderation_logs (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drop_id    UUID REFERENCES public.drops(id) ON DELETE SET NULL,
    user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    action     TEXT NOT NULL,  -- 'AUTO_APPROVED', 'AUTO_BLOCKED', 'ADMIN_DELETED'
    reason     TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Solo admins ven logs de moderación" ON public.moderation_logs
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── interactions (user engagement analytics) ─────────────────
-- Tracks when a user listens to / reacts to a drop.
-- AdminPage uses this for "interactions per day of week" chart.
CREATE TABLE IF NOT EXISTS public.interactions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drop_id          UUID REFERENCES public.drops(id) ON DELETE CASCADE,
    user_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL DEFAULT 'listen',  -- 'listen', 'reaction', 'share'
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert their own interaction
DO $$
BEGIN
  CREATE POLICY "Users insert own interactions" ON public.interactions
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admins can read all interactions (for analytics)
DO $$
BEGIN
  CREATE POLICY "Admins read interactions" ON public.interactions
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Reload PostgREST schema cache ────────────────────────────
-- Fixes PGRST200: "Could not find a relationship between conversations and profiles"
-- This tells PostgREST to re-read FK constraints and table definitions from pg_catalog
NOTIFY pgrst, 'reload schema';
