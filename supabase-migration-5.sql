-- ── Feature: WhatsApp HSM Templates ─────────────────────────────────────────
-- WABA ID necesario para consultar plantillas aprobadas en Meta
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS whatsapp_waba_id TEXT DEFAULT NULL;
