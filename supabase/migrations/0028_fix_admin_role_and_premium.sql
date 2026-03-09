-- Migration 0028: Fix Admin Role and Premium Access
-- Asegurar que el administrador tenga el rol de admin y acceso premium habilitado

UPDATE public.profiles 
SET role = 'admin', is_premium = true
WHERE email = 'momentumcoaches.content@gmail.com';

-- En caso de que el trigger de auth no haya funcionado para algún admin nuevo en el futuro
-- podemos agregar una política o regla adicional, pero por ahora esto corrige al admin actual.
