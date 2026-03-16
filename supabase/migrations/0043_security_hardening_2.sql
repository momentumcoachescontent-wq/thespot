-- ============================================================
-- Migration 0043: Security Hardening Round 2
-- Fixes:
--   - site_settings: re-enable RLS (linter showed it disabled)
--   - incidents: add RLS policies (table had RLS on but zero policies)
--   - institution_reports INSERT: tighten from WITH CHECK (true) to require auth
--   - 8 DB functions: lock search_path to prevent schema injection
--   - 25+ RLS policies: replace auth.uid() with (select auth.uid())
--     to fix auth_rls_initplan performance (per-row vs per-query evaluation)
-- ============================================================

-- ============================================================
-- PART 1: site_settings — re-ensure RLS + recreate policies
-- ============================================================
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins gestionan settings" ON public.site_settings;
DROP POLICY IF EXISTS "Lectura pública de settings" ON public.site_settings;

CREATE POLICY "Admins gestionan settings" ON public.site_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Lectura pública de settings" ON public.site_settings
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- PART 2: incidents — add RLS policies (was: RLS on, no policies)
-- ============================================================
DO $$
BEGIN
  -- Users see their own incidents; admins see all
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'incidents'
    AND policyname = 'Users see own incidents'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users see own incidents" ON public.incidents
        FOR SELECT
        USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
          )
        )
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'incidents'
    AND policyname = 'Users manage own incidents'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users manage own incidents" ON public.incidents
        FOR ALL
        USING (user_id = (SELECT auth.uid()))
        WITH CHECK (user_id = (SELECT auth.uid()))
    $pol$;
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL; -- incidents table doesn't exist in this environment, skip
END $$;

-- ============================================================
-- PART 3: institution_reports INSERT — require authenticated caller
-- ============================================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Cualquiera puede insertar reportes" ON public.institution_reports;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Usuarios autenticados pueden insertar reportes" ON public.institution_reports
    FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- PART 4: Lock search_path on all functions flagged by linter
-- Prevents schema injection via mutable search_path
-- ============================================================
DO $$ BEGIN ALTER FUNCTION public.handle_new_user() SET search_path = 'public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.set_updated_at() SET search_path = 'public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.update_conversation_timestamp() SET search_path = 'public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.get_or_create_conversation(UUID) SET search_path = 'public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.enforce_admin_premium() SET search_path = 'public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.validate_edu_email() SET search_path = 'public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.log_drop_persistence() SET search_path = 'public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.set_updated_at_metadata() SET search_path = 'public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- ============================================================
-- PART 5: auth_rls_initplan — replace auth.uid() with (select auth.uid())
-- in all RLS policies so auth is evaluated ONCE per query, not per row
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    -- role and is_premium intentionally excluded; only service_role can set these
  );

-- ── drops ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Insertar mis Drops" ON public.drops;
CREATE POLICY "Insertar mis Drops" ON public.drops
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = author_id);

DROP POLICY IF EXISTS "Admins pueden actualizar drops" ON public.drops;
CREATE POLICY "Admins pueden actualizar drops" ON public.drops
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins pueden eliminar drops" ON public.drops;
CREATE POLICY "Admins pueden eliminar drops" ON public.drops
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- ── spots ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear spots" ON public.spots;
CREATE POLICY "Usuarios autenticados pueden crear spots" ON public.spots
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = creator_id);

DROP POLICY IF EXISTS "Creadores pueden actualizar sus spots" ON public.spots;
CREATE POLICY "Creadores pueden actualizar sus spots" ON public.spots
  FOR UPDATE USING ((SELECT auth.uid()) = creator_id);

-- ── reactions ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Gestionar mis propias reacciones" ON public.reactions;
CREATE POLICY "Gestionar mis propias reacciones" ON public.reactions
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Insertar mis propias reacciones" ON public.reactions;
DO $$
BEGIN
  CREATE POLICY "Insertar mis propias reacciones" ON public.reactions
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── spot_members ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Ver miembros de spots de mi universidad" ON public.spot_members;
CREATE POLICY "Ver miembros de spots de mi universidad" ON public.spot_members
  FOR SELECT USING (
    spot_id IN (
      SELECT id FROM public.spots
      WHERE university_domain = (
        SELECT university_domain FROM public.profiles
        WHERE id = (SELECT auth.uid())
      )
    )
  );

-- ── mood_checkins ────────────────────────────────────────────
DROP POLICY IF EXISTS "Gestionar MIS checkins" ON public.mood_checkins;
DROP POLICY IF EXISTS "Gestionar mis checkins" ON public.mood_checkins;
CREATE POLICY "Gestionar mis checkins" ON public.mood_checkins
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ── contacts ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Mis contactos son privados" ON public.contacts;
DO $$
BEGIN
  CREATE POLICY "Mis contactos son privados" ON public.contacts
    FOR ALL USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── sos_contacts ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage their own SOS contacts" ON public.sos_contacts;
