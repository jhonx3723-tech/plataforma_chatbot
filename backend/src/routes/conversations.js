const express = require('express');
const supabase = require('../supabase');
const { authMiddleware } = require('../middleware/auth');
const { sendText } = require('../services/whatsapp');

const router = express.Router();

// ── Agentes disponibles para asignar (antes de /:id para no colisionar) ───────
router.get('/agents', authMiddleware, async (req, res) => {
  const companyId = req.user.role === 'super_admin'
    ? req.query.company_id
    : req.user.company_id;

  if (!companyId) return res.status(400).json({ error: 'company_id requerido' });

  const { data, error } = await supabase
    .from('users')
    .select('id, username, role')
    .eq('company_id', companyId)
    .eq('active', true)
    .neq('role', 'super_admin');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ── Listado de conversaciones ─────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  let query = supabase
    .from('conversations')
    .select('*, companies(name)')
    .order('last_message_at', { ascending: false });

  if (req.user.role === 'company_agent') {
    query = query.eq('company_id', req.user.company_id);
  } else if (req.query.company_id) {
    query = query.eq('company_id', req.query.company_id);
  }

  const { data: convs, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Mensajes no leídos
  const convIds = convs.map(c => c.id);
  let unreadMap = {};
  if (convIds.length) {
    const { data: unread } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convIds)
      .eq('direction', 'inbound')
      .eq('read', false);
    (unread || []).forEach(m => {
      unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
    });
  }

  // Nombres de contactos
  let contactMap = {};
  if (convs.length) {
    const companyIds = [...new Set(convs.map(c => c.company_id))];
    const { data: contacts } = await supabase
      .from('contacts').select('company_id, phone, name').in('company_id', companyIds);
    (contacts || []).forEach(ct => {
      if (ct.name) contactMap[`${ct.company_id}:${ct.phone}`] = ct.name;
    });
  }

  // Agentes asignados (batch)
  let agentMap = {};
  const assignedIds = [...new Set(convs.map(c => c.assigned_to).filter(Boolean))];
  if (assignedIds.length) {
    const { data: agents } = await supabase
      .from('users')
      .select('id, username')
      .in('id', assignedIds);
    (agents || []).forEach(a => { agentMap[a.id] = a.username; });
  }

  res.json(convs.map(c => ({
    ...c,
    company_name:       c.companies?.name || '—',
    contact_name:       contactMap[`${c.company_id}:${c.user_phone}`] || null,
    assigned_agent_name: c.assigned_to ? (agentMap[c.assigned_to] || null) : null,
    unread:             unreadMap[c.id] || 0,
  })));
});

// ── Detalle de conversación ───────────────────────────────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  const { data: conv, error } = await supabase
    .from('conversations')
    .select('*, companies(name)')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'Conversación no encontrada' });

  if (req.user.role === 'company_agent' && conv.company_id !== req.user.company_id)
    return res.status(403).json({ error: 'Sin acceso' });

  await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conv.id)
    .eq('direction', 'inbound');

  const [{ data: messages }, { data: contact }, { data: assignedAgent }] = await Promise.all([
    supabase.from('messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: true }),
    supabase.from('contacts').select('name').eq('company_id', conv.company_id).eq('phone', conv.user_phone).single(),
    conv.assigned_to
      ? supabase.from('users').select('id, username').eq('id', conv.assigned_to).single()
      : Promise.resolve({ data: null }),
  ]);

  res.json({
    ...conv,
    company_name:        conv.companies?.name,
    contact_name:        contact?.name || null,
    assigned_agent_name: assignedAgent?.username || null,
    messages:            messages || [],
  });
});

