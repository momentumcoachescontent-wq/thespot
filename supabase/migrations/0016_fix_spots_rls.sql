-- MIGRACIÓN: CORRECCIÓN DE RLS PARA SPOTS
-- Objetivo: Permitir la creación automática de spots de instituciones nuevas.

-- 1. Asegurar política de inserción
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Usuarios autenticados pueden crear spots" ON public.spots;
    CREATE POLICY "Usuarios autenticados pueden crear spots" ON public.spots 
    FOR INSERT WITH CHECK (auth.uid() = creator_id);
    
    -- También asegurar que el creador pueda actualizar su propio spot (opcional pero recomendado)
    DROP POLICY IF EXISTS "Creadores pueden actualizar sus spots" ON public.spots;
    CREATE POLICY "Creadores pueden actualizar sus spots" ON public.spots 
    FOR UPDATE USING (auth.uid() = creator_id);
END $$;
