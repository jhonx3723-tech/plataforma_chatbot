const express = require('express');
const supabase = require('../supabase');
const { authMiddleware, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

function toCSV(rows, columns) {
  const escape = (val) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return /[",\n\r]/.test(str) ? `"${str}"` : str;
  };
  const header = columns.map(c => c.label).join(',');
  const lines  = rows.map(row => columns.map(c => escape(row[c.key])).join(','));
  return [header, ...lines].join('\n');
}

// Exportar conversaciones CSV
router.get('/conversations', authMiddleware, requireSuperAdmin, async (req, res) => {
  const { from, to, company_id } = req.query;

  let query = supabase
    .from('conversations')
    .select('*, companies(name)')
    .order('created_at', { ascending: false });

  if (from)       query = query.gte('created_at', new Date(from).toISOString());
  if (to)         query = query.lte('created_at', new Date(to + 'T23:59:59').toISOString());
  if (company_id) query = query.eq('company_id', company_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const columns = [
    { key: 'id',          label: 'ID' },
    { key: 'empresa',     label: 'Empresa' },
    { key: 'telefono',    label: 'Telefono' },
    { key: 'estado',      label: 'Estado' },
    { key: 'ultimo_msg',  label: 'Ultimo mensaje' },
    { key: 'fecha',       label: 'Fecha creacion' },
    { key: 'actualizado', label: 'Ultimo mensaje en' },
  ];

  const rows = (data || []).map(c => ({
    id:          c.id,
    empresa:     c.companies?.name || '',
    telefono:    c.user_phone,
    estado:      c.status,
    ultimo_msg:  c.last_message,
    fecha:       new Date(c.created_at).toLocaleString('es-CO'),
    actualizado: new Date(c.last_message_at).toLocaleString('es-CO'),
  }));

  const csv = toCSV(rows, columns);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="conversaciones-${Date.now()}.csv"`);
  res.send('﻿' + csv);
});

// Exportar mensajes CSV
router.get('/messages', authMiddleware, requireSuperAdmin, async (req, res) => {
  const { from, to, company_id } = req.query;

  let query = supabase
    .from('messages')
    .select('*, companies(name), conversations(user_phone)')
    .order('created_at', { ascending: false });

  if (from)       query = query.gte('created_at', new Date(from).toISOString());
  if (to)         query = query.lte('created_at', new Date(to + 'T23:59:59').toISOString());
  if (company_id) query = query.eq('company_id', company_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const columns = [
    { key: 'empresa',    label: 'Empresa' },
    { key: 'telefono',   label: 'Telefono' },
    { key: 'direccion',  label: 'Direccion' },
    { key: 'enviado_por', label: 'Enviado por' },
    { key: 'agente',     label: 'Agente' },
    { key: 'contenido',  label: 'Contenido' },
    { key: 'fecha',      label: 'Fecha' },
  ];

  const rows = (data || []).map(m => ({
    empresa:     m.companies?.name || '',
    telefono:    m.conversations?.user_phone || '',
    direccion:   m.direction === 'inbound' ? 'Entrante' : 'Saliente',
    enviado_por: m.sent_by,
    agente:      m.agent_name || '',
    contenido:   m.content,
    fecha:       new Date(m.created_at).toLocaleString('es-CO'),
  }));

  const csv = toCSV(rows, columns);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="mensajes-${Date.now()}.csv"`);
  res.send('﻿' + csv);
});

// Contar registros antes de exportar
router.get('/count', authMiddleware, requireSuperAdmin, async (req, res) => {
  const { from, to, company_id } = req.query;

  const baseFilter = (q) => {
    if (from)       q = q.gte('created_at', new Date(from).toISOString());
    if (to)         q = q.lte('created_at', new Date(to + 'T23:59:59').toISOString());
    if (company_id) q = q.eq('company_id', company_id);
    return q;
  };

  const [{ count: convs }, { count: msgs }] = await Promise.all([
    baseFilter(supabase.from('conversations').select('id', { count: 'exact', head: true })),
    baseFilter(supabase.from('messages').select('id', { count: 'exact', head: true })),
  ]);

  res.json({ conversations: convs || 0, messages: msgs || 0 });
});

module.exports = router;
