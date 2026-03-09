-- Migration 0028: Fix Admin Role and Premium Access
-- 1. Añadir columna is_premium a la tabla profiles (faltante)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- 2. Asegurar que el administrador tenga el rol de admin y acceso premium habilitado
UPDATE public.profiles 
SET role = 'admin', is_premium = true
WHERE email = 'momentumcoaches.content@gmail.com';
