const express = require('express');
const supabase = require('../supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── Etapas predeterminadas (fallback en memoria) ───────────────────────────────
const DEFAULT_STAGES = [
  { id: '__nuevo',       name: 'Nuevo',       color: '#64748b', sort_order: 0, is_won: false, is_lost: false },
  { id: '__contactado',  name: 'Contactado',  color: '#3b82f6', sort_order: 1, is_won: false, is_lost: false },
  { id: '__propuesta',   name: 'Propuesta',   color: '#f59e0b', sort_order: 2, is_won: false, is_lost: false },
  { id: '__negociacion', name: 'Negociación', color: '#f97316', sort_order: 3, is_won: false, is_lost: false },
  { id: '__ganado',      name: 'Ganado',      color: '#10b981', sort_order: 4, is_won: true,  is_lost: false },
  { id: '__perdido',     name: 'Perdido',     color: '#ef4444', sort_order: 5, is_won: false, is_lost: true  },
];

// ── Seguridad: company_id siempre desde JWT para no-super_admin ───────────────
function resolveCompanyId(req) {
  if (req.user.role === 'super_admin') return req.query.company_id || null;
  return req.user.company_id;
}

// ── Sembrar etapas predeterminadas en BD (lazy seeding) ───────────────────────
async function seedDefaultStages(companyId) {
  const rows = DEFAULT_STAGES.map(s => ({
    company_id: companyId,
    name: s.name,
    color: s.color,
    sort_order: s.sort_order,
    is_won: s.is_won,
    is_lost: s.is_lost,
  }));
  await supabase
    .from('crm_stages')
    .upsert(rows, { onConflict: 'company_id,name' });
}

// ── Resolver crm_stage_id desde un ID (real UUID o fake __xxx) ────────────────
async function resolveStageId(companyId, idOrFake) {
  if (!idOrFake) return null;
  if (!String(idOrFake).startsWith('__')) return idOrFake;

  const NAME_MAP = {
    '__nuevo': 'Nuevo', '__contactado': 'Contactado',
    '__propuesta': 'Propuesta', '__negociacion': 'Negociación',
    '__ganado': 'Ganado', '__perdido': 'Perdido',
  };
  const name = NAME_MAP[idOrFake];
  if (!name) return null;

  let { data } = await supabase
    .from('crm_stages')
    .select('id')
    .eq('company_id', companyId)
    .ilike('name', name)
    .maybeSingle();

  if (!data) {
    await seedDefaultStages(companyId);
    ({ data } = await supabase
      .from('crm_stages')
      .select('id')
      .eq('company_id', companyId)
      .ilike('name', name)
      .maybeSingle());
  }
  return data?.id || null;
}

// ══════════════════════════════════════════════════════════════════════════════
// ETAPAS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/stages', authMiddleware, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'company_id requerido' });

  const { data, error } = await supabase
    .from('crm_stages')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data && data.length > 0 ? data : DEFAULT_STAGES);
});

router.post('/stages', authMiddleware, async (req, res) => {
  if (req.user.role === 'company_agent') return res.status(403).json({ error: 'Sin permiso' });

  const companyId = resolveCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'company_id requerido' });

  const { name, color = '#64748b', sort_order = 0, is_won = false, is_lost = false } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });

  const { data, error } = await supabase
    .from('crm_stages')
    .insert({ company_id: companyId, name: name.trim(), color, sort_order, is_won, is_lost })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/stages/:id', authMiddleware, async (req, res) => {
  if (req.user.role === 'company_agent') return res.status(403).json({ error: 'Sin permiso' });

  const companyId = resolveCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'company_id requerido' });

  const { name, color, sort_order, is_won, is_lost } = req.body;
  const patch = {};
  if (name       !== undefined) patch.name       = name.trim();
  if (color      !== undefined) patch.color      = color;
  if (sort_order !== undefined) patch.sort_order = sort_order;
  if (is_won     !== undefined) patch.is_won     = is_won;
  if (is_lost    !== undefined) patch.is_lost    = is_lost;

  const { data, error } = await supabase
    .from('crm_stages')
    .update(patch)
    .eq('id', req.params.id)
    .eq('company_id', companyId)
    .select()
    .single();

  if (error || !data) return res.status(404).json({ error: 'Etapa no encontrada' });

  if (patch.name) {
    await supabase
      .from('contacts')
      .update({ pipeline_stage: patch.name })
      .eq('crm_stage_id', req.params.id);
  }

  res.json(data);
});

