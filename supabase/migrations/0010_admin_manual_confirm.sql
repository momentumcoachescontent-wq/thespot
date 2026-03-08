-- ADMIN BYPASS SETUP: THE SPOT v1.1.1
-- Objetivo: Confirmar manualmente al admin para evitar bloqueos por límites de correo.

-- 1. Asegurar que el usuario administrador existe y está confirmado en auth.users
-- NOTA: Este script asume que el usuario ya intentó registrarse al menos una vez.
UPDATE auth.users 
SET 
    email_confirmed_at = NOW(),
    last_sign_in_at = NOW(),
    confirmation_token = NULL,
    recovery_token = NULL
WHERE email = 'momentumcoaches.content@gmail.com';

-- 2. Asegurar que el perfil en public.profiles esté bien configurado como admin
-- Usamos UPSERT para estar seguros e inclumos el username (REQUERIDO)
INSERT INTO public.profiles (id, email, edu_email, university_domain, username)
SELECT id, email, email, 'admin', 'Admin'
FROM auth.users 
WHERE email = 'momentumcoaches.content@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    university_domain = 'admin',
    edu_email = EXCLUDED.email,
    username = COALESCE(public.profiles.username, 'Admin');

-- 3. Instrucción: 
-- Para que el bypass funcione, el administrador debe tener una contraseña fija.
-- Por favor, ve al Supabase Dashboard -> Authentication -> Users -> Selecciona tu correo -> "Reset password".
-- O usa este comando si tienes permisos de superusuario (no recomendado sin hash):
-- UPDATE auth.users SET encrypted_password = crypt('SpotAdmin2026!', gen_salt('bf')) WHERE email = 'momentumcoaches.content@gmail.com';
