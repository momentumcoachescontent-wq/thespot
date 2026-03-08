-- MIGRACIÓN: REGLAS DE MODERACIÓN Y SELECCIÓN DE MODELO
-- Objetivo: Permitir al Arquitecto personalizar los criterios de análisis y el motor de IA.

-- 1. Insertar reglas de moderación por defecto
INSERT INTO public.site_settings (key, value)
VALUES ('moderation_rules', '"Analiza si el audio contiene acoso, lenguaje de odio explícito o incitación a la violencia. Sé estricto con el bullying escolar."'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Insertar proveedor de IA por defecto (openai o google)
INSERT INTO public.site_settings (key, value)
VALUES ('ai_model_provider', '"openai"'::jsonb)
ON CONFLICT (key) DO NOTHING;
