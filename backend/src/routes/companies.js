const express = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../supabase');
const { authMiddleware, requireSuperAdmin, requireCompanyAdmin } = require('../middleware/auth');
const { getWAProfile, updateWAProfile } = require('../services/whatsapp');

const router = express.Router();

const DEFAULT_BUSINESS_HOURS = {
  enabled: false,
  timezone: 'America/Bogota',
  schedule: {
    '1': { open: true,  from: '08:00', to: '18:00' },
    '2': { open: true,  from: '08:00', to: '18:00' },
    '3': { open: true,  from: '08:00', to: '18:00' },
    '4': { open: true,  from: '08:00', to: '18:00' },
    '5': { open: true,  from: '08:00', to: '18:00' },
    '6': { open: false, from: '08:00', to: '13:00' },
    '0': { open: false, from: '08:00', to: '18:00' },
  },
  closed_message: 'Hola 👋 En este momento estamos fuera de horario de atención. Te responderemos a la brevedad. ¡Gracias por tu paciencia!',
};

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'Empresa no encontrada' });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { name, phone, whatsapp_phone_id, whatsapp_token, business_hours } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Nombre y teléfono son requeridos' });

  const { count } = await supabase
    .from('companies').select('id', { count: 'exact', head: true });
  if (count >= 50) return res.status(429).json({ error: 'Límite de 50 empresas alcanzado' });

  const { data: existing } = await supabase
    .from('companies').select('id').eq('phone', phone).limit(1);
  if (existing?.length) return res.status(409).json({ error: 'Ese número ya está registrado' });

  const { data, error } = await supabase
    .from('companies')
    .insert({
      name,
      phone,
      whatsapp_phone_id:    whatsapp_phone_id || null,
      whatsapp_token:       whatsapp_token    || null,
      webhook_verify_token: uuidv4().replace(/-/g, ''),
      business_hours:       business_hours    || DEFAULT_BUSINESS_HOURS,
      active:               1,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', async (req, res) => {
  const { data: company, error: fetchErr } = await supabase
    .from('companies').select('*').eq('id', req.params.id).single();
  if (fetchErr) return res.status(404).json({ error: 'Empresa no encontrada' });

  const { name, phone, whatsapp_phone_id, whatsapp_token, active, business_hours } = req.body;

  const { data, error } = await supabase
    .from('companies')
    .update({
      name:              name              ?? company.name,
      phone:             phone             ?? company.phone,
      whatsapp_phone_id: whatsapp_phone_id !== undefined ? whatsapp_phone_id : company.whatsapp_phone_id,
      whatsapp_token:    whatsapp_token    !== undefined ? whatsapp_token    : company.whatsapp_token,
      active:            active            !== undefined ? (active ? 1 : 0)  : company.active,
      business_hours:    business_hours    !== undefined ? business_hours    : (company.business_hours || DEFAULT_BUSINESS_HOURS),
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('companies').delete().eq('id', req.params.id);
  if (error) return res.status(404).json({ error: 'Empresa no encontrada' });
  res.json({ success: true });
});

// ── Toggle CRM (solo super_admin) ─────────────────────────────────────────────
router.patch('/:id/toggle-crm', requireSuperAdmin, async (req, res) => {
  const { data: company } = await supabase
    .from('companies').select('crm_enabled').eq('id', req.params.id).single();
  if (!company) return res.status(404).json({ error: 'Empresa no encontrada' });

  const { data, error } = await supabase
    .from('companies')
    .update({ crm_enabled: !company.crm_enabled })
    .eq('id', req.params.id)
    .select('id, crm_enabled')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Follow-up config (company_admin gestiona su propia empresa) ───────────────
router.get('/my/follow-up', authMiddleware, requireCompanyAdmin, async (req, res) => {
  const companyId = req.user.company_id;
  if (!companyId) return res.status(400).json({ error: 'Sin empresa asignada' });
  const { data, error } = await supabase
    .from('companies').select('follow_up_config').eq('id', companyId).single();
  if (error) return res.status(404).json({ error: 'Empresa no encontrada' });
  res.json(data.follow_up_config || {});
});

router.put('/my/follow-up', authMiddleware, requireCompanyAdmin, async (req, res) => {
  const companyId = req.user.company_id;
  if (!companyId) return res.status(400).json({ error: 'Sin empresa asignada' });
  const { enabled, hours, action, message } = req.body;
  const config = { enabled: !!enabled, hours: Math.max(1, parseInt(hours) || 2), action: action || 'note', message: message || '' };
  const { data, error } = await supabase
    .from('companies').update({ follow_up_config: config }).eq('id', companyId).select('follow_up_config').single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.follow_up_config);
});

// ── Perfil público de WhatsApp Business ───────────────────────────────────────
router.get('/:id/wa-profile', authMiddleware, requireSuperAdmin, async (req, res) => {
  const { data: company } = await supabase
    .from('companies').select('whatsapp_phone_id, whatsapp_token').eq('id', req.params.id).single();
  if (!company) return res.status(404).json({ error: 'Empresa no encontrada' });
  if (!company.whatsapp_phone_id || !company.whatsapp_token)
    return res.status(400).json({ error: 'La empresa no tiene credenciales de WhatsApp configuradas' });

  try {
    const profile = await getWAProfile(company.whatsapp_phone_id, company.whatsapp_token);
    res.json(profile);
  } catch (e) {
    const msg = e?.response?.data?.error?.message || e.message;
    res.status(502).json({ error: msg });
  }
});

router.put('/:id/wa-profile', authMiddleware, requireSuperAdmin, async (req, res) => {
  const { data: company } = await supabase
    .from('companies').select('whatsapp_phone_id, whatsapp_token').eq('id', req.params.id).single();
  if (!company) return res.status(404).json({ error: 'Empresa no encontrada' });
  if (!company.whatsapp_phone_id || !company.whatsapp_token)
    return res.status(400).json({ error: 'La empresa no tiene credenciales de WhatsApp configuradas' });

  const { about, description, address, email, websites, vertical } = req.body;
  const patch = {};
  if (about       !== undefined) patch.about       = about;
  if (description !== undefined) patch.description = description;
  if (address     !== undefined) patch.address     = address;
  if (email       !== undefined) patch.email       = email;
  if (websites    !== undefined) patch.websites    = websites;
  if (vertical    !== undefined) patch.vertical    = vertical;

  try {
    await updateWAProfile(company.whatsapp_phone_id, company.whatsapp_token, patch);
    res.json({ success: true });
  } catch (e) {
    const msg = e?.response?.data?.error?.message || e.message;
    res.status(502).json({ error: msg });
  }
});

module.exports = router;
