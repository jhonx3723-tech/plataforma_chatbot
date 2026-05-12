const express = require('express');
const supabase = require('../supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const companyId = req.query.company_id ||
    (req.user.role !== 'super_admin' ? req.user.company_id : null);

  let query = supabase.from('contacts').select('*').order('name', { ascending: true, nullsFirst: false });
  if (companyId) query = query.eq('company_id', companyId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/phone/:phone', authMiddleware, async (req, res) => {
  const companyId = req.query.company_id || req.user.company_id;

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('phone', req.params.phone)
    .eq('company_id', companyId)
    .single();

  if (error) return res.status(404).json({ error: 'Contacto no encontrado' });
  res.json(data);
});

// Upsert — crea o actualiza por company_id + phone
router.post('/', authMiddleware, async (req, res) => {
  const { phone, name, company_name, notes, company_id } = req.body;
  if (!phone) return res.status(400).json({ error: 'Teléfono requerido' });

  const targetCompanyId = company_id || req.user.company_id;
  if (!targetCompanyId) return res.status(400).json({ error: 'company_id requerido' });

  const { data, error } = await supabase
    .from('contacts')
    .upsert({
      company_id:   targetCompanyId,
      phone,
      name:         name        || null,
      company_name: company_name || null,
      notes:        notes       || null,
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'company_id,phone' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', authMiddleware, async (req, res) => {
  const { name, company_name, notes } = req.body;

  const { data, error } = await supabase
    .from('contacts')
    .update({ name, company_name, notes, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const { error } = await supabase.from('contacts').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
