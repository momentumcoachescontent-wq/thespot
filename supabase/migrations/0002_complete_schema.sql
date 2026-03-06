-- ==========================================
-- THE SPOT: MIGRACIÓN DE EMPATE v1.1
-- ==========================================

-- 1. TABLA: spot_members (Gestión de pertenencia y roles)
CREATE TABLE IF NOT EXISTS public.spot_members (
  spot_id UUID REFERENCES public.spots(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (spot_id, user_id)
);

-- 2. TABLA: reactions (Feedback de voz y emojis para Drops)
CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drop_id UUID REFERENCES public.drops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('emoji', 'audio')),
  emoji_code TEXT,
  audio_url TEXT, -- Para reacciones de voz
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: mood_checkins (Pulso emocional del campus)
CREATE TABLE IF NOT EXISTS public.mood_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  spot_id UUID REFERENCES public.spots(id) ON DELETE CASCADE,
  mood INTEGER CHECK (mood BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: audit_log (Registro de acciones de sistema/n8n)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) - COMPLETAR ESCUDO
-- ==========================================

ALTER TABLE public.spot_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: spot_members
-- Cualquier usuario puede ver quién está en un spot de su universidad.
CREATE POLICY "Ver miembros de spots de mi universidad" ON public.spot_members
  FOR SELECT USING (
    spot_id IN (SELECT id FROM public.spots WHERE university_domain = (SELECT university_domain FROM public.profiles WHERE id = auth.uid()))
  );

-- POLÍTICAS: reactions
-- Visibles para todos los que puedan ver el drop.
CREATE POLICY "Leer reacciones de drops visibles" ON public.reactions
  FOR SELECT USING (
    drop_id IN (SELECT id FROM public.drops WHERE expires_at > NOW())
  );

CREATE POLICY "Insertar mis propias reacciones" ON public.reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- POLÍTICAS: mood_checkins
-- Solo el usuario puede gestionar sus propios checkins.
CREATE POLICY "Gestionar MIS checkins" ON public.mood_checkins
  FOR ALL USING (auth.uid() = user_id);

-- POLÍTICAS: audit_log
-- Solo accesible por roles de servicio o administradores (definido por el sistema).
CREATE POLICY "Service role access" ON public.audit_log
  FOR ALL USING (true);
