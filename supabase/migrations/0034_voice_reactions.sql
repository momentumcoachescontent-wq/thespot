-- MIGRACIÓN 0034: VOICE REACTIONS
-- Objetivo: Reacciones de voz cortas (hasta 3 segundos) como respuesta a un Drop.
-- Blueprint Sprint 1 - Feature A1.

CREATE TABLE IF NOT EXISTS public.voice_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_drop_id UUID NOT NULL REFERENCES public.drops(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índice para consultas por drop
CREATE INDEX IF NOT EXISTS idx_voice_reactions_parent_drop ON public.voice_reactions(parent_drop_id);

-- RLS
ALTER TABLE public.voice_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede ver voice reactions"
    ON public.voice_reactions FOR SELECT USING (true);

CREATE POLICY "Usuarios autenticados pueden crear voice reactions"
    ON public.voice_reactions FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Autores pueden borrar sus voice reactions"
    ON public.voice_reactions FOR DELETE
    USING (auth.uid() = author_id);
