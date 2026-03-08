-- MIGRACIÓN: CREACIÓN DE TABLAS FALTANTES (PODCASTS Y EVENTOS)
-- Objetivo: Detener los errores 404 en el dashboard y permitir contenido adicional.

-- 1. Tabla de Podcasts
CREATE TABLE IF NOT EXISTS public.podcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  spot_id UUID REFERENCES public.spots(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Eventos
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  spot_id UUID REFERENCES public.spots(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'meetup',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acceso
-- Podcasts son públicos para lectura si no han expirado
CREATE POLICY "Podcasts visibles si no han expirado" ON public.podcasts
FOR SELECT USING (expires_at > NOW());

-- Eventos son públicos para lectura
CREATE POLICY "Eventos son públicos" ON public.events
FOR SELECT USING (true);

-- Permitir a usuarios autenticados crear eventos/podcasts (opcional, por ahora lectura es clave)
CREATE POLICY "Usuarios pueden crear eventos" ON public.events
FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Usuarios pueden crear podcasts" ON public.podcasts
FOR INSERT WITH CHECK (auth.uid() = creator_id);
