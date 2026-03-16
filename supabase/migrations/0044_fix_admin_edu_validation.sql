-- ============================================================
-- Migration 0044: Fix edu email validation for admin accounts
-- Problem: validate_edu_email trigger blocks onboarding for
--   admin emails (gmail.com) because it doesn't check role first.
-- Fix: Check NEW.role = 'admin' before any .edu validation.
--   Also update handle_new_user to support additional admin emails
--   via university_domain = 'admin' check.
-- ============================================================

-- Rewrite validate_edu_email with role-first bypass
CREATE OR REPLACE FUNCTION public.validate_edu_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Admin role bypass — skip .edu validation entirely
    IF NEW.role = 'admin' THEN
        IF NEW.university_domain IS NULL OR NEW.university_domain = '' THEN
            NEW.university_domain := 'admin';
        END IF;
        RETURN NEW;
    END IF;

    -- Also bypass if university_domain is already 'admin' (set by handle_new_user for admin emails)
    IF NEW.university_domain = 'admin' THEN
        RETURN NEW;
    END IF;

    -- Standard .edu validation for regular users
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

-- Rewrite handle_new_user to support multiple admin emails via domain check
-- instead of a single hardcoded email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    final_domain TEXT;
    admin_emails TEXT[] := ARRAY[
        'momentumcoaches.content@gmail.com',
        'ealvareze1@gmail.com'
    ];
BEGIN
    -- Admin email list bypass
    IF lower(NEW.email) = ANY(admin_emails) THEN
        final_domain := 'admin';
    ELSE
        -- Validate .edu domain for regular users
        IF NEW.email NOT LIKE '%.edu%' AND NEW.email NOT LIKE '%.edu.mx%' THEN
            RAISE EXCEPTION 'Correo rechazado por dominio no válido: %', NEW.email;
        END IF;
        final_domain := split_part(NEW.email, '@', 2);
    END IF;

    -- Upsert: safe if another trigger already created the row
    INSERT INTO public.profiles (id, email, edu_email, university_domain, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.email,
        final_domain,
        CASE WHEN lower(NEW.email) = ANY(admin_emails) THEN 'admin' ELSE 'user' END
    )
    ON CONFLICT (id) DO UPDATE SET
        email             = EXCLUDED.email,
        edu_email         = EXCLUDED.edu_email,
        university_domain = EXCLUDED.university_domain,
        role              = CASE
                              WHEN EXCLUDED.university_domain = 'admin' THEN 'admin'
                              ELSE public.profiles.role  -- don't downgrade existing role
                            END;

    RETURN NEW;
EXCEPTION
    WHEN others THEN
        RAISE EXCEPTION 'Error critico en handle_new_user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure validate_edu_email trigger is active on profiles
-- (may have been dropped in earlier migrations — recreate it)
DROP TRIGGER IF EXISTS check_edu_on_profile_update ON public.profiles;
CREATE TRIGGER check_edu_on_profile_update
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.validate_edu_email();

-- Fix existing admin profiles that may be stuck (ensure role + domain are set)
UPDATE public.profiles
SET
    role = 'admin',
    university_domain = 'admin',
    is_premium = true
WHERE lower(email) IN (
    'momentumcoaches.content@gmail.com',
    'ealvareze1@gmail.com'
);
