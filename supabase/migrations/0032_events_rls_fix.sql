-- MIGRACIÓN 0032: FIX RLS EVENTOS GLOBALES
-- Objetivo: Permitir crear eventos sin un spot específico (Cualquier Spot)

DROP POLICY IF EXISTS "Usuarios pueden crear eventos en sus spots" ON public.events;
DROP POLICY IF EXISTS "Usuarios pueden crear eventos" ON public.events;

-- Permitimos que spot_id sea nulo (evento global) o que exista en la tabla spots
CREATE POLICY "Usuarios pueden crear eventos" ON public.events
FOR INSERT WITH CHECK (
    auth.uid() = creator_id AND 
    (spot_id IS NULL OR EXISTS (SELECT 1 FROM public.spots WHERE id = spot_id))
);

-- Actualizar/Eliminar
DROP POLICY IF EXISTS "Usuarios pueden editar sus eventos" ON public.events;
CREATE POLICY "Usuarios pueden editar sus eventos" ON public.events
FOR UPDATE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Usuarios pueden eliminar sus eventos" ON public.events;
CREATE POLICY "Usuarios pueden eliminar sus eventos" ON public.events
FOR DELETE USING (auth.uid() = creator_id);