// ── Responder ─────────────────────────────────────────────────────────────────
router.post('/:id/reply', authMiddleware, async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Mensaje requerido' });

  const { data: conv, error: convErr } = await supabase
    .from('conversations').select('*').eq('id', req.params.id).single();
  if (convErr) return res.status(404).json({ error: 'Conversación no encontrada' });

  if (req.user.role === 'company_agent' && conv.company_id !== req.user.company_id)
    return res.status(403).json({ error: 'Sin acceso' });

  const { data: company } = await supabase
    .from('companies')
    .select('whatsapp_phone_id, whatsapp_token')
    .eq('id', conv.company_id)
    .single();

  if (company?.whatsapp_phone_id && company?.whatsapp_token) {
    try {
      await sendText(company.whatsapp_phone_id, company.whatsapp_token, conv.user_phone, message.trim());
    } catch (e) {
      console.error('Error enviando WhatsApp:', e.message);
    }
  }

  const now = new Date().toISOString();
  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conv.id,
      company_id:      conv.company_id,
      direction:       'outbound',
      content:         message.trim(),
      sent_by:         'agent',
      agent_name:      req.user.username,
      read:            true,
      is_note:         false,
    })
    .select()
    .single();

  if (msgErr) return res.status(500).json({ error: msgErr.message });

  await supabase
    .from('conversations')
    .update({ last_message: message.trim(), last_message_at: now, status: 'human' })
    .eq('id', conv.id);

  res.status(201).json(msg);
});

// ── Nota interna ──────────────────────────────────────────────────────────────
router.post('/:id/note', authMiddleware, async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Contenido requerido' });

  const { data: conv, error: convErr } = await supabase
    .from('conversations').select('*').eq('id', req.params.id).single();
  if (convErr) return res.status(404).json({ error: 'Conversación no encontrada' });

  if (req.user.role === 'company_agent' && conv.company_id !== req.user.company_id)
    return res.status(403).json({ error: 'Sin acceso' });

  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conv.id,
      company_id:      conv.company_id,
      direction:       'outbound',
      content:         content.trim(),
      sent_by:         'agent',
      agent_name:      req.user.username,
      read:            true,
      is_note:         true,
    })
    .select()
    .single();

  if (msgErr) return res.status(500).json({ error: msgErr.message });
  res.status(201).json(msg);
});

// ── Asignar agente ────────────────────────────────────────────────────────────
router.put('/:id/assign', authMiddleware, async (req, res) => {
  const { user_id } = req.body; // null = desasignar

  const { data: conv, error } = await supabase
    .from('conversations').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Conversación no encontrada' });

  if (req.user.role === 'company_agent' && conv.company_id !== req.user.company_id)
    return res.status(403).json({ error: 'Sin acceso' });

  let agentName = null;
  if (user_id) {
    const { data: agent } = await supabase
      .from('users').select('id, username').eq('id', user_id).single();
    if (!agent) return res.status(404).json({ error: 'Agente no encontrado' });
    agentName = agent.username;
  }

  const { data: updated } = await supabase
    .from('conversations')
    .update({ assigned_to: user_id || null })
    .eq('id', conv.id)
    .select()
    .single();

  res.json({ ...updated, assigned_agent_name: agentName });
});

// ── Reiniciar bot ─────────────────────────────────────────────────────────────
router.post('/:id/restart-bot', authMiddleware, async (req, res) => {
  const { data: conv, error } = await supabase
    .from('conversations').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Conversación no encontrada' });

  if (req.user.role === 'company_agent' && conv.company_id !== req.user.company_id)
    return res.status(403).json({ error: 'Sin acceso' });

  await supabase
    .from('sessions')
    .delete()
    .eq('company_id', conv.company_id)
    .eq('user_phone', conv.user_phone);

  const { data: updated } = await supabase
    .from('conversations')
    .update({ status: 'bot' })
    .eq('id', conv.id)
    .select().single();

  res.json(updated);
});

// ── Cambiar estado ────────────────────────────────────────────────────────────
router.put('/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body;
  if (!['bot', 'human', 'closed'].includes(status))
    return res.status(400).json({ error: 'Status inválido: bot | human | closed' });

  const { data: conv, error } = await supabase
    .from('conversations').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Conversación no encontrada' });

  if (req.user.role === 'company_agent' && conv.company_id !== req.user.company_id)
    return res.status(403).json({ error: 'Sin acceso' });

  if (status === 'closed') {
    await supabase
      .from('sessions')
      .delete()
      .eq('company_id', conv.company_id)
      .eq('user_phone', conv.user_phone);
  }

  const { data: updated } = await supabase
    .from('conversations')
    .update({ status })
    .eq('id', conv.id)
    .select()
    .single();

  res.json(updated);
});

module.exports = router;
