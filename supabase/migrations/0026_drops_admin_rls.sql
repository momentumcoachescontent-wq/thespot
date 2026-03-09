-- MIGRACIÓN: PERMISOS DE ADMINISTRADOR PARA MODERACIÓN DE DROPS
-- Objetivo: Permitir a los perfiles con rol 'admin' actualizar y eliminar drops desde el frontend (Aprobar/Rechazar).

-- 1. Política para UPDATE
DROP POLICY IF EXISTS "Admins pueden actualizar drops" ON public.drops;
CREATE POLICY "Admins pueden actualizar drops" ON public.drops
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 2. Política para DELETE
DROP POLICY IF EXISTS "Admins pueden eliminar drops" ON public.drops;
CREATE POLICY "Admins pueden eliminar drops" ON public.drops
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);
