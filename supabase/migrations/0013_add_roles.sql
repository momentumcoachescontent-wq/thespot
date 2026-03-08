-- ROLE BASED ACCESS CONTROL (RBAC) SETUP: THE SPOT v1.3.0
-- Objetivo: Eliminar hardcoding de emails y habilitar sistema de roles.

-- 1. Añadir columna role a la tabla profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 2. Actualizar el administrador actual
-- Email: momentumcoaches.content@gmail.com
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'momentumcoaches.content@gmail.com';

-- 3. Actualizar trigger para manejar roles si es necesario (opcional)
-- Por ahora, el default es 'user', lo cual es correcto.

-- 4. Audit: Verificar estados
-- SELECT id, email, role FROM public.profiles WHERE role = 'admin';
