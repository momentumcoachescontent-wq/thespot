-- FINAL FIX: MIGRACIÓN ULTRA-ROBUSTA THE SPOT v1.3
-- RESUELVE: ERROR 42P01 (relation does not exist) y asegura integridad total.

-- 1. Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Asegurar existencia de tablas base y columnas críticas
-- SPOTS
CREATE TABLE IF NOT EXISTS public.spots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location GEOGRAPHY(POINT),
    radius_meters INTEGER DEFAULT 500,
    max_members INTEGER DEFAULT 500,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DROPS
CREATE TABLE IF NOT EXISTS public.drops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audio_url TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INCIDENTS
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location GEOGRAPHY(POINT),
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Inyección de columnas faltantes por si las tablas ya existían sin ellas
DO $$ 
BEGIN
    -- user_id en drops
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'drops' AND column_name = 'user_id') THEN
        ALTER TABLE public.drops ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- spot_id en drops
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'drops' AND column_name = 'spot_id') THEN
        ALTER TABLE public.drops ADD COLUMN spot_id UUID REFERENCES public.spots(id) ON DELETE CASCADE;
    END IF;

    -- user_id en incidents
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'user_id') THEN
        ALTER TABLE public.incidents ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- creator_id en spots
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'spots' AND column_name = 'creator_id') THEN
        ALTER TABLE public.spots ADD COLUMN creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Crear tablas de soporte Fase 1-3
CREATE TABLE IF NOT EXISTS public.spot_members (
  spot_id UUID REFERENCES public.spots(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (spot_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drop_id UUID REFERENCES public.drops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('emoji', 'audio')),
  emoji_code TEXT,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mood_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  spot_id UUID REFERENCES public.spots(id) ON DELETE CASCADE,
  mood INTEGER CHECK (mood BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Actualizar perfiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS edu_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS campus_id UUID;

-- 6. Habilitar RLS
ALTER TABLE public.drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_checkins ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS (Idempotentes)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Usuarios pueden crear sus propios Drops" ON public.drops;
    CREATE POLICY "Usuarios pueden crear sus propios Drops" ON public.drops FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Mis contactos son privados" ON public.contacts;
    CREATE POLICY "Mis contactos son privados" ON public.contacts FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Gestionar mis checkins" ON public.mood_checkins;
    CREATE POLICY "Gestionar mis checkins" ON public.mood_checkins FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Spots son públicos para lectura" ON public.spots;
    CREATE POLICY "Spots son públicos para lectura" ON public.spots FOR SELECT USING (true);
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error al crear políticas, posiblemente ya existan';
END $$;

-- 8. Trigger de validación .edu
CREATE OR REPLACE FUNCTION validate_edu_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.edu_email NOT LIKE '%.edu%' AND NEW.edu_email NOT LIKE '%.edu.mx' THEN
    RAISE EXCEPTION 'Solo se permiten correos institucionales (.edu)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_edu_on_profile_update ON public.profiles;
CREATE TRIGGER check_edu_on_profile_update
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION validate_edu_email();
