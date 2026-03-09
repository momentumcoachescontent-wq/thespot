-- MIGRACIÓN 0030: FIX RLS PARA PODCASTS
-- Objetivo: Resolver error de violación de RLS al publicar podcasts.

-- 1. Eliminar políticas antiguas conflictivas
DROP POLICY IF EXISTS "Usuarios pueden crear podcasts" ON public.podcasts;
DROP POLICY IF EXISTS "Usuarios pueden insertar podcasts" ON public.podcasts;

-- 2. Permitir inserción a cualquier usuario autenticado
-- El backend se encarga de asignar el creator_id correctamente
CREATE POLICY "Usuarios pueden insertar podcasts" ON public.podcasts
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Actualizar política de lectura: Visibles si no han expirado O si eres ADMIN
DROP POLICY IF EXISTS "Podcasts visibles si no han expirado" ON public.podcasts;
DROP POLICY IF EXISTS "Select podcasts" ON public.podcasts;
CREATE POLICY "Select podcasts" ON public.podcasts
FOR SELECT USING (
  expires_at > NOW() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Permitir a los administradores gestionar TODA la tabla (Borrar, Editar, etc)
DROP POLICY IF EXISTS "Admins gestionan todo en podcasts" ON public.podcasts;
CREATE POLICY "Admins gestionan todo en podcasts" ON public.podcasts
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
