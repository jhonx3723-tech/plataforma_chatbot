-- ── Feature: Mini CRM ────────────────────────────────────────────────────────
-- Habilitar CRM por empresa (lo activa el super_admin)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS crm_enabled BOOLEAN DEFAULT FALSE;

-- Campos CRM en contactos (pipeline_stage = NULL significa fuera del CRM)
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS pipeline_stage      TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deal_value          NUMERIC(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expected_close_date DATE    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS crm_notes           TEXT    DEFAULT NULL;
