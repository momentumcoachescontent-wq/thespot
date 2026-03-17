-- Migration 0056: RPC para que un usuario autenticado elimine su propia cuenta
--
-- SECURITY DEFINER permite al owner (postgres) borrar de auth.users
-- aunque el llamador solo sea "authenticated".
-- La función elimina:
--   1. El perfil (cascade elimina sos_contacts, conversations, messages,
--      push_subscriptions, drop_history, reacciones, etc. según las FK ON DELETE CASCADE)
--   2. El registro en auth.users (cierra todas las sesiones activas)

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Eliminar perfil (cascade a tablas relacionadas)
  DELETE FROM public.profiles WHERE id = _uid;

  -- 2. Eliminar usuario de auth (invalida todas las sesiones)
  DELETE FROM auth.users WHERE id = _uid;
END;
$$;

-- Permitir que cualquier usuario autenticado llame la función
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- Forzar recarga de caché PostgREST
NOTIFY pgrst, 'reload schema';
