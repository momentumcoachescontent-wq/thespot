-- MIGRACIÓN: ASEGURAR BUCKET DE STORAGE PARA DROPS
-- Objetivo: Resolver error "Bucket not found" al publicar audios.

-- 1. Insertar el bucket si no existe
INSERT INTO storage.buckets (id, name, public)
SELECT 'drops', 'drops', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'drops'
);

-- 2. Políticas de Seguridad para el Bucket 'drops'
-- Permitir lectura pública
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'drops');

-- Permitir a usuarios autenticados subir sus propios archivos
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND bucket_id = 'drops'
);

-- Permitir a usuarios autenticados borrar sus propios archivos (opcional)
CREATE POLICY "Users can delete own drops" ON storage.objects FOR DELETE USING (
    auth.uid() = owner AND bucket_id = 'drops'
);
