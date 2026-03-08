-- SOS ALERT SCHEMA: THE SPOT v1.2.0
-- Objetivo: Infraestructura para contactos de confianza y registro de emergencias.

-- 1. Tabla de Contactos de Confianza
CREATE TABLE IF NOT EXISTS public.sos_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    relationship TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para sos_contacts
ALTER TABLE public.sos_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own SOS contacts"
    ON public.sos_contacts
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. Tabla de Incidentes SOS
CREATE TABLE IF NOT EXISTS public.sos_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'false_alarm')),
    audio_url TEXT, -- Opcional: Para grabar audio durante la crisis
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- RLS para sos_incidents
ALTER TABLE public.sos_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create and see their own incidents"
    ON public.sos_incidents
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_sos_contacts_user_id ON public.sos_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_incidents_user_id ON public.sos_incidents(user_id);
