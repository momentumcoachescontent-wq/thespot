-- SCRIPT DE DIAGNÓSTICO: THE SPOT v1.9
-- Objetivo: Determinar si el error 500 viene de nuestra lógica o de una restricción fuerte en la base de datos.
-- Acción: Vamos a poner el trigger en "Modo Seguro" (Vacío) temporalmente.

-- 1. Desactivamos las validaciones en la tabla profiles
DROP TRIGGER IF EXISTS check_edu_on_profile_update ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created_validate ON public.profiles;

-- 2. Creamos un trigger "Fantasma" que no hace NADA más que decirle a Supabase "Todo chido, deja pasar al usuario".
-- No intentará insertar en public.profiles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- NO insertamos nada en profiles por ahora.
    -- Solo dejamos que Supabase Auth termine de crear el usuario.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reconectamos el trigger en modo seguro
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- INSTRUCCIÓN PARA EL USUARIO:
-- 1. Ejecuta este script.
-- 2. Intenta hacer login de nuevo con el correo.
-- 3. Si pasa y envía el correo, EL PROBLEMA es nuestra inserción en profiles (probablemente falta un campo NOT NULL oculto).
-- 4. Si SIGUE fallando, EL PROBLEMA es Supabase per-se (Límites de correo, u otro trigger oculto de Lovable).
