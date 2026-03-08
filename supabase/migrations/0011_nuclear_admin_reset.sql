-- NUCLEAR ADMIN RESET: THE SPOT v1.1.3
-- Objetivo: Borrar y recrear al admin con contraseña MANUAL para saltar límites de correo.

-- 1. Borrar rastro previo (para evitar conflictos de UUID o duplicados)
DELETE FROM auth.users WHERE email = 'momentumcoaches.content@gmail.com';
DELETE FROM public.profiles WHERE email = 'momentumcoaches.content@gmail.com';

-- 2. Crear el usuario directamente en auth.users con contraseña hashed
-- Usamos crypt de pgcrypto (activado por defecto en Supabase)
-- Contraseña final: SpotAdmin2026!
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'momentumcoaches.content@gmail.com',
    crypt('SpotAdmin2026!', gen_salt('bf')),
    now(),
    NULL,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"username":"Admin"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
);

-- 3. Crear su perfil automáticamente vinculando el nuevo ID
INSERT INTO public.profiles (id, email, edu_email, university_domain, username)
SELECT id, email, email, 'admin', 'Admin'
FROM auth.users 
WHERE email = 'momentumcoaches.content@gmail.com';

-- 4. Notificación:
-- Una vez ejecutado este script, NO intentes recuperar contraseña.
-- Simplemente ve a la app, pon tu correo y entrarás directo.
