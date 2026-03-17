-- MIGRACIÓN 0050: PODCAST SHOWS + EPISODES (FASE 2)
-- Requiere: migración 0049 aplicada (access_tier, status, play_count en podcasts)
--
-- Nuevas tablas:
--   podcast_shows    — series/programas
--   podcast_episodes — episodios de cada show
--   podcast_listens  — trazabilidad de reproducciones
-- Migración de datos: podcasts existentes → shows + episodes
-- RLS: SELECT abierto a autenticados; INSERT/UPDATE/DELETE sólo al creador o admin

-- ─────────────────────────────────────────
-- 1. podcast_shows
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.podcast_shows (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT NOT NULL,
  description      TEXT,
  cover_emoji      TEXT NOT NULL DEFAULT '🎙️',
  creator_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  spot_id          UUID REFERENCES public.spots(id) ON DELETE SET NULL,
  university_domain TEXT,
  visibility       TEXT NOT NULL DEFAULT 'campus'
                   CHECK (visibility IN ('public', 'campus', 'premium')),
  is_official      BOOLEAN NOT NULL DEFAULT false,
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'archived')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 2. podcast_episodes
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.podcast_episodes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id          UUID NOT NULL REFERENCES public.podcast_shows(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  audio_url        TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  episode_number   INTEGER,
  access_tier      TEXT NOT NULL DEFAULT 'free'
                   CHECK (access_tier IN ('free', 'premium')),
  status           TEXT NOT NULL DEFAULT 'published'
                   CHECK (status IN ('draft', 'published', 'archived')),
  expires_at       TIMESTAMPTZ,
  play_count       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 3. podcast_listens
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.podcast_listens (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id       UUID NOT NULL REFERENCES public.podcast_episodes(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  listened_seconds INTEGER NOT NULL DEFAULT 0,
  completed        BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 4. Migrar datos existentes (best-effort)
-- ─────────────────────────────────────────
DO $$
DECLARE
  r         RECORD;
  ep        RECORD;
  v_show_id UUID;
  v_ep_num  INTEGER;
  v_tier    TEXT;
BEGIN
  FOR r IN
    SELECT
      creator_id,
      spot_id,
      MIN(created_at) AS first_created
    FROM public.podcasts
    WHERE creator_id IS NOT NULL
    GROUP BY creator_id, spot_id
  LOOP
    INSERT INTO public.podcast_shows (
      title, creator_id, spot_id, university_domain, status, created_at
    )
    SELECT
      'Podcast de ' || COALESCE(pr.username, 'usuario'),
      r.creator_id,
      r.spot_id,
      sp.university_domain,
      'active',
      r.first_created
    FROM public.profiles pr
    LEFT JOIN public.spots sp ON sp.id = r.spot_id
    WHERE pr.id = r.creator_id
    RETURNING id INTO v_show_id;

    -- Si no se insertó (creator sin perfil), saltar
    CONTINUE WHEN v_show_id IS NULL;

    v_ep_num := 1;
    FOR ep IN
      SELECT id, title, audio_url, duration_seconds, is_premium, expires_at, created_at
      FROM public.podcasts
      WHERE creator_id = r.creator_id
        AND (spot_id IS NOT DISTINCT FROM r.spot_id)
      ORDER BY created_at ASC
    LOOP
      v_tier := CASE WHEN ep.is_premium = true THEN 'premium' ELSE 'free' END;

      INSERT INTO public.podcast_episodes (
        show_id, title, audio_url, duration_seconds,
        episode_number, access_tier, status,
        expires_at, play_count, created_at, published_at
      ) VALUES (
        v_show_id, ep.title, ep.audio_url, ep.duration_seconds,
        v_ep_num, v_tier, 'published',
        ep.expires_at, 0, ep.created_at, ep.created_at
      );

      v_ep_num := v_ep_num + 1;
    END LOOP;
  END LOOP;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migración de podcasts omitida: %', SQLERRM;
END $$;

-- ─────────────────────────────────────────
-- 5. RLS
-- ─────────────────────────────────────────
ALTER TABLE public.podcast_shows    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_listens  ENABLE ROW LEVEL SECURITY;

-- podcast_shows SELECT: cualquier autenticado ve shows activos
CREATE POLICY "Select podcast shows"
  ON public.podcast_shows FOR SELECT
  USING (status = 'active'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    ));

-- podcast_shows INSERT: solo el propio creator
CREATE POLICY "Insert podcast shows"
  ON public.podcast_shows FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = creator_id);

-- podcast_shows UPDATE / DELETE: creator o admin
CREATE POLICY "Creator manages own show"
  ON public.podcast_shows FOR ALL
  USING (
    (SELECT auth.uid()) = creator_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = creator_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- podcast_episodes SELECT: publicados y no expirados (o admin)
CREATE POLICY "Select podcast episodes"
  ON public.podcast_episodes FOR SELECT
  USING (
    (status = 'published' AND (expires_at IS NULL OR expires_at > NOW()))
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- podcast_episodes INSERT: el creador del show puede insertar episodios
CREATE POLICY "Show creator inserts episodes"
  ON public.podcast_episodes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.podcast_shows
      WHERE id = show_id AND creator_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- podcast_episodes UPDATE/DELETE: creador del show o admin
CREATE POLICY "Creator manages episodes"
  ON public.podcast_episodes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.podcast_shows
      WHERE id = show_id AND creator_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.podcast_shows
      WHERE id = show_id AND creator_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- podcast_listens: insert libre (user_id nullable para anónimos), select propio
CREATE POLICY "Insert podcast listens"
  ON public.podcast_listens FOR INSERT
  WITH CHECK (user_id IS NULL OR (SELECT auth.uid()) = user_id);

CREATE POLICY "Select own listens"
  ON public.podcast_listens FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- ─────────────────────────────────────────
-- 6. Función increment_episode_play_count
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_episode_play_count(
  p_episode_id    UUID,
  p_listened_secs INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF p_listened_secs >= 15 THEN
    UPDATE public.podcast_episodes
    SET play_count = COALESCE(play_count, 0) + 1
    WHERE id = p_episode_id;
  END IF;
END;
$$;

-- Forzar recarga de schema cache
NOTIFY pgrst, 'reload schema';
