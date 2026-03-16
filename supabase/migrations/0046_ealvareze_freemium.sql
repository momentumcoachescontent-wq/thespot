-- ============================================================
-- Migration 0046: ealvareze1@gmail.com → premium user (not admin)
-- ============================================================

-- Update profile: role=user, is_premium=true, fix university_domain
UPDATE public.profiles
SET
    role                  = 'user',
    is_premium            = true,
    subscription_status   = 'active',
    subscription_expires_at = NOW() + INTERVAL '100 years',
    university_domain     = CASE
                              WHEN university_domain = 'admin' THEN 'gmail.com'
                              ELSE university_domain
                            END
WHERE lower(email) = 'ealvareze1@gmail.com';

-- Update handle_new_user: ealvareze1 gets role=user + is_premium=true on signup,
-- only momentumcoaches.content stays as admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    final_domain TEXT;
    admin_emails  TEXT[] := ARRAY['momentumcoaches.content@gmail.com'];
    premium_emails TEXT[] := ARRAY['ealvareze1@gmail.com'];
BEGIN
    IF lower(NEW.email) = ANY(admin_emails) THEN
        final_domain := 'admin';

        INSERT INTO public.profiles (id, email, edu_email, university_domain, role, is_premium, subscription_status)
        VALUES (NEW.id, NEW.email, NEW.email, 'admin', 'admin', true, 'active')
        ON CONFLICT (id) DO UPDATE SET
            email             = EXCLUDED.email,
            edu_email         = EXCLUDED.edu_email,
            university_domain = 'admin',
            role              = 'admin',
            is_premium        = true,
            subscription_status = 'active';

    ELSIF lower(NEW.email) = ANY(premium_emails) THEN
        final_domain := split_part(NEW.email, '@', 2);

        INSERT INTO public.profiles (id, email, edu_email, university_domain, role, is_premium, subscription_status, subscription_expires_at)
        VALUES (NEW.id, NEW.email, NEW.email, final_domain, 'user', true, 'active', NOW() + INTERVAL '100 years')
        ON CONFLICT (id) DO UPDATE SET
            email               = EXCLUDED.email,
            edu_email           = EXCLUDED.edu_email,
            university_domain   = EXCLUDED.university_domain,
            is_premium          = true,
            subscription_status = 'active';

    ELSE
        IF NEW.email NOT LIKE '%.edu%' AND NEW.email NOT LIKE '%.edu.mx%' THEN
            RAISE EXCEPTION 'Correo rechazado por dominio no válido: %', NEW.email;
        END IF;
        final_domain := split_part(NEW.email, '@', 2);

        INSERT INTO public.profiles (id, email, edu_email, university_domain, role)
        VALUES (NEW.id, NEW.email, NEW.email, final_domain, 'user')
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
