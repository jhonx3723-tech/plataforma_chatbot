const express = require('express');
const supabase = require('../supabase');
const { authMiddleware, requireSuperAdmin, requireCompanyAdmin } = require('../middleware/auth');

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

// Dashboard de reportes para company_admin (y super_admin con company_id)
router.get('/admin/stats', authMiddleware, requireCompanyAdmin, async (req, res) => {
  const isSuper    = req.user.role === 'super_admin';
  const companyId  = isSuper ? req.query.company_id : req.user.company_id;
  if (!companyId)  return res.status(400).json({ error: 'company_id requerido' });

  const days   = Math.min(parseInt(req.query.period) || 30, 90);
  const from   = new Date();
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  const fromISO = from.toISOString();

  const [
    { data: recentConvs },
    { data: allConvs },
    { data: agentMsgs },
    { data: agents },
  ] = await Promise.all([
    supabase.from('conversations')
      .select('created_at, status')
      .eq('company_id', companyId)
      .gte('created_at', fromISO),
    supabase.from('conversations')
      .select('status')
      .eq('company_id', companyId),
    supabase.from('messages')
      .select('agent_name, sent_by, conversation_id')
      .eq('company_id', companyId)
      .eq('direction', 'outbound')
      .neq('sent_by', 'bot')
      .gte('created_at', fromISO),
    supabase.from('users')
      .select('id, username')
      .eq('company_id', companyId)
      .eq('role', 'company_agent'),
  ]);

  // Mapa de días
  const dayMap = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  (recentConvs || []).forEach(c => {
    const day = c.created_at.slice(0, 10);
    if (day in dayMap) dayMap[day]++;
  });

  // Por estado
  const byStatus = { open: 0, pending: 0, closed: 0, bot: 0 };
  (allConvs || []).forEach(c => {
    if (c.status in byStatus) byStatus[c.status]++;
  });

  const today      = new Date().toISOString().slice(0, 10);
  const todayCount = dayMap[today] || 0;

  // Por agente
  const agentMap = {};
  (agentMsgs || []).forEach(m => {
    const name = m.agent_name || m.sent_by || 'Sin nombre';
    if (!agentMap[name]) agentMap[name] = { messages: 0, convs: new Set() };
    agentMap[name].messages++;
    if (m.conversation_id) agentMap[name].convs.add(m.conversation_id);
  });
  const byAgent = Object.entries(agentMap)
    .map(([name, d]) => ({ name, messages: d.messages, conversations: d.convs.size }))
    .sort((a, b) => b.messages - a.messages)
    .slice(0, 10);

  res.json({
    totals:    { total: (allConvs || []).length, today: todayCount, ...byStatus },
    by_day:    Object.entries(dayMap).map(([date, count]) => ({ date, count })),
    by_status: byStatus,
    by_agent:  byAgent,
    agents:    (agents || []).map(a => ({ id: a.id, username: a.username })),
  });
});

module.exports = router;
