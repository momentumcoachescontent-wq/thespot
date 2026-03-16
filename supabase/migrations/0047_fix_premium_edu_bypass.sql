-- ============================================================
-- Migration 0047: Fix validate_edu_email blocking premium accounts
-- Problem: trigger fires on UPDATE for ealvareze1@gmail.com
--   which is not .edu and not role=admin → raises exception
--   and prevents onboarding/profile updates for premium test users
-- Fix: bypass .edu validation when is_premium = true
--   (is_premium can only be set by service_role/admin, so this is safe)
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_edu_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Bypass: admin role
    IF NEW.role = 'admin' THEN
        IF NEW.university_domain IS NULL OR NEW.university_domain = '' THEN
            NEW.university_domain := 'admin';
        END IF;
        RETURN NEW;
    END IF;

    -- Bypass: explicitly granted premium (test accounts, admin grants, Stripe)
    -- is_premium can only be set by service_role, not by the user themselves
    IF NEW.is_premium = true THEN
        IF NEW.university_domain IS NULL OR NEW.university_domain = '' THEN
            NEW.university_domain := split_part(NEW.email, '@', 2);
        END IF;
        RETURN NEW;
    END IF;

    -- Bypass: legacy admin domain marker
    IF NEW.university_domain = 'admin' THEN
        RETURN NEW;
    END IF;

    -- Standard .edu validation for regular users
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

-- Ensure trigger is active
DROP TRIGGER IF EXISTS check_edu_on_profile_update ON public.profiles;
CREATE TRIGGER check_edu_on_profile_update
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.validate_edu_email();

-- Re-confirm ealvareze1 premium state (force it clean)
UPDATE public.profiles
SET
    role                    = 'user',
    is_premium              = true,
    subscription_status     = 'active',
    subscription_expires_at = NOW() + INTERVAL '100 years',
    university_domain       = 'gmail.com'
WHERE lower(email) = 'ealvareze1@gmail.com';
