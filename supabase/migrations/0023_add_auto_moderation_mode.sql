-- MIGRACIÓN: AÑADIR MODO AUTO-PILOTO A MODERACIÓN
-- Objetivo: Permitir que la IA tome decisiones finales sin intervención humana.

-- 1. Insertar el nuevo setting (o asegurar que exista)
INSERT INTO public.site_settings (key, value)
VALUES ('auto_moderation_mode', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Asegurar que el toggle de moderación principal también exista (por si acaso)
INSERT INTO public.site_settings (key, value)
VALUES ('ai_moderation_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
