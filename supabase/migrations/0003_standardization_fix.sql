-- STANDARDIZATION FIX: THE SPOT v1.4
-- OBJETIVO: Resolver inconsistencia author_id vs user_id y limpiar políticas duplicadas.

DO $$ 
BEGIN
    -- 1. Estandarizar 'drops': Renombrar user_id a author_id si existe
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'drops' AND column_name = 'user_id') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'drops' AND column_name = 'author_id') THEN
            ALTER TABLE public.drops RENAME COLUMN user_id TO author_id;
        ELSE
            -- Si ambos existen por error, migramos datos y borramos el incorrecto
            UPDATE public.drops SET author_id = user_id WHERE author_id IS NULL;
            ALTER TABLE public.drops DROP COLUMN user_id;
        END IF;
    END IF;

    -- 2. Asegurar que 'author_id' sea la columna oficial
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'drops' AND column_name = 'author_id') THEN
        ALTER TABLE public.drops ADD COLUMN author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- 3. Limpiar políticas de INSERT inconsistentes
    DROP POLICY IF EXISTS "Insertar mis Drops" ON public.drops;
    DROP POLICY IF EXISTS "Usuarios pueden crear sus propios Drops" ON public.drops;

    -- 4. Crear la política ÚNICA y CORRECTA (basada en el frontend)
    CREATE POLICY "Insertar mis Drops" ON public.drops 
    FOR INSERT WITH CHECK (auth.uid() = author_id);

    -- 5. Revisar SELECT (debe permitir ver drops activos)
    DROP POLICY IF EXISTS "Drops visibles solo si no han expirado" ON public.drops;
    CREATE POLICY "Drops visibles solo si no han expirado" ON public.drops 
    FOR SELECT USING (expires_at > NOW());

    -- 6. Estandarizar otras tablas para consistencia
    -- spots: creator_id (ya usado en frontend)
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'spots' AND column_name = 'user_id') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'spots' AND column_name = 'creator_id') THEN
            ALTER TABLE public.spots RENAME COLUMN user_id TO creator_id;
        END IF;
    END IF;

END $$;
