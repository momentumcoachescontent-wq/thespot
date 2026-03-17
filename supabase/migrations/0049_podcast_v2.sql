-- MIGRACIÓN 0049: PODCAST V2 — FASE 1
-- Objetivos:
--   1. Reemplazar is_premium por access_tier ('free' | 'premium')
--   2. Agregar status ('draft' | 'published' | 'archived')
--   3. Hacer expires_at nullable (expiración opcional, no por defecto)
--   4. Agregar play_count si no existe
--   5. Crear tabla podcast_playback_progress
--   6. Función increment_podcast_play_count (solo si >= 15s escuchados)
--   7. Corregir RLS SELECT para manejar expires_at nullable

-- ─────────────────────────────────────────
-- 1. Nuevas columnas en podcasts
-- ─────────────────────────────────────────
ALTER TABLE public.podcasts
  ADD COLUMN IF NOT EXISTS access_tier TEXT DEFAULT 'free'
    CHECK (access_tier IN ('free', 'premium'));

ALTER TABLE public.podcasts
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'archived'));

ALTER TABLE public.podcasts
  ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0;

-- ─────────────────────────────────────────
-- 2. expires_at pasa a ser nullable
-- ─────────────────────────────────────────
ALTER TABLE public.podcasts
  ALTER COLUMN expires_at DROP NOT NULL;

-- ─────────────────────────────────────────
-- 3. Migrar datos existentes
-- ─────────────────────────────────────────
UPDATE public.podcasts
SET
  access_tier = CASE WHEN is_premium = true THEN 'premium' ELSE 'free' END,
  status      = 'published'
WHERE status IS NULL OR status = 'published';

-- ─────────────────────────────────────────
-- 4. Tabla podcast_playback_progress
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.podcast_playback_progress (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  podcast_id       UUID NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE,
  progress_seconds INTEGER NOT NULL DEFAULT 0,
  completed        BOOLEAN NOT NULL DEFAULT false,
  last_played_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, podcast_id)
);

ALTER TABLE public.podcast_playback_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own podcast progress"
  ON public.podcast_playback_progress
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ─────────────────────────────────────────
-- 5. Función increment_podcast_play_count
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_podcast_play_count(
  p_podcast_id     UUID,
  p_listened_secs  INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Solo incrementa si el usuario escuchó al menos 15 segundos
  IF p_listened_secs >= 15 THEN
    UPDATE public.podcasts
    SET play_count = COALESCE(play_count, 0) + 1
    WHERE id = p_podcast_id;
  END IF;
END;
$$;

-- ─────────────────────────────────────────
-- 6. Corregir política SELECT de podcasts
-- ─────────────────────────────────────────
-- Maneja: expires_at nullable + status + admin bypass
DROP POLICY IF EXISTS "Select podcasts" ON public.podcasts;
DROP POLICY IF EXISTS "Podcasts visibles si no han expirado" ON public.podcasts;

CREATE POLICY "Select podcasts" ON public.podcasts
  FOR SELECT USING (
    (
      status = 'published'
      AND (expires_at IS NULL OR expires_at > NOW())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- Forzar recarga de schema cache
NOTIFY pgrst, 'reload schema';
