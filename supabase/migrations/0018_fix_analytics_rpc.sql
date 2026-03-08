-- MIGRACIÓN: FIX PERSISTENCIA ANALÍTICAS
-- Objetivo: Asegurar que el incremento de oyentes funcione independientemente del RLS del usuario.

CREATE OR REPLACE FUNCTION increment_listened_count(drop_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.drops
  SET listened_count = COALESCE(listened_count, 0) + 1
  WHERE id = drop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION increment_listened_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_listened_count(UUID) TO anon;
