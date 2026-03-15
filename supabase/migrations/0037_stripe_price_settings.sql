-- Migration 0037: Stripe price settings in site_settings
-- Allows admin to configure Stripe price IDs and display prices
-- without deploying new code.

INSERT INTO public.site_settings (key, value)
VALUES
  ('stripe_price_id_monthly',  '""'::jsonb),
  ('stripe_price_id_yearly',   '""'::jsonb),
  ('price_display_monthly',    '99'::jsonb),
  ('price_display_yearly',     '999'::jsonb)
ON CONFLICT (key) DO NOTHING;
