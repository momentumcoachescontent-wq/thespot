-- MIGRACIÓN: EXTENSIÓN DE PERFILES Y SOPORTE DE ONBOARDING
-- Fase 4 de Auditoría y Refactorización

-- 1. Extender perfiles con campos adicionales
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS institution_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- 2. Tabla para reportes de dominios académicos no registrados
CREATE TABLE IF NOT EXISTS public.institution_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    institution_suggestion TEXT,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'added'))
);

-- RLS para reportes
ALTER TABLE public.institution_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cualquiera puede insertar reportes" ON public.institution_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Solo admin puede leer reportes" ON public.institution_reports FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Garantizar que los nuevos usuarios sean freemium (si no se maneja ya)
-- Nota: La columna role ya está en profiles por migración 0013.
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';
