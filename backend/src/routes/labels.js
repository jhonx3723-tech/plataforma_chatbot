const express = require('express');
const supabase = require('../supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

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

router.post('/', authMiddleware, async (req, res) => {
  const { name, color, company_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  const targetCompanyId = company_id || req.user.company_id;

  const { data, error } = await supabase
    .from('labels')
    .insert({ company_id: targetCompanyId, name: name.trim(), color: color || '#f97316' })
    .select()
    .single();

  if (error) return res.status(409).json({ error: 'Esa etiqueta ya existe' });
  res.status(201).json(data);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const { error } = await supabase.from('labels').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Agregar etiqueta a conversación
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

// Quitar etiqueta de conversación
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
