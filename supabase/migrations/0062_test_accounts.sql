-- ============================================================
-- Migration 0062: Test accounts para testers de Google Play
-- Desarrollo temporal — permite dar de alta usuarios con
-- correos personales (gmail, etc.) y login por contraseña
-- sin OTP para facilitar pruebas en el testing track.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.test_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Solo admins pueden ver y crear test accounts
ALTER TABLE public.test_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage test_accounts"
    ON public.test_accounts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
            AND role = 'admin'
        )
    );

NOTIFY pgrst, 'reload schema';
