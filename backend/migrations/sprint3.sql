-- ═══════════════════════════════════════════════════════════════════
-- Sprint 3 — Migrations
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. SLA: primera respuesta del agente + configuración de SLA por empresa
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS sla_minutes  INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS webhook_last_ping TIMESTAMPTZ;

-- 2. Índice para buscar conversaciones sin primera respuesta (SLA dashboard)
CREATE INDEX IF NOT EXISTS conv_first_response_idx
  ON public.conversations(company_id, first_response_at)
  WHERE first_response_at IS NULL AND status = 'human';
