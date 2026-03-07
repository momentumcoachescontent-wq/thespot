-- ADMIN EXCEPTION UPDATE: THE SPOT v1.6
-- OBJETIVO: Permitir que correos de administración específicos se salten la validación .edu

-- 1. Actualizar la función de validación para incluir excepciones
OR REPLACE FUNCTION public.validate_edu_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Permitir excepciones específicas de administración
    IF NEW.email IN ('momentumcoaches.content@gmail.com') THEN
        NEW.university_domain := 'admin';
        RETURN NEW;
    END IF;

    -- Validación estándar para el resto de los mortales
    IF NEW.email NOT LIKE '%.edu' THEN
        RAISE EXCEPTION 'Solo se permiten correos institucionales (.edu) para esta comunidad académica.';
    END IF;
    
    -- Extraer el dominio
    NEW.university_domain := split_part(NEW.email, '@', 2);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asegurar que el trigger esté activo (por si acaso)
DROP TRIGGER IF EXISTS on_auth_user_created_validate ON public.profiles;
CREATE TRIGGER on_auth_user_created_validate
    BEFORE INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.validate_edu_email();

-- 3. Nota: Para usuarios ya creados que fallaron, el administrador debe insertarlos 
-- o el usuario debe registrarse de nuevo ahora que la excepción existe.
