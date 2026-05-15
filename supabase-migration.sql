-- ══════════════════════════════════════════════════════════════════════════════
-- Migración requerida para el correcto funcionamiento del chatbot
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query → Run All
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Tabla de sesiones de usuario en el bot ───────────────────────────────────
-- Registra en qué nodo del flujo está cada usuario durante una conversación.
-- Sin esta tabla el motor de flows no puede funcionar.
CREATE TABLE IF NOT EXISTS sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL,
  flow_id         UUID        NOT NULL,
  user_phone      TEXT        NOT NULL,
  contact_name    TEXT,
  current_node_id TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un usuario solo puede tener una sesión activa por empresa y flujo
CREATE UNIQUE INDEX IF NOT EXISTS sessions_company_phone_flow_idx
  ON sessions (company_id, user_phone, flow_id);

-- Índice para acelerar las consultas del webhook (buscar sesión por empresa+teléfono)
CREATE INDEX IF NOT EXISTS sessions_company_phone_idx
  ON sessions (company_id, user_phone);

-- ── Habilitar Supabase Realtime ───────────────────────────────────────────────
-- Necesario para que el inbox reciba actualizaciones en tiempo real (SSE).
-- Si estas tablas ya están en la publicación, Supabase ignorará los duplicados.
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
