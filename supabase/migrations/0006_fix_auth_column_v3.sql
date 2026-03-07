-- ADMIN EXCEPTION UPDATE: THE SPOT v1.6.3
-- FIX REAL: La columna university_domain no existía, lo que rompía el trigger al compilarse/ejecutarse.

-- 1. Añadir la columna faltante en public.profiles (Que además el frontend ya usa en FeedPage)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university_domain TEXT;

-- 2. Reescribir el trigger de forma segura
CREATE OR REPLACE FUNCTION public.validate_edu_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Permitir excepciones específicas de administración
    IF NEW.edu_email IS NOT NULL AND lower(NEW.edu_email) = 'momentumcoaches.content@gmail.com' THEN
        NEW.university_domain := 'admin';
        RETURN NEW;
    END IF;

    -- Validación estándar
    IF NEW.edu_email IS NOT NULL AND NEW.edu_email NOT LIKE '%.edu%' AND NEW.edu_email NOT LIKE '%.edu.mx%' THEN
        RAISE EXCEPTION 'Solo se permiten correos institucionales (.edu) para esta comunidad académica.';
    END IF;

    -- Extraer el dominio automáticamente si es un correo válido (e.g. jdoe@mit.edu -> mit.edu)
    IF NEW.edu_email IS NOT NULL THEN
        NEW.university_domain := split_part(NEW.edu_email, '@', 2);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Asegurar que el trigger correcto esté activo
DROP TRIGGER IF EXISTS check_edu_on_profile_update ON public.profiles;
CREATE TRIGGER check_edu_on_profile_update
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.validate_edu_email();
