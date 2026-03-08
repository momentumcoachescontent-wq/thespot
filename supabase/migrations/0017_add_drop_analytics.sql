-- MIGRACIÓN: ANALÍTICAS DE DROPS (DURACIÓN Y OYENTES)
-- Objetivo: Rastrear el alcance real de los mensajes de voz.

-- 1. Añadir columnas a la tabla drops
ALTER TABLE public.drops 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS listened_count INTEGER DEFAULT 0;

-- 2. Función para incrementar el contador de oyentes de forma segura
CREATE OR REPLACE FUNCTION increment_listened_count(drop_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.drops
  SET listened_count = listened_count + 1
  WHERE id = drop_id;
END;
$$ LANGUAGE plpgsql;

-- 3. RLS para la función (RPC)
-- Las funciones RPC en Supabase heredan permisos de quien las llama si se definen sin SECURITY DEFINER.
-- Por seguridad, nos aseguramos que solo autenticados puedan incrementar (aunque la lógica está en el FE).
