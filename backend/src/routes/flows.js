const express = require('express');
const supabase = require('../supabase');
const { authMiddleware } = require('../middleware/auth');
const { stepFlow } = require('../services/flowEngine');

const router = express.Router();

router.get('/company/:companyId', async (req, res) => {
  const { data, error } = await supabase
    .from('flows')
    .select('*')
    .eq('company_id', req.params.companyId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('flows').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Flujo no encontrado' });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { company_id, name, nodes, edges } = req.body;
  if (!company_id || !name)
    return res.status(400).json({ error: 'company_id y name son requeridos' });

  const { data, error } = await supabase
    .from('flows')
    .insert({ company_id, name, nodes: nodes || [], edges: edges || [], active: 0 })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', async (req, res) => {
  const { data: flow, error: fetchErr } = await supabase
    .from('flows').select('*').eq('id', req.params.id).single();
  if (fetchErr) return res.status(404).json({ error: 'Flujo no encontrado' });

  const { name, nodes, edges, active } = req.body;

  if (active) {
    await supabase.from('flows').update({ active: 0 }).eq('company_id', flow.company_id);
  }

  const { data, error } = await supabase
    .from('flows')
    .update({
      name:       name       ?? flow.name,
      nodes:      nodes      !== undefined ? nodes : flow.nodes,
      edges:      edges      !== undefined ? edges : flow.edges,
      active:     active     !== undefined ? (active ? 1 : 0) : flow.active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('flows').delete().eq('id', req.params.id);
  if (error) return res.status(404).json({ error: 'Flujo no encontrado' });
  res.json({ success: true });
});

// ── POST /:id/simulate — simulador del bot sin WhatsApp ───────────────────────
router.post('/:id/simulate', authMiddleware, async (req, res) => {
  const { data: flow, error } = await supabase
    .from('flows').select('nodes, edges').eq('id', req.params.id).single();
  if (error || !flow) return res.status(404).json({ error: 'Flow no encontrado' });

  const { message = '', state = {} } = req.body;

  try {
    const result = stepFlow({
      nodes:         flow.nodes || [],
      edges:         flow.edges || [],
      currentNodeId: state.currentNodeId ?? null,
      variables:     state.variables     ?? {},
      userMessage:   message,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
