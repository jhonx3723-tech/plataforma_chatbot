-- ══════════════════════════════════════════════════════════════════════════════
-- Migración 3: columnas faltantes + tabla contacts completa
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Tabla contacts (crea si no existe, o agrega columnas faltantes) ───────────
CREATE TABLE IF NOT EXISTS public.contacts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL,
  phone        TEXT        NOT NULL,
  name         TEXT,
  company_name TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Columnas opcionales (si la tabla ya existía sin ellas)
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS notes        TEXT;

-- Índice único requerido para el upsert company_id + phone
CREATE UNIQUE INDEX IF NOT EXISTS contacts_company_phone_idx
  ON public.contacts (company_id, phone);

-- ── Columnas requeridas por el endpoint de respuesta de agentes ───────────────
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS agent_name  TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_note     BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Columnas para recordatorios de conversación ───────────────────────────────
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS reminder_at      TIMESTAMPTZ;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS reminder_user_id UUID;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS reminder_note    TEXT;