router.delete('/stages/:id', authMiddleware, async (req, res) => {
  if (req.user.role === 'company_agent') return res.status(403).json({ error: 'Sin permiso' });

  const companyId = resolveCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'company_id requerido' });

  const { data: stage } = await supabase
    .from('crm_stages')
    .select('id')
    .eq('id', req.params.id)
    .eq('company_id', companyId)
    .maybeSingle();

  if (!stage) return res.status(404).json({ error: 'Etapa no encontrada' });

  await supabase
    .from('contacts')
    .update({ crm_stage_id: null, pipeline_stage: null, crm_entered_at: null })
    .eq('crm_stage_id', req.params.id);

  const { error } = await supabase.from('crm_stages').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

router.delete('/stages', authMiddleware, async (req, res) => {
  if (req.user.role === 'company_agent') return res.status(403).json({ error: 'Sin permiso' });

  const companyId = resolveCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'company_id requerido' });

  const { data: stageIds } = await supabase
    .from('crm_stages')
    .select('id')
    .eq('company_id', companyId);

  if (stageIds?.length) {
    await supabase
      .from('contacts')
      .update({ crm_stage_id: null, pipeline_stage: null, crm_entered_at: null })
      .in('crm_stage_id', stageIds.map(s => s.id));
  }

  await supabase.from('crm_stages').delete().eq('company_id', companyId);
  res.json(DEFAULT_STAGES);
});

// ══════════════════════════════════════════════════════════════════════════════
// PIPELINE
// ══════════════════════════════════════════════════════════════════════════════

router.get('/pipeline', authMiddleware, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'company_id requerido' });

  const { stage_id, agent_id, min_value, max_value, date_from, date_to } = req.query;

  let query = supabase
    .from('contacts')
    .select('id, name, phone, company_name, pipeline_stage, crm_stage_id, deal_value, expected_close_date, crm_notes, deal_assigned_to, crm_entered_at, updated_at')
    .eq('company_id', companyId)
    .not('crm_stage_id', 'is', null);

  if (stage_id)  query = query.eq('crm_stage_id', stage_id);
  if (agent_id)  query = query.eq('deal_assigned_to', agent_id);
  if (min_value) query = query.gte('deal_value', parseFloat(min_value));
  if (max_value) query = query.lte('deal_value', parseFloat(max_value));
  if (date_from) query = query.gte('expected_close_date', date_from);
  if (date_to)   query = query.lte('expected_close_date', date_to);

  query = query.order('updated_at', { ascending: false });

  const [{ data: contacts, error }, { data: allStages }, { data: agents }] = await Promise.all([
    query,
    supabase.from('crm_stages').select('id, name, color, sort_order, is_won, is_lost').eq('company_id', companyId),
    supabase.from('users').select('id, username').eq('company_id', companyId),
  ]);

  if (error) return res.status(500).json({ error: error.message });

  const stageMap = {};
  (allStages || DEFAULT_STAGES).forEach(s => { stageMap[s.id] = s; });

  const agentMap = {};
  (agents || []).forEach(a => { agentMap[a.id] = a.username; });

  const result = (contacts || []).map(c => ({
    ...c,
    stage_info: c.crm_stage_id ? (stageMap[c.crm_stage_id] || null) : null,
    agent_name: c.deal_assigned_to ? (agentMap[c.deal_assigned_to] || 'Desconocido') : null,
  }));

  res.json(result);
});

