-- MIGRACIÓN 0035: CAMPOS WHATSAPP EN SOS_INCIDENTS
-- Objetivo: Registrar resultado del envío WhatsApp vía n8n (Meta Business Cloud API).

ALTER TABLE public.sos_incidents
  ADD COLUMN IF NOT EXISTS notified_contacts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;
