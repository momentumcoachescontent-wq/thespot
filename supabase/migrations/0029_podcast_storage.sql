-- MIGRACIÓN 0029: STORAGE Y SCHEMA PARA PODCASTS
-- Objetivo: Habilitar almacenamiento de audios largos y metadatos extendidos.

-- 1. Asegurar Bucket para Podcasts
INSERT INTO storage.buckets (id, name, public)
SELECT 'podcasts', 'podcasts', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'podcasts'
);

-- 2. Políticas de Seguridad para Bucket 'podcasts'
CREATE POLICY "Public Podcast Access" ON storage.objects FOR SELECT USING (bucket_id = 'podcasts');

CREATE POLICY "Authenticated users can upload podcasts" ON storage.objects FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND bucket_id = 'podcasts'
);

CREATE POLICY "Users can delete own podcasts" ON storage.objects FOR DELETE USING (
    auth.uid() = owner AND bucket_id = 'podcasts'
);

-- 3. Añadir columna description a podcasts (si faltaba)
ALTER TABLE public.podcasts ADD COLUMN IF NOT EXISTS description TEXT;

-- 4. Asegurar RLS en la tabla podcasts para inserción
DROP POLICY IF EXISTS "Usuarios pueden crear podcasts" ON public.podcasts;
CREATE POLICY "Usuarios pueden crear podcasts" ON public.podcasts
FOR INSERT WITH CHECK (auth.uid() = creator_id);
