const express = require('express');
const supabase = require('../supabase');
const { authMiddleware, requireCompanyAdmin } = require('../middleware/auth');

const router = express.Router();

// Cualquier usuario autenticado puede ver las etiquetas de su empresa
router.get('/', authMiddleware, async (req, res) => {
  const companyId = req.query.company_id || req.user.company_id;
  if (!companyId) return res.status(400).json({ error: 'company_id requerido' });

  const { data, error } = await supabase
    .from('labels')
    .select('*')
    .eq('company_id', companyId)
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Solo company_admin y super_admin pueden crear etiquetas
router.post('/', authMiddleware, requireCompanyAdmin, async (req, res) => {
  const { name, color, company_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  const targetCompanyId = req.user.role === 'super_admin'
    ? (company_id || req.user.company_id)
    : req.user.company_id;

  // Verificar duplicado manualmente
  const { data: existing } = await supabase
    .from('labels')
    .select('id')
    .eq('company_id', targetCompanyId)
    .ilike('name', name.trim())
    .limit(1);
  if (existing?.length) return res.status(409).json({ error: 'Ya existe una etiqueta con ese nombre' });

  const { data, error } = await supabase
    .from('labels')
    .insert({ company_id: targetCompanyId, name: name.trim(), color: color || '#f97316' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Solo company_admin y super_admin pueden editar etiquetas
router.put('/:id', authMiddleware, requireCompanyAdmin, async (req, res) => {
  const { name, color } = req.body;

  const { data: label } = await supabase
    .from('labels').select('company_id').eq('id', req.params.id).single();
  if (!label) return res.status(404).json({ error: 'Etiqueta no encontrada' });

  if (req.user.role === 'company_admin' && label.company_id !== req.user.company_id)
    return res.status(403).json({ error: 'Sin permiso' });

  const updates = {};
  if (name)  updates.name  = name.trim();
  if (color) updates.color = color;

  const { data, error } = await supabase
    .from('labels').update(updates).eq('id', req.params.id).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Solo company_admin y super_admin pueden eliminar etiquetas
router.delete('/:id', authMiddleware, requireCompanyAdmin, async (req, res) => {
  const { data: label } = await supabase
    .from('labels').select('company_id').eq('id', req.params.id).single();
  if (!label) return res.status(404).json({ error: 'Etiqueta no encontrada' });

  if (req.user.role === 'company_admin' && label.company_id !== req.user.company_id)
    return res.status(403).json({ error: 'Sin permiso' });

  const { error } = await supabase.from('labels').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Agregar etiqueta a conversación (cualquier agente)
router.post('/conversation/:convId', authMiddleware, async (req, res) => {
  const { label_id } = req.body;
  const { data: conv } = await supabase
    .from('conversations').select('label_ids').eq('id', req.params.convId).single();
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });

  const current = conv.label_ids || [];
  if (current.includes(label_id)) return res.json({ label_ids: current });

  const { data, error } = await supabase
    .from('conversations')
    .update({ label_ids: [...current, label_id] })
    .eq('id', req.params.convId)
    .select('label_ids')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Quitar etiqueta de conversación (cualquier agente)
router.delete('/conversation/:convId/:labelId', authMiddleware, async (req, res) => {
  const { data: conv } = await supabase
    .from('conversations').select('label_ids').eq('id', req.params.convId).single();
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });

  const updated = (conv.label_ids || []).filter(id => id !== req.params.labelId);
  const { data, error } = await supabase
    .from('conversations')
    .update({ label_ids: updated })
    .eq('id', req.params.convId)
    .select('label_ids')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
