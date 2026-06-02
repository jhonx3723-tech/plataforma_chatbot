const express = require('express');
const multer  = require('multer');
const { parse } = require('csv-parse/sync');
const supabase = require('../supabase');
const { authMiddleware } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();

// ── Resolver company_id seguro (nunca desde query param para no-super_admin) ──
function resolveCompanyId(req, queryFallback = false) {
  if (req.user.role === 'super_admin') return req.query.company_id || null;
  return req.user.company_id;
}

// ── Resolver crm_stage_id (acepta UUID real o fake __xxx, siembra si no existe)
async function resolveStageId(companyId, idOrFake) {
  if (!idOrFake) return null;
  if (!String(idOrFake).startsWith('__')) return idOrFake; // UUID real

  const NAME_MAP = {
    '__nuevo': 'Nuevo', '__contactado': 'Contactado',
    '__propuesta': 'Propuesta', '__negociacion': 'Negociación',
    '__ganado': 'Ganado', '__perdido': 'Perdido',
  };
  const name = NAME_MAP[idOrFake];
  if (!name) return null;

  let { data } = await supabase
    .from('crm_stages').select('id')
    .eq('company_id', companyId).ilike('name', name).maybeSingle();

  if (!data) {
    // Sembrar etapas predeterminadas
    await supabase.from('crm_stages').upsert(
      [
        { company_id: companyId, name: 'Nuevo',       color: '#64748b', sort_order: 0, is_won: false, is_lost: false },
        { company_id: companyId, name: 'Contactado',  color: '#3b82f6', sort_order: 1, is_won: false, is_lost: false },
        { company_id: companyId, name: 'Propuesta',   color: '#f59e0b', sort_order: 2, is_won: false, is_lost: false },
        { company_id: companyId, name: 'Negociación', color: '#f97316', sort_order: 3, is_won: false, is_lost: false },
        { company_id: companyId, name: 'Ganado',      color: '#10b981', sort_order: 4, is_won: true,  is_lost: false },
        { company_id: companyId, name: 'Perdido',     color: '#ef4444', sort_order: 5, is_won: false, is_lost: true  },
      ],
      { onConflict: 'company_id,name' }
    );
    ({ data } = await supabase
      .from('crm_stages').select('id')
      .eq('company_id', companyId).ilike('name', name).maybeSingle());
  }
  return data?.id || null;
}

