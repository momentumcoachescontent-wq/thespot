-- MIGRACIÓN 0031: PERMANENT RANKING & EVENT RSVPS
-- Objetivo: Historial permanente de drops y mejoras sociales a eventos

-- 1. Tabla: drop_history (Para rankings persistentes)
CREATE TABLE IF NOT EXISTS public.drop_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    duration_seconds INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas RLS para drop_history
ALTER TABLE public.drop_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede ver el historial de drops" ON public.drop_history
FOR SELECT USING (true);

CREATE POLICY "Solo sistema/admins insertan historial" ON public.drop_history
FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' -- Permisible temporalmente, idealmente desde Edge Function
);

-- 2. Modificaciones a tabla events
-- location pasa a ser de texto libre
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location_text TEXT;

-- 3. Tabla: event_attendees (Para RSVP real)
CREATE TABLE IF NOT EXISTS public.event_attendees (
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (event_id, user_id)
);

-- Políticas RLS para event_attendees
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede ver asistentes" ON public.event_attendees
FOR SELECT USING (true);

CREATE POLICY "Usuarios pueden confirmar asistencia" ON public.event_attendees
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden cancelar asistencia" ON public.event_attendees
FOR DELETE USING (auth.uid() = user_id);
