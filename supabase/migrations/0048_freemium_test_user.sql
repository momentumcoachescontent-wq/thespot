-- ============================================================
-- Migration 0048: ealvareze1 = freemium test user (not premium)
-- Separates ".edu bypass" from "is_premium" — these are independent:
--   - Bypass: allowed to use the app with non-.edu email
--   - Premium: paid subscription — must come from Stripe or admin grant
-- ============================================================

-- Fix validate_edu_email: bypass based on explicit email list, not is_premium
CREATE OR REPLACE FUNCTION public.validate_edu_email()
RETURNS TRIGGER AS $$
DECLARE
    -- Non-.edu emails explicitly allowed to use the app (admin + test accounts)
    -- is_premium is NOT relevant here; these accounts bypass .edu validation only
    bypass_emails TEXT[] := ARRAY[
        'momentumcoaches.content@gmail.com',
        'ealvareze1@gmail.com'
    ];
BEGIN
    -- Bypass: admin role
    IF NEW.role = 'admin' THEN
        IF NEW.university_domain IS NULL OR NEW.university_domain = '' THEN
            NEW.university_domain := 'admin';
        END IF;
        RETURN NEW;
    END IF;

    -- Bypass: explicit non-.edu test/admin accounts (email list only)
    IF lower(NEW.email) = ANY(bypass_emails) OR lower(COALESCE(NEW.edu_email, '')) = ANY(bypass_emails) THEN
        IF NEW.university_domain IS NULL OR NEW.university_domain = '' THEN
            NEW.university_domain := split_part(NEW.email, '@', 2);
        END IF;
        RETURN NEW;
    END IF;

    -- Legacy domain marker
    IF NEW.university_domain = 'admin' THEN
        RETURN NEW;
    END IF;

    -- Standard .edu validation for all other users
    IF NEW.edu_email IS NOT NULL
       AND NEW.edu_email NOT LIKE '%.edu%'
       AND NEW.edu_email NOT LIKE '%.edu.mx%' THEN
        RAISE EXCEPTION 'Solo se permiten correos institucionales (.edu)';
    END IF;

    IF NEW.edu_email IS NOT NULL AND (NEW.university_domain IS NULL OR NEW.university_domain = '') THEN
        NEW.university_domain := split_part(NEW.edu_email, '@', 2);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP TRIGGER IF EXISTS check_edu_on_profile_update ON public.profiles;
CREATE TRIGGER check_edu_on_profile_update
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.validate_edu_email();

-- Update handle_new_user: ealvareze1 = regular free user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    admin_emails TEXT[] := ARRAY['momentumcoaches.content@gmail.com'];
    bypass_emails TEXT[] := ARRAY['ealvareze1@gmail.com'];
    final_domain TEXT;
BEGIN
    IF lower(NEW.email) = ANY(admin_emails) THEN
        INSERT INTO public.profiles (id, email, edu_email, university_domain, role, is_premium, subscription_status)
        VALUES (NEW.id, NEW.email, NEW.email, 'admin', 'admin', true, 'active')
        ON CONFLICT (id) DO UPDATE SET
            email             = EXCLUDED.email,
            edu_email         = EXCLUDED.edu_email,
            university_domain = 'admin',
            role              = 'admin',
            is_premium        = true,
            subscription_status = 'active';

    ELSIF lower(NEW.email) = ANY(bypass_emails) THEN
        -- Freemium test user: can use the app, no premium by default
        final_domain := split_part(NEW.email, '@', 2);
        INSERT INTO public.profiles (id, email, edu_email, university_domain, role, is_premium, subscription_status)
        VALUES (NEW.id, NEW.email, NEW.email, final_domain, 'user', false, 'inactive')
        ON CONFLICT (id) DO NOTHING;  -- don't overwrite existing profile data

    ELSE
        IF NEW.email NOT LIKE '%.edu%' AND NEW.email NOT LIKE '%.edu.mx%' THEN
            RAISE EXCEPTION 'Correo rechazado por dominio no válido: %', NEW.email;
        END IF;
        final_domain := split_part(NEW.email, '@', 2);
        INSERT INTO public.profiles (id, email, edu_email, university_domain, role, is_premium, subscription_status)
        VALUES (NEW.id, NEW.email, NEW.email, final_domain, 'user', false, 'inactive')
        ON CONFLICT (id) DO UPDATE SET
            email             = EXCLUDED.email,
            edu_email         = EXCLUDED.edu_email,
            university_domain = EXCLUDED.university_domain;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN others THEN
        RAISE EXCEPTION 'Error critico en handle_new_user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Reset ealvareze1 to freemium (free tier, no subscription)
UPDATE public.profiles
SET
    role                    = 'user',
    is_premium              = false,
    subscription_status     = 'inactive',
    subscription_expires_at = NULL,
    university_domain       = 'gmail.com'
WHERE lower(email) = 'ealvareze1@gmail.com';
