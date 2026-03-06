-- FIX: MIGRACIÓN DEFENSIVA THE SPOT v1.2
-- Corrige el error "column user_id does not exist" asegurando la integridad del esquema.

-- 1. Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Asegurar columnas en tablas que podrían ya existir (Fase 0)
DO $$ 
BEGIN
    -- Asegurar user_id en 'drops'
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'drops') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'drops' AND column_name = 'user_id') THEN
            ALTER TABLE public.drops ADD COLUMN user_id UUID REFERENCES auth.users(id);
        END IF;
    END IF;

    -- Asegurar user_id en 'incidents'
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'incidents') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'user_id') THEN
            ALTER TABLE public.incidents ADD COLUMN user_id UUID REFERENCES auth.users(id);
        END IF;
    END IF;

    -- Asegurar creator_id en 'spots'
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'spots') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'spots' AND column_name = 'creator_id') THEN
            ALTER TABLE public.spots ADD COLUMN creator_id UUID REFERENCES auth.users(id);
        END IF;
    END IF;
END $$;

-- 3. Crear tablas nuevas (si no existen)
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

-- 4. Actualizar perfiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS edu_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS campus_id UUID;

-- 5. Habilitar RLS en bloque
ALTER TABLE public.drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_checkins ENABLE ROW LEVEL SECURITY;

-- 6. Re-crear Políticas con seguridad de existencia
DROP POLICY IF EXISTS "Usuarios pueden crear sus propios Drops" ON public.drops;
CREATE POLICY "Usuarios pueden crear sus propios Drops" ON public.drops FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Mis contactos son privados" ON public.contacts;
CREATE POLICY "Mis contactos son privados" ON public.contacts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Gestionar mis checkins" ON public.mood_checkins;
CREATE POLICY "Gestionar mis checkins" ON public.mood_checkins FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Spots son públicos para lectura" ON public.spots;
CREATE POLICY "Spots son públicos para lectura" ON public.spots FOR SELECT USING (true);

-- 7. Trigger de validación .edu
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
