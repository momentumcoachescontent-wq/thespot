-- ============================================================
-- Migration 0063: Fix handle_new_user — include username
-- La migración 0061 reescribió handle_new_user sin incluir
-- el campo `username` (NOT NULL + UNIQUE), causando que todos
-- los registros nuevos fallaran con violación de constraint.
-- Esta migración restaura la generación de username.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    final_domain TEXT;
    final_role   TEXT := 'user';
    base_username TEXT;
    gen_username  TEXT;
    admin_emails  TEXT[] := ARRAY[
        'momentumcoaches.content@gmail.com',
        'ealvareze1@gmail.com'
    ];
BEGIN
    -- Determinar dominio y rol
    IF lower(NEW.email) = ANY(admin_emails) THEN
        final_domain := 'admin';
        final_role   := 'admin';
    ELSIF NEW.email LIKE '%.edu%' OR NEW.email LIKE '%.edu.mx%' THEN
        final_domain := split_part(NEW.email, '@', 2);
    ELSE
        -- Correo externo (gmail, hotmail, etc.) — acceso libre
        final_domain := 'externo';
    END IF;

    -- Generar username: prefijo del email sanitizado + 5 caracteres del UUID
    -- Ejemplo: "juan.perez@tec.mx" → "juanperez_a1b2c"
    base_username := regexp_replace(
        split_part(lower(NEW.email), '@', 1),
        '[^a-z0-9_]', '', 'g'
    );
    -- Fallback si el prefijo queda vacío después de sanitizar
    IF base_username = '' THEN
        base_username := 'user';
    END IF;
    gen_username := base_username || '_' || substr(replace(NEW.id::text, '-', ''), 1, 5);

    INSERT INTO public.profiles (id, email, edu_email, university_domain, role, username)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.email,
        final_domain,
        final_role,
        gen_username
    )
    ON CONFLICT (id) DO UPDATE SET
        email             = EXCLUDED.email,
        edu_email         = EXCLUDED.edu_email,
        university_domain = COALESCE(public.profiles.university_domain, EXCLUDED.university_domain),
        role              = CASE
                              WHEN EXCLUDED.university_domain = 'admin' THEN 'admin'
                              ELSE public.profiles.role
                            END;
        -- username no se sobreescribe en conflicto para preservar el elegido por el usuario

    RETURN NEW;
EXCEPTION
    WHEN others THEN
        RAISE EXCEPTION 'Error en handle_new_user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

NOTIFY pgrst, 'reload schema';
