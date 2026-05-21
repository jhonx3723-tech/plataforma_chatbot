-- ── Feature: Delay node ──────────────────────────────────────────────────────
-- Mensajes programados generados por nodos de espera en el flow builder
CREATE TABLE IF NOT EXISTS public.delayed_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL,
  conversation_id UUID        NOT NULL,
  session_id      UUID        NOT NULL,
  next_node_id    TEXT        NOT NULL,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  executed        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS delayed_messages_due_idx
  ON public.delayed_messages (executed, scheduled_at)
  WHERE executed = FALSE;

-- ── Feature: Agent availability status ───────────────────────────────────────
-- Columna en users para el estado actual del agente
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT NULL;

-- Estados configurables por empresa (admin puede crear/editar/borrar)
CREATE TABLE IF NOT EXISTS public.availability_statuses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL,
  name        TEXT        NOT NULL,
  color       TEXT        NOT NULL DEFAULT '#22c55e',
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS availability_statuses_company_idx
  ON public.availability_statuses (company_id, sort_order);
