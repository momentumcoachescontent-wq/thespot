-- ============================================================
-- Migration 0061: Opción "Externo / Acceso libre"
-- Permite que correos no institucionales (.edu) se registren
-- en la app asignándoles university_domain = 'externo'.
-- Externo users ven contenido de todas las sedes (sin filtro).
-- ============================================================

-- 1. Actualizar handle_new_user para permitir emails externos
--    En lugar de rechazar correos no-.edu, asignar domain='externo'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    final_domain TEXT;
    final_role TEXT := 'user';
    admin_emails TEXT[] := ARRAY[
        'momentumcoaches.content@gmail.com',
        'ealvareze1@gmail.com'
    ];
BEGIN
    IF lower(NEW.email) = ANY(admin_emails) THEN
        final_domain := 'admin';
        final_role   := 'admin';
    ELSIF NEW.email LIKE '%.edu%' OR NEW.email LIKE '%.edu.mx%' THEN
        final_domain := split_part(NEW.email, '@', 2);
    ELSE
        -- Correo externo (gmail, hotmail, etc.) — acceso libre
        final_domain := 'externo';
    END IF;

    INSERT INTO public.profiles (id, email, edu_email, university_domain, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.email,
        final_domain,
        final_role
    )
    ON CONFLICT (id) DO UPDATE SET
        email             = EXCLUDED.email,
        edu_email         = EXCLUDED.edu_email,
        university_domain = COALESCE(public.profiles.university_domain, EXCLUDED.university_domain),
        role              = CASE
                              WHEN EXCLUDED.university_domain = 'admin' THEN 'admin'
                              ELSE public.profiles.role
                            END;

    RETURN NEW;
EXCEPTION
    WHEN others THEN
        RAISE EXCEPTION 'Error en handle_new_user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 2. Actualizar validate_edu_email para bypasear domain='externo'
CREATE OR REPLACE FUNCTION public.validate_edu_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Bypasses de dominio especial
    IF NEW.role = 'admin' THEN
        IF NEW.university_domain IS NULL OR NEW.university_domain = '' THEN
            NEW.university_domain := 'admin';
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.university_domain = 'admin' THEN
        RETURN NEW;
    END IF;

    -- Usuarios externos: cualquier correo es válido
    IF NEW.university_domain = 'externo' THEN
        RETURN NEW;
    END IF;

    -- Validación .edu estándar
    IF NEW.edu_email IS NOT NULL
       AND NEW.edu_email NOT LIKE '%.edu%'
       AND NEW.edu_email NOT LIKE '%.edu.mx%' THEN
        RAISE EXCEPTION 'Solo se permiten correos institucionales (.edu)';
    END IF;

    IF NEW.edu_email IS NOT NULL AND NEW.university_domain IS NULL THEN
        NEW.university_domain := split_part(NEW.edu_email, '@', 2);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 3. Recrear triggers (por si acaso)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS check_edu_on_profile_update ON public.profiles;
CREATE TRIGGER check_edu_on_profile_update
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.validate_edu_email();

NOTIFY pgrst, 'reload schema';
