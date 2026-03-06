-- SCHEMA DE BASE DE DATOS THE SPOT v1.1
-- OBJETIVO: CORE DROP + SPOTS + SEGURIDAD .EDU

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de Perfiles (Extensión de Auth.users)
-- Asumimos que profiles ya existe en Fase 0, pero aseguramos campos clave
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS edu_email TEXT,
ADD COLUMN IF NOT EXISTS campus_id UUID;

-- 3. Tabla de Spots (Campus/Comunidades)
CREATE TABLE IF NOT EXISTS public.spots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location GEOGRAPHY(POINT) NOT NULL,
  radius_meters INTEGER DEFAULT 500,
  max_members INTEGER DEFAULT 500,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Miembros de los Spots
CREATE TABLE IF NOT EXISTS public.spot_members (
  spot_id UUID REFERENCES public.spots(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (spot_id, user_id)
);

-- 5. Tabla de Drops (Audios Efímeros)
CREATE TABLE IF NOT EXISTS public.drops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  spot_id UUID REFERENCES public.spots(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  waveform JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'safe', 'flagged', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabla de Reacciones
CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drop_id UUID REFERENCES public.drops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('emoji', 'audio')),
  emoji_code TEXT,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Red de Seguridad: Contactos e Incidentes
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  spot_id UUID REFERENCES public.spots(id) ON DELETE SET NULL,
  location GEOGRAPHY(POINT) NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Auditoría y Mood
CREATE TABLE IF NOT EXISTS public.mood_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  spot_id UUID REFERENCES public.spots(id) ON DELETE CASCADE,
  mood INTEGER CHECK (mood BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SEGURIDAD (Row Level Security)
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_checkins ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad
CREATE POLICY "Spots son públicos para lectura" ON public.spots FOR SELECT USING (true);
CREATE POLICY "Drops visibles solo si no han expirado" ON public.drops FOR SELECT USING (expires_at > NOW());
CREATE POLICY "Usuarios pueden crear sus propios Drops" ON public.drops FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Mis contactos son privados" ON public.contacts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Ver miembros de mi Spot" ON public.spot_members FOR SELECT USING (true);
CREATE POLICY "Gestionar mis checkins" ON public.mood_checkins FOR ALL USING (auth.uid() = user_id);

-- 10. TRIGGER PARA VALIDACIÓN .EDU
CREATE OR REPLACE FUNCTION validate_edu_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.edu_email NOT LIKE '%.edu%' AND NEW.edu_email NOT LIKE '%.edu.mx' THEN
    RAISE EXCEPTION 'Solo se permiten correos institucionales (.edu)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_edu_on_profile_update
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION validate_edu_email();
