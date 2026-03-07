-- GHOST TRIGGER FIX: THE SPOT v1.8
-- Problema: Lovable o Supabase pueden tener OTRO trigger oculto intentando insertar el mismo ID en profiles al mismo tiempo, causando un error de "Duplicado de llave primaria".
-- Solución: Insertar con ON CONFLICT DO UPDATE (Upsert). Si otro trigger ya la creó, solo la actualizamos!

-- 1. Aseguramos columnas por última vez
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS edu_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university_domain TEXT;

-- 2. Reescribir el trigger principal a prueba de balas (Idempotente)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    final_domain TEXT;
BEGIN
    -- Excepciones de admin usando lower() para prevenir problemas de mayúsculas
    IF lower(NEW.email) = 'momentumcoaches.content@gmail.com' THEN
        final_domain := 'admin';
    ELSE
        -- Validación para correos y registro de error en el log si no es válido
        IF NEW.email NOT LIKE '%.edu%' AND NEW.email NOT LIKE '%.edu.mx%' THEN
            -- Si este raise ocurre, Supabase devuelve 500 "Database error saving new user".
            RAISE EXCEPTION 'Correo rechazado por dominio no válido: %', NEW.email;
        END IF;
        
        -- Extrae el dominio
        final_domain := split_part(NEW.email, '@', 2);
    END IF;

    -- INSERCIÓN ROBUSTA: Si el perfil ya fue creado por un trigger de Lovable una milésima de segundo antes, 
    -- esto no va a chocar (chocaría con "duplicate key"), sino que va a ACTUALIZAR los campos necesarios.
    INSERT INTO public.profiles (id, email, edu_email, university_domain)
    VALUES (
        NEW.id, 
        NEW.email, 
        NEW.email, 
        final_domain
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        edu_email = EXCLUDED.edu_email,
        university_domain = EXCLUDED.university_domain;
    
    RETURN NEW;
EXCEPTION 
    WHEN others THEN
        -- Si ocurre un error, en vez de matar el signup, lo dejamos pasar pero podemos verlo en logs 
        -- (comentar la siguiente línea si deseamos estrictez).
        -- Por ahora RAISE para no dejar pasar info inválida.
        RAISE EXCEPTION 'Error critico en handle_new_user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reconectar nuestro trigger principal a auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    -- Corremos después de todos los demás para hacer la actualización (Upsert)
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Limpieza de triggers fantasmas viejos 
DROP TRIGGER IF EXISTS check_edu_on_profile_update ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created_validate ON public.profiles;
