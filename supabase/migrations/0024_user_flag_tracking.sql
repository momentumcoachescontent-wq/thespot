-- MIGRACIÓN: TRACKING DE FALTAS Y AUDITORÍA DE MODERACIÓN
-- Objetivo: Rastrear reincidencias de usuarios y permitir limpieza post-moderación.

-- 1. Añadir contador de faltas al perfil
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS flag_count INTEGER DEFAULT 0;

-- 2. Crear un log de eventos de moderación para que el administrador tenga historial
CREATE TABLE IF NOT EXISTS public.moderation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drop_id UUID REFERENCES public.drops(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'AUTO_APPROVED', 'AUTO_BLOCKED', 'ADMIN_DELETED'
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver los logs
CREATE POLICY "Solo admins ven logs de moderación" ON public.moderation_logs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);
