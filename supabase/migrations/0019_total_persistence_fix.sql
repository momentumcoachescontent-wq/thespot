-- MIGRACIÓN FINAL: PERSISTENCIA TOTAL Y UNICIDAD DE REACCIONES
-- Objetivo: Asegurar que el conteo de oyentes sea persistente y las reacciones limitadas.

-- 1. Reparar RPC con SECURITY DEFINER para saltar RLS en el incremento
CREATE OR REPLACE FUNCTION increment_listened_count(drop_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.drops
  SET listened_count = COALESCE(listened_count, 0) + 1
  WHERE id = drop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Permisos explícitos
GRANT EXECUTE ON FUNCTION increment_listened_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_listened_count(UUID) TO anon;

-- 2. Limpiar duplicados de reacciones antes de aplicar restricción única
-- (Mantiene solo la reacción más reciente por usuario en cada drop)
DELETE FROM public.reactions a USING public.reactions b
WHERE a.created_at < b.created_at 
  AND a.drop_id = b.drop_id 
  AND a.user_id = b.user_id 
  AND a.type = 'emoji';

-- 3. Aplicar restricción única para limitar a 1 reacción por usuario por drop
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_reaction_per_drop'
    ) THEN
        ALTER TABLE public.reactions ADD CONSTRAINT unique_user_reaction_per_drop UNIQUE (drop_id, user_id, type);
    END IF;
END $$;
