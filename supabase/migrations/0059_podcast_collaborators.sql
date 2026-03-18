-- ============================================================
-- Migration 0059: Colaboradores en Podcast Shows
-- Permite que el creator de un show invite a otros usuarios
-- para que puedan subir episodios al mismo show.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.podcast_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    show_id UUID REFERENCES public.podcast_shows(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined')),
    can_upload BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (show_id, user_id)
);

ALTER TABLE public.podcast_collaborators ENABLE ROW LEVEL SECURITY;

-- Cualquier participante, el creator del show o admins pueden ver colaboradores
CREATE POLICY "Collaborators visible to participants and show creator"
    ON public.podcast_collaborators FOR SELECT
    USING (
        user_id = (SELECT auth.uid())
        OR invited_by = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.podcast_shows
            WHERE id = show_id AND creator_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Solo el creator del show puede invitar colaboradores
CREATE POLICY "Show creator can invite collaborators"
    ON public.podcast_collaborators FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.podcast_shows
            WHERE id = show_id AND creator_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- El colaborador puede actualizar su propio status (aceptar/declinar)
-- El creator puede actualizar can_upload o eliminar
CREATE POLICY "Collaborator can update own status"
    ON public.podcast_collaborators FOR UPDATE
    USING (
        user_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.podcast_shows
            WHERE id = show_id AND creator_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Creator y admin pueden eliminar colaboradores
CREATE POLICY "Show creator can remove collaborators"
    ON public.podcast_collaborators FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.podcast_shows
            WHERE id = show_id AND creator_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

NOTIFY pgrst, 'reload schema';
