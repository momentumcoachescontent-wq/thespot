-- MIGRACIÓN: FIX FINAL RLS REACCIONES
-- Objetivo: Permitir UPSERT, UPDATE y DELETE para que el sistema de reacciones funcione al 100%.

-- 1. Eliminar políticas antiguas restrictivas para evitar conflictos
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Insertar mis propias reacciones" ON public.reactions;
    DROP POLICY IF EXISTS "Actualizar mis propias reacciones" ON public.reactions;
    DROP POLICY IF EXISTS "Borrar mis propias reacciones" ON public.reactions;
    DROP POLICY IF EXISTS "Gestionar mis propias reacciones" ON public.reactions;
END $$;

-- 2. Crear política integral para que el usuario gestione sus propias reacciones
-- Esto habilita INSERT, UPDATE y DELETE en una sola regla.
CREATE POLICY "Gestionar mis propias reacciones" ON public.reactions
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Asegurar que SELECT siga siendo público (para ver conteos)
-- Solo la creamos si no existe o la refrescamos.
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Leer reacciones de drops visibles" ON public.reactions;
    CREATE POLICY "Leer reacciones de drops visibles" ON public.reactions
    FOR SELECT USING (true); -- Simplificado para asegurar visibilidad total de conteos
END $$;
