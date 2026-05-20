-- ══════════════════════════════════════════════════════════════════════════════
-- Migración 3: columnas faltantes en messages + recordatorios en conversations
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════════════════

-- Columnas requeridas por el endpoint de respuesta de agentes
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS agent_name  TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_note     BOOLEAN NOT NULL DEFAULT FALSE;

-- Columnas requeridas para recordatorios de conversación
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS reminder_at      TIMESTAMPTZ;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS reminder_user_id UUID;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS reminder_note    TEXT;