DO $$
BEGIN
  CREATE POLICY "Users can manage their own SOS contacts" ON public.sos_contacts
    FOR ALL
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── sos_incidents ────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can create and see their own incidents" ON public.sos_incidents;
DO $$
BEGIN
  CREATE POLICY "Users can create and see their own incidents" ON public.sos_incidents
    FOR ALL
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── emergency_contacts ───────────────────────────────────────
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'emergency_contacts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.emergency_contacts', pol.policyname);
  END LOOP;

  CREATE POLICY "Users manage own emergency contacts" ON public.emergency_contacts
    FOR ALL
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── institution_reports (SELECT policy) ──────────────────────
DROP POLICY IF EXISTS "Solo admin puede leer reportes" ON public.institution_reports;
DO $$
BEGIN
  CREATE POLICY "Solo admin puede leer reportes" ON public.institution_reports
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
      )
    );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── voice_reactions ──────────────────────────────────────────
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear voice reactions" ON public.voice_reactions;
DROP POLICY IF EXISTS "Autores pueden borrar sus voice reactions" ON public.voice_reactions;
DO $$
BEGIN
  CREATE POLICY "Usuarios autenticados pueden crear voice reactions" ON public.voice_reactions
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = author_id);
  CREATE POLICY "Autores pueden borrar sus voice reactions" ON public.voice_reactions
    FOR DELETE USING ((SELECT auth.uid()) = author_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── event_attendees ──────────────────────────────────────────
DROP POLICY IF EXISTS "Usuarios pueden confirmar asistencia" ON public.event_attendees;
DROP POLICY IF EXISTS "Usuarios pueden cancelar asistencia" ON public.event_attendees;
DO $$
BEGIN
  CREATE POLICY "Usuarios pueden confirmar asistencia" ON public.event_attendees
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
  CREATE POLICY "Usuarios pueden cancelar asistencia" ON public.event_attendees
    FOR DELETE USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── podcasts ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Select podcasts" ON public.podcasts;
DROP POLICY IF EXISTS "Admins gestionan todo en podcasts" ON public.podcasts;
DROP POLICY IF EXISTS "Premium users can create podcasts" ON public.podcasts;

CREATE POLICY "Select podcasts" ON public.podcasts
  FOR SELECT USING (
    expires_at > NOW()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admins gestionan todo en podcasts" ON public.podcasts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Premium users can create podcasts" ON public.podcasts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND (is_premium = true OR role = 'admin')
    )
  );

-- ── audit_log (from 0042 — fix initplan) ────────────────────
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admin only access" ON public.audit_log;
  CREATE POLICY "Admin only access" ON public.audit_log
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
      )
    );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── moderation_logs ──────────────────────────────────────────
DO $$
BEGIN
  DROP POLICY IF EXISTS "Solo admins ven logs de moderación" ON public.moderation_logs;
  CREATE POLICY "Solo admins ven logs de moderación" ON public.moderation_logs
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
      )
    );
EXCEPTION WHEN undefined_table OR duplicate_object THEN NULL;
END $$;

-- ── events ───────────────────────────────────────────────────
DO $$
BEGIN
  DROP POLICY IF EXISTS "Usuarios pueden crear eventos" ON public.events;
  DROP POLICY IF EXISTS "Usuarios pueden editar sus eventos" ON public.events;
  DROP POLICY IF EXISTS "Usuarios pueden eliminar sus eventos" ON public.events;
  CREATE POLICY "Usuarios pueden crear eventos" ON public.events
    FOR INSERT WITH CHECK (
      (SELECT auth.uid()) = creator_id
      AND (spot_id IS NULL OR EXISTS (SELECT 1 FROM public.spots WHERE id = spot_id))
    );
  CREATE POLICY "Usuarios pueden editar sus eventos" ON public.events
    FOR UPDATE USING ((SELECT auth.uid()) = creator_id);
  CREATE POLICY "Usuarios pueden eliminar sus eventos" ON public.events
    FOR DELETE USING ((SELECT auth.uid()) = creator_id);
EXCEPTION WHEN undefined_table OR duplicate_object THEN NULL;
END $$;

-- ── push_subscriptions ───────────────────────────────────────
DROP POLICY IF EXISTS "users_own_push_subs" ON public.push_subscriptions;
DO $$
BEGIN
  CREATE POLICY "users_own_push_subs" ON public.push_subscriptions
    FOR ALL
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── conversations ────────────────────────────────────────────
DROP POLICY IF EXISTS "participants_see_conversation" ON public.conversations;
DROP POLICY IF EXISTS "participants_create_conversation" ON public.conversations;
DO $$
BEGIN
  CREATE POLICY "participants_see_conversation" ON public.conversations
    FOR SELECT USING (
      (SELECT auth.uid()) = participant_a OR (SELECT auth.uid()) = participant_b
    );
  CREATE POLICY "participants_create_conversation" ON public.conversations
    FOR INSERT WITH CHECK (
      (SELECT auth.uid()) = participant_a OR (SELECT auth.uid()) = participant_b
    );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── messages ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "participants_see_messages" ON public.messages;
DROP POLICY IF EXISTS "sender_inserts_message" ON public.messages;
DROP POLICY IF EXISTS "sender_updates_read" ON public.messages;
DO $$
BEGIN
  CREATE POLICY "participants_see_messages" ON public.messages
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id
          AND (c.participant_a = (SELECT auth.uid()) OR c.participant_b = (SELECT auth.uid()))
      )
    );
  CREATE POLICY "sender_inserts_message" ON public.messages
    FOR INSERT WITH CHECK (
      (SELECT auth.uid()) = sender_id
      AND EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id
          AND (c.participant_a = (SELECT auth.uid()) OR c.participant_b = (SELECT auth.uid()))
      )
    );
  CREATE POLICY "sender_updates_read" ON public.messages
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id
          AND (c.participant_a = (SELECT auth.uid()) OR c.participant_b = (SELECT auth.uid()))
      )
    );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
