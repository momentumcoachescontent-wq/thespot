-- STANDARDIZATION FIX: THE SPOT v1.5
-- OBJETIVO: Resolver inconsistencia author_id vs user_id manejando dependencias de políticas.

-- 1. ELIMINAR POLÍTICAS QUE DEPENDEN DE LAS COLUMNAS PRIMERO
-- Esto libera a 'user_id' de dependencias para poder renombrarla o borrarla.
DROP POLICY IF EXISTS "Insertar mis Drops" ON public.drops;
DROP POLICY IF EXISTS "Usuarios pueden crear sus propios Drops" ON public.drops;
DROP POLICY IF EXISTS "Drops visibles solo si no han expirado" ON public.drops;

DO $$ 
BEGIN
    -- 2. Estandarizar 'drops': Renombrar user_id a author_id si existe
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'drops' AND column_name = 'user_id') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'drops' AND column_name = 'author_id') THEN
            ALTER TABLE public.drops RENAME COLUMN user_id TO author_id;
        ELSE
            -- Si ambos existen, migramos datos y borramos el incorrecto
            UPDATE public.drops SET author_id = user_id WHERE author_id IS NULL;
            ALTER TABLE public.drops DROP COLUMN user_id;
        END IF;
    END IF;

    -- 3. Asegurar que 'author_id' sea la columna oficial
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'drops' AND column_name = 'author_id') THEN
        ALTER TABLE public.drops ADD COLUMN author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- 4. Estandarizar otras tablas para consistencia
    -- spots: creator_id (ya usado en frontend)
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'spots' AND column_name = 'user_id') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'spots' AND column_name = 'creator_id') THEN
            ALTER TABLE public.spots RENAME COLUMN user_id TO creator_id;
        END IF;
    END IF;

END $$;

-- 5. RE-CREAR LAS POLÍTICAS CORRECTAS
-- INSERT: Basado en author_id (lo que usa el frontend)
CREATE POLICY "Insertar mis Drops" ON public.drops 
FOR INSERT WITH CHECK (auth.uid() = author_id);

-- SELECT: Basado en tiempo (público)
CREATE POLICY "Drops visibles solo si no han expirado" ON public.drops 
FOR SELECT USING (expires_at > NOW());

-- 6. Política para SPOTS (opcional pero recomendada)
DROP POLICY IF EXISTS "Spots son públicos para lectura" ON public.spots;
CREATE POLICY "Spots son públicos para lectura" ON public.spots FOR SELECT USING (true);
