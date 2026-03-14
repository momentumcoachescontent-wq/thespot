-- Migration 0036: Stripe Premium Integration (Spot+)
-- Adds Stripe fields to profiles, stripe_transactions table,
-- and configurable drop duration settings per tier.

-- ─── 1. Extend profiles with Stripe + subscription fields ────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id       TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status      TEXT DEFAULT 'inactive'
    CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled', 'trialing')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS premium_granted_by_admin BOOLEAN DEFAULT false;

-- ─── 2. Stripe transactions log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stripe_transactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  stripe_event_id  TEXT UNIQUE NOT NULL,
  event_type       TEXT NOT NULL,
  amount           INTEGER,          -- in cents
  currency         TEXT DEFAULT 'mxn',
  status           TEXT,             -- succeeded, failed, pending, etc.
  stripe_customer  TEXT,
  stripe_sub_id    TEXT,
  metadata         JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_user ON public.stripe_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_event ON public.stripe_transactions(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_created ON public.stripe_transactions(created_at DESC);

-- RLS: only admins can read; edge functions use service_role to write
ALTER TABLE public.stripe_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view stripe transactions"
  ON public.stripe_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ─── 3. Configurable drop duration settings ──────────────────────────────────
-- Uses the existing site_settings table (key/value pairs).
-- Defaults: freemium = 5 min, premium = 15 min (stored as integer minutes).
INSERT INTO public.site_settings (key, value)
VALUES
  ('drop_duration_freemium', '5'::jsonb),
  ('drop_duration_premium',  '15'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ─── 4. Ensure admins always have premium ─────────────────────────────────────
-- Update existing trigger logic: admin role => is_premium + subscription_status active
CREATE OR REPLACE FUNCTION public.enforce_admin_premium()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    NEW.is_premium             := true;
    NEW.subscription_status    := 'active';
    NEW.subscription_expires_at := NOW() + INTERVAL '100 years';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_admin_premium ON public.profiles;
CREATE TRIGGER trg_enforce_admin_premium
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_premium();

-- Apply to current admins
UPDATE public.profiles
SET
  is_premium             = true,
  subscription_status    = 'active',
  subscription_expires_at = NOW() + INTERVAL '100 years'
WHERE role = 'admin';
