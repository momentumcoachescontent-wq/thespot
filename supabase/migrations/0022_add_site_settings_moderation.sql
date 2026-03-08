-- MIGRACIÓN: CONFIGURACIÓN DE SISTEMA Y MODERACIÓN
-- Objetivo: Crear tabla de settings para control de admin y asegurar limpieza de drops.

-- 1. Tabla de Configuración Global
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed inicial para Moderación
INSERT INTO public.site_settings (key, value)
VALUES ('ai_moderation_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Asegurar que 'drops' tenga columna de flag
ALTER TABLE public.drops ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;
ALTER TABLE public.drops ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

-- 3. Habilitar RLS en site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden gestionar settings
CREATE POLICY "Admins gestionan settings" ON public.site_settings
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role = 'admin' OR username = 'admin')
    )
);

-- Usuarios autenticados pueden leer settings (para saber si la moderación está activa)
CREATE POLICY "Lectura pública de settings" ON public.site_settings
FOR SELECT TO authenticated USING (true);