router.get('/pipeline/export', authMiddleware, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'company_id requerido' });

  const [{ data: contacts, error }, { data: allStages }, { data: agents }] = await Promise.all([
    supabase
      .from('contacts')
      .select('name, phone, company_name, pipeline_stage, crm_stage_id, deal_value, expected_close_date, crm_notes, deal_assigned_to, crm_entered_at, updated_at')
      .eq('company_id', companyId)
      .not('crm_stage_id', 'is', null)
      .order('pipeline_stage', { ascending: true }),
    supabase.from('crm_stages').select('id, name, color, sort_order').eq('company_id', companyId),
    supabase.from('users').select('id, username').eq('company_id', companyId),
  ]);

  if (error) return res.status(500).json({ error: error.message });

  const stageMap = {};
  (allStages || []).forEach(s => { stageMap[s.id] = s.name; });
  const agentMap = {};
  (agents || []).forEach(a => { agentMap[a.id] = a.username; });

  const esc    = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const fmtVal = v => v ? `$${Number(v).toLocaleString('es-CO')}` : '';
  const fmtDt  = v => v ? new Date(v).toLocaleDateString('es-CO') : '';
  const daysSince = v => v ? Math.floor((Date.now() - new Date(v)) / 86400000) : '';

  const rows = [
    ['Nombre','Teléfono','Empresa','Etapa','Valor','Cierre esperado','Días en CRM','Agente','Notas','Actualizado'].map(esc).join(','),
    ...(contacts || []).map(c => [
      c.name, c.phone, c.company_name,
      c.crm_stage_id ? (stageMap[c.crm_stage_id] || c.pipeline_stage) : c.pipeline_stage,
      fmtVal(c.deal_value), fmtDt(c.expected_close_date),
      daysSince(c.crm_entered_at),
      c.deal_assigned_to ? (agentMap[c.deal_assigned_to] || '') : '',
      c.crm_notes, fmtDt(c.updated_at),
    ].map(esc).join(',')),
  ];

  const today = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="pipeline-${today}.csv"`);
  res.send('﻿' + rows.join('\n'));
});

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVIDADES  /api/crm/activities
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/crm/activities/pending — tareas pendientes del usuario actual
router.get('/activities/pending', authMiddleware, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'company_id requerido' });

  const { data, error } = await supabase
    .from('crm_activities')
    .select('*, contact:contacts(id, name, phone)')
    .eq('company_id', companyId)
    .eq('type', 'task')
    .is('completed_at', null)
    .eq('user_id', req.user.id)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// GET /api/crm/activities?contact_id=xxx
router.get('/activities', authMiddleware, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'company_id requerido' });

  const { contact_id } = req.query;
  if (!contact_id) return res.status(400).json({ error: 'contact_id requerido' });

  const { data, error } = await supabase
    .from('crm_activities')
    .select('*, user:users(id, username)')
    .eq('company_id', companyId)
    .eq('contact_id', contact_id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// POST /api/crm/activities
router.post('/activities', authMiddleware, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'company_id requerido' });

  const { contact_id, type = 'note', title, description, due_date } = req.body;
  if (!contact_id) return res.status(400).json({ error: 'contact_id requerido' });
  if (!title?.trim()) return res.status(400).json({ error: 'Título requerido' });

  // Verificar que el contacto pertenece a la empresa
  const { data: contact } = await supabase
    .from('contacts').select('id').eq('id', contact_id).eq('company_id', companyId).maybeSingle();
  if (!contact) return res.status(404).json({ error: 'Contacto no encontrado' });

  const { data, error } = await supabase
    .from('crm_activities')
    .insert({
      company_id:  companyId,
      contact_id,
      user_id:     req.user.id,
      type:        type || 'note',
      title:       title.trim(),
      description: description?.trim() || null,
      due_date:    due_date || null,
    })
    .select('*, user:users(id, username)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/crm/activities/:id
router.put('/activities/:id', authMiddleware, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'company_id requerido' });

  const { data: existing } = await supabase
    .from('crm_activities').select('id, company_id').eq('id', req.params.id).maybeSingle();
  if (!existing) return res.status(404).json({ error: 'Actividad no encontrada' });
  if (req.user.role !== 'super_admin' && existing.company_id !== companyId)
    return res.status(403).json({ error: 'Sin permiso' });

  const { title, description, due_date, completed } = req.body;
  const patch = { updated_at: new Date().toISOString() };
  if (title       !== undefined) patch.title       = title.trim();
  if (description !== undefined) patch.description = description?.trim() || null;
  if (due_date    !== undefined) patch.due_date    = due_date || null;
  if (completed   !== undefined) patch.completed_at = completed ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from('crm_activities')
    .update(patch)
    .eq('id', req.params.id)
    .select('*, user:users(id, username)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/crm/activities/:id
router.delete('/activities/:id', authMiddleware, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'company_id requerido' });

  const { data: existing } = await supabase
    .from('crm_activities').select('id, company_id').eq('id', req.params.id).maybeSingle();
  if (!existing) return res.status(404).json({ error: 'Actividad no encontrada' });
  if (req.user.role !== 'super_admin' && existing.company_id !== companyId)
    return res.status(403).json({ error: 'Sin permiso' });

  const { error } = await supabase.from('crm_activities').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
