-- Migration 0054: Replace sos_contacts.relationship with contact categories
--
-- is_spot_contact    — appears in the Spot network (default true)
-- is_emergency_contact — receives SOS alerts via WhatsApp (default false)

ALTER TABLE public.sos_contacts
  ADD COLUMN IF NOT EXISTS is_spot_contact      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_emergency_contact BOOLEAN NOT NULL DEFAULT false;

-- Back-fill: anyone already stored was added as a safety contact → mark both true
UPDATE public.sos_contacts
SET is_spot_contact = true, is_emergency_contact = true
WHERE is_emergency_contact = false AND relationship IS NOT NULL;

ALTER TABLE public.sos_contacts DROP COLUMN IF EXISTS relationship;
