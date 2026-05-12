const express = require('express');
const supabase = require('../supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const companyId = req.query.company_id || req.user.company_id;
  if (!companyId) return res.status(400).json({ error: 'company_id requerido' });

  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('company_id', companyId)
    .order('shortcut', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', authMiddleware, async (req, res) => {
  const { shortcut, content, company_id } = req.body;
  if (!shortcut || !content) return res.status(400).json({ error: 'Atajo y contenido requeridos' });

  const targetCompanyId = company_id || req.user.company_id;
  if (!targetCompanyId) return res.status(400).json({ error: 'company_id requerido' });

  const { data, error } = await supabase
    .from('templates')
    .insert({ company_id: targetCompanyId, shortcut: shortcut.toLowerCase().trim(), content })
    .select()
    .single();

  if (error) return res.status(409).json({ error: 'Ese atajo ya existe para esta empresa' });
  res.status(201).json(data);
});

router.put('/:id', authMiddleware, async (req, res) => {
  const { shortcut, content } = req.body;

  const { data, error } = await supabase
    .from('templates')
    .update({ shortcut: shortcut?.toLowerCase().trim(), content })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const { error } = await supabase.from('templates').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
