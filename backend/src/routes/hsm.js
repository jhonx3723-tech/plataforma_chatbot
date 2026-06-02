const express = require('express');
const supabase = require('../supabase');
const { authMiddleware, requireCompanyAdmin } = require('../middleware/auth');

const router = express.Router();

// Obtener WABA ID de la empresa
router.get('/waba-id', authMiddleware, async (req, res) => {
  const { data: company } = await supabase
    .from('companies')
    .select('whatsapp_waba_id')
    .eq('id', req.user.company_id)
    .single();
  res.json({ waba_id: company?.whatsapp_waba_id || null });
});

// Guardar WABA ID de la empresa (company_admin)
router.put('/waba-id', authMiddleware, requireCompanyAdmin, async (req, res) => {
  const { waba_id } = req.body;
  const { error } = await supabase
    .from('companies')
    .update({ whatsapp_waba_id: waba_id?.trim() || null })
    .eq('id', req.user.company_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// Obtener plantillas APROBADAS desde Meta
router.get('/', authMiddleware, async (req, res) => {
  const companyId = req.user.company_id || req.query.company_id;

  const { data: company } = await supabase
    .from('companies')
    .select('whatsapp_waba_id, whatsapp_token')
    .eq('id', companyId)
    .single();

  if (!company?.whatsapp_waba_id)
    return res.status(400).json({ error: 'WABA ID no configurado. Configúralo en Panel Admin → WhatsApp HSM.' });
  if (!company?.whatsapp_token)
    return res.status(400).json({ error: 'Token de WhatsApp no configurado.' });

  try {
    const url = `https://graph.facebook.com/v18.0/${company.whatsapp_waba_id}/message_templates?fields=name,status,category,language,components&limit=200`;
    const resp = await fetch(url, {
      headers: { 'Authorization': `Bearer ${company.whatsapp_token}` },
    });

    const data = await resp.json();
    if (!resp.ok)
      return res.status(400).json({ error: data.error?.message || 'Error al conectar con Meta' });

    const approved = (data.data || []).filter(t => t.status === 'APPROVED');
    res.json(approved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar plantilla HSM a una conversación
router.post('/send/:conversationId', authMiddleware, async (req, res) => {
  const { templateName, languageCode, components, previewText } = req.body;
  if (!templateName) return res.status(400).json({ error: 'templateName requerido' });

  const { data: conv } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', req.params.conversationId)
    .single();
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });

  const { data: company } = await supabase
    .from('companies')
    .select('whatsapp_phone_id, whatsapp_token')
    .eq('id', conv.company_id)
    .single();

  if (!company?.whatsapp_phone_id || !company?.whatsapp_token)
    return res.status(400).json({ error: 'WhatsApp no configurado en esta empresa' });

  // Enviar via Meta API
  const resp = await fetch(`https://graph.facebook.com/v18.0/${company.whatsapp_phone_id}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${company.whatsapp_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: conv.user_phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode || 'es' },
        components: components || [],
      },
    }),
  });

  const metaData = await resp.json();
  if (!resp.ok)
    return res.status(400).json({ error: metaData.error?.message || 'Error al enviar plantilla' });

  const content = previewText || `[Plantilla HSM: ${templateName}]`;

  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conv.id,
      company_id:      conv.company_id,
      direction:       'outbound',
      content,
      sent_by:         'agent',
      agent_name:      req.user.username,
      read:            true,
      is_note:         false,
    })
    .select()
    .single();

  if (msgErr) return res.status(500).json({ error: msgErr.message });

  // Actualizar conversación
  await supabase
    .from('conversations')
    .update({
      status:          'human',
      last_message:    content,
      last_message_at: new Date().toISOString(),
      assigned_to:     conv.assigned_to || req.user.id,
    })
    .eq('id', conv.id);

  res.json(msg);
});

module.exports = router;
