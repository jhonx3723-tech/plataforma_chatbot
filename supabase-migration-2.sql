-- ══════════════════════════════════════════════════════════════════════════════
-- Migración 2: columna variables en sessions
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════════════════

-- Almacena las respuestas capturadas por el nodo "Capturar respuesta"
-- Ejemplo: { "nombre_cliente": "Juan", "email": "juan@mail.com" }
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS variables JSONB NOT NULL DEFAULT '{}';