// ── GET / ─────────────────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  const companyId = resolveCompanyId(req);

  let query = supabase.from('contacts').select('*').order('name', { ascending: true, nullsFirst: false });
  if (companyId) query = query.eq('company_id', companyId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── GET /phone/:phone ─────────────────────────────────────────────────────────
router.get('/phone/:phone', authMiddleware, async (req, res) => {
  const companyId = resolveCompanyId(req) || req.query.company_id;

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('phone', req.params.phone)
    .eq('company_id', companyId)
    .single();

  if (error) return res.status(404).json({ error: 'Contacto no encontrado' });
  res.json(data);
});

// ── POST / — upsert por (company_id, phone) ───────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { phone, name, company_name, notes, company_id } = req.body;
  if (!phone) return res.status(400).json({ error: 'Teléfono requerido' });

  const targetCompanyId = req.user.role === 'super_admin'
    ? (company_id || req.user.company_id)
    : req.user.company_id;

  if (!targetCompanyId) return res.status(400).json({ error: 'company_id requerido' });

  const { data, error } = await supabase
    .from('contacts')
    .upsert({
      company_id:   targetCompanyId,
      phone,
      name:         name         || null,
      company_name: company_name || null,
      notes:        notes        || null,
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'company_id,phone' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── PUT /:id — actualiza contacto y campos CRM ────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  // 1. Verificar que el contacto existe y pertenece a la empresa del usuario
  const { data: existing, error: fetchErr } = await supabase
    .from('contacts')
    .select('id, company_id, crm_stage_id, crm_entered_at')
    .eq('id', req.params.id)
    .maybeSingle();

  if (fetchErr || !existing) return res.status(404).json({ error: 'Contacto no encontrado' });

  if (req.user.role !== 'super_admin' && existing.company_id !== req.user.company_id) {
    return res.status(403).json({ error: 'Sin permiso para modificar este contacto' });
  }

  const {
    name, company_name, notes,
    crm_stage_id,
    pipeline_stage,          // legacy, aceptado por compatibilidad
    deal_value,
    expected_close_date,
    crm_notes,
    deal_assigned_to,
  } = req.body;

  const patch = { updated_at: new Date().toISOString() };
  if (name         !== undefined) patch.name         = name;
  if (company_name !== undefined) patch.company_name = company_name;
  if (notes        !== undefined) patch.notes        = notes;
  if (deal_value          !== undefined) patch.deal_value          = deal_value;
  if (expected_close_date !== undefined) patch.expected_close_date = expected_close_date;
  if (crm_notes           !== undefined) patch.crm_notes           = crm_notes;
  if (deal_assigned_to    !== undefined) patch.deal_assigned_to    = deal_assigned_to || null;

  // ── Resolución de etapa CRM ────────────────────────────────────────────────
  if (crm_stage_id !== undefined || pipeline_stage !== undefined) {
    const rawId    = crm_stage_id !== undefined ? crm_stage_id : null;
    const compId   = existing.company_id;

    if (rawId === null && crm_stage_id !== undefined) {
      // Quitar del CRM
      patch.crm_stage_id   = null;
      patch.pipeline_stage = null;
      patch.crm_entered_at = null;
    } else if (rawId) {
      const resolvedId = await resolveStageId(compId, rawId);
      patch.crm_stage_id = resolvedId;

      // Sincronizar nombre legible
      if (resolvedId) {
        const { data: stageData } = await supabase
          .from('crm_stages').select('name').eq('id', resolvedId).maybeSingle();
        if (stageData) patch.pipeline_stage = stageData.name;
      }

      // Marcar cuándo entró al CRM (solo la primera vez)
      if (resolvedId && !existing.crm_stage_id && !existing.crm_entered_at) {
        patch.crm_entered_at = new Date().toISOString();
      }
    } else if (pipeline_stage !== undefined) {
      // Llegó solo el nombre (legacy)
      patch.pipeline_stage = pipeline_stage;
    }
  }

  const { data, error } = await supabase
    .from('contacts')
    .update(patch)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  // Verificar ownership
  const { data: existing } = await supabase
    .from('contacts').select('id, company_id').eq('id', req.params.id).maybeSingle();

  if (!existing) return res.status(404).json({ error: 'No encontrado' });
  if (req.user.role !== 'super_admin' && existing.company_id !== req.user.company_id) {
    return res.status(403).json({ error: 'Sin permiso' });
  }

  const { error } = await supabase.from('contacts').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ── GET /export — exportar contactos CSV ─────────────────────────────────────
router.get('/export', authMiddleware, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'company_id requerido' });

  const { data, error } = await supabase
    .from('contacts')
    .select('name, phone, company_name, notes, created_at')
    .eq('company_id', companyId)
    .order('name', { ascending: true, nullsFirst: false });

  if (error) return res.status(500).json({ error: error.message });

  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [
    ['Nombre', 'Teléfono', 'Empresa cliente', 'Notas', 'Fecha creación'].map(esc).join(','),
    ...(data || []).map(c => [
      c.name, c.phone, c.company_name, c.notes,
      c.created_at ? new Date(c.created_at).toLocaleDateString('es-CO') : '',
    ].map(esc).join(',')),
  ];

  const today = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="contactos-${today}.csv"`);
  res.send('﻿' + rows.join('\n'));
});

// ── GET /pipeline — legacy (redirige a /crm/pipeline) ────────────────────────
router.get('/pipeline', authMiddleware, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) return res.status(400).json({ error: 'company_id requerido' });

  const { data, error } = await supabase
    .from('contacts')
    .select('id, name, phone, company_name, pipeline_stage, crm_stage_id, deal_value, expected_close_date, crm_notes, deal_assigned_to, crm_entered_at, updated_at')
    .eq('company_id', companyId)
    .not('crm_stage_id', 'is', null)
    .order('updated_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ── POST /import — importación masiva CSV ──────────────────────────────────────
router.post('/import', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo CSV requerido' });

  const targetCompanyId = req.user.role === 'super_admin'
    ? (req.body.company_id || req.user.company_id)
    : req.user.company_id;
  if (!targetCompanyId) return res.status(400).json({ error: 'company_id requerido' });

  // Parsear CSV
  let records;
  try {
    records = parse(req.file.buffer.toString('utf-8'), {
      columns:            true,
      skip_empty_lines:   true,
      trim:               true,
      relax_column_count: true,
      bom:                true,
    });
  } catch (err) {
    return res.status(400).json({ error: 'CSV inválido: ' + err.message });
  }

  if (!records.length) return res.status(400).json({ error: 'El archivo está vacío' });

  // Mapeo de columnas (enviado desde frontend como JSON string) o auto-detect
  let colMap = req.body.mapping ? JSON.parse(req.body.mapping) : null;
  if (!colMap) {
    const keys = Object.keys(records[0]);
    colMap = {
      phone:        keys.find(k => /tel[eé]?fono|phone|celular|m[oó]vil|cel|whatsapp/i.test(k)),
      name:         keys.find(k => /^nombre$|^name$/i.test(k)),
      company_name: keys.find(k => /empresa|company/i.test(k)),
      notes:        keys.find(k => /notas|notes/i.test(k)),
    };
  }

  if (!colMap.phone) {
    return res.status(400).json({
      error: 'No se detectó columna de teléfono',
      columns: Object.keys(records[0]),
      hint: 'Envía "mapping" con { phone: "nombre_columna" }',
    });
  }

  const errors = [];
  const batch  = [];

  records.forEach((row, i) => {
    const rawPhone = String(row[colMap.phone] || '').replace(/\D/g, '').trim();
    if (!rawPhone || rawPhone.length < 7) {
      errors.push({ row: i + 2, value: row[colMap.phone], reason: 'Teléfono inválido o vacío' });
      return;
    }
    batch.push({
      company_id:   targetCompanyId,
      phone:        rawPhone,
      name:         colMap.name         ? (row[colMap.name]?.trim()         || null) : null,
      company_name: colMap.company_name ? (row[colMap.company_name]?.trim() || null) : null,
      notes:        colMap.notes        ? (row[colMap.notes]?.trim()        || null) : null,
      updated_at:   new Date().toISOString(),
    });
  });

  let imported = 0;
  if (batch.length) {
    // Upsert en chunks de 500 para evitar límites
    for (let i = 0; i < batch.length; i += 500) {
      const chunk = batch.slice(i, i + 500);
      const { error } = await supabase
        .from('contacts')
        .upsert(chunk, { onConflict: 'company_id,phone' });
      if (error) return res.status(500).json({ error: error.message });
      imported += chunk.length;
    }
  }

  res.json({
    total:    records.length,
    imported,
    skipped:  errors.length,
    errors:   errors.slice(0, 20),
    columns:  Object.keys(records[0]),
  });
});

module.exports = router;
