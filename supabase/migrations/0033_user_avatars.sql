-- MIGRACIÓN 0033: AVATAR DE USUARIOS
-- Objetivo: Añadir soporte para selección de avatar (emoji) en los perfiles

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT '🎤';
