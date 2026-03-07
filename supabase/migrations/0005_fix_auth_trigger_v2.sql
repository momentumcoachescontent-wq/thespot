-- ADMIN EXCEPTION UPDATE: THE SPOT v1.6.2
-- FIX: Columna correcta (edu_email) y eliminación de trigger redundante

-- 1. Eliminar el trigger incorrecto creado en v1.6.1
DROP TRIGGER IF EXISTS on_auth_user_created_validate ON public.profiles;

-- 2. Corregir la función para usar NEW.edu_email, que es la columna real en public.profiles
CREATE OR REPLACE FUNCTION public.validate_edu_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Permitir excepciones específicas de administración
    -- Chequeo defensivo por si es nulo
    IF NEW.edu_email IS NOT NULL AND lower(NEW.edu_email) IN ('momentumcoaches.content@gmail.com') THEN
        -- Intentar asignar dominio genérico si existe la columna
        BEGIN
            NEW.university_domain := 'admin';
        EXCEPTION WHEN undefined_column THEN
            -- Ignorar
        END;
        RETURN NEW;
    END IF;

    -- Validación estándar
    -- La tabla profiles usa edu_email
    IF NEW.edu_email IS NOT NULL AND NEW.edu_email NOT LIKE '%.edu%' AND NEW.edu_email NOT LIKE '%.edu.mx%' THEN
        RAISE EXCEPTION 'Solo se permiten correos institucionales (.edu) para esta comunidad académica.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Asegurar que el trigger original correcto esté activo
DROP TRIGGER IF EXISTS check_edu_on_profile_update ON public.profiles;
CREATE TRIGGER check_edu_on_profile_update
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.validate_edu_email();
