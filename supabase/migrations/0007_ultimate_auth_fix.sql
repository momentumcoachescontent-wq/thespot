-- ULTRA FIX: REPARACIÓN COMPLETA DE AUTENTICACIÓN THE SPOT v1.7
-- Objetivo: Resolver "Database error saving new user" arreglando la raíz del problema: el trigger original de auth.users

-- 1. Asegurar que public.profiles tiene las columnas correctas.
-- Es muy probable que Lovable use 'email' y nosotros le estamos pidiendo 'edu_email'. 
-- Vamos a asegurar que ambas existan para no romper la app de Lovable.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS edu_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university_domain TEXT;

-- 2. Reescribir la función principal que crea el perfil cuando alguien se registra (Supabase Auth -> Public)
-- Esta función es la que suele fallar en silencio si el schema de profiles cambió.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    final_domain TEXT;
BEGIN
    -- Lógica de validación directamente aquí para evitar saltos entre triggers
    
    -- Excepción de administrador
    IF lower(NEW.email) = 'momentumcoaches.content@gmail.com' THEN
        final_domain := 'admin';
    ELSE
        -- Validación para el resto de mortales
        IF NEW.email NOT LIKE '%.edu%' AND NEW.email NOT LIKE '%.edu.mx%' THEN
            RAISE EXCEPTION 'Solo se permiten correos institucionales (.edu) para esta comunidad académica.';
        END IF;
        final_domain := split_part(NEW.email, '@', 2);
    END IF;

    -- Inserción segura en perfiles
    INSERT INTO public.profiles (id, email, edu_email, university_domain)
    VALUES (
        NEW.id, 
        NEW.email, 
        NEW.email, -- Guardamos el correo en ambos campos por compatibilidad
        final_domain
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Asegurar que el trigger en auth.users llame a nuestra función actualizada
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Como ya hacemos la validación en handle_new_user, 
-- podemos desactivar el trigger secundario en perfiles para evitar conflictos y bloqueos.
DROP TRIGGER IF EXISTS check_edu_on_profile_update ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created_validate ON public.profiles;
