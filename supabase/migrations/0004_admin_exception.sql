-- ADMIN EXCEPTION UPDATE: THE SPOT v1.6.1
-- OBJETIVO: Permitir que correos de administración específicos se salten la validación .edu

-- 1. Actualizar la función de validación para incluir excepciones
CREATE OR REPLACE FUNCTION public.validate_edu_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Permitir excepciones específicas de administración
    -- Usamos lower() por seguridad en la comparación
    IF lower(NEW.email) IN ('momentumcoaches.content@gmail.com') THEN
        -- Si la tabla profiles tiene university_domain, lo asignamos
        BEGIN
            NEW.university_domain := 'admin';
        EXCEPTION WHEN undefined_column THEN
            -- Si la columna no existe aún, no pasa nada
        END;
        RETURN NEW;
    END IF;

    -- Validación estándar
    -- Verificamos si NEW.email existe (en profiles puede ser email o edu_email según el schema previo)
    -- Ajustamos para que funcione con el campo que esté usando el trigger
    IF NEW.email NOT LIKE '%.edu' AND NEW.email NOT LIKE '%.edu.mx' THEN
        RAISE EXCEPTION 'Solo se permiten correos institucionales (.edu) para esta comunidad académica.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asegurar que el trigger esté activo en la tabla profiles
DROP TRIGGER IF EXISTS on_auth_user_created_validate ON public.profiles;
CREATE TRIGGER on_auth_user_created_validate
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.validate_edu_email();
