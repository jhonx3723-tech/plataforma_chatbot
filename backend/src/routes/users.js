const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../supabase');
const { authMiddleware, requireSuperAdmin, requireCompanyAdmin } = require('../middleware/auth');

const router = express.Router();

// Super admin: todos los usuarios (sin super_admins)
router.get('/', authMiddleware, requireSuperAdmin, async (req, res) => {
  const { data: users, error } = await supabase
    .from('users')
    .select('*, companies(name)')
    .neq('role', 'super_admin');

  if (error) return res.status(500).json({ error: error.message });

  res.json(users.map(u => ({
    id:           u.id,
    username:     u.username,
    email:        u.email        || null,
    role:         u.role,
    active:       u.active,
    company_id:   u.company_id   || null,
    company_name: u.companies?.name || null,
    created_at:   u.created_at,
  })));
});

// Company admin: solo sus agentes
router.get('/my-agents', authMiddleware, requireCompanyAdmin, async (req, res) => {
  const companyId = req.user.role === 'super_admin'
    ? req.query.company_id
    : req.user.company_id;
  if (!companyId) return res.status(400).json({ error: 'company_id requerido' });

  const { data: users, error } = await supabase
    .from('users')
    .select('id, username, email, active, role, availability_status, created_at')
    .eq('company_id', companyId)
    .eq('role', 'company_agent')
    .order('created_at');

  if (error) return res.status(500).json({ error: error.message });
  res.json(users);
});

// Crear usuario — super_admin puede crear company_admin y company_agent; company_admin solo puede crear agentes de su empresa
router.post('/', authMiddleware, async (req, res) => {
  const caller = req.user;
  const { username, email, password, company_id, role = 'company_agent' } = req.body;

  if (!['super_admin', 'company_admin'].includes(caller.role))
    return res.status(403).json({ error: 'Sin permiso' });

  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  if (password.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  const allowedRoles = caller.role === 'super_admin'
    ? ['company_agent', 'company_admin']
    : ['company_agent'];
  if (!allowedRoles.includes(role))
    return res.status(400).json({ error: 'Rol inválido' });

  const targetCompany = caller.role === 'super_admin' ? company_id : caller.company_id;
  if (!targetCompany) return res.status(400).json({ error: 'Empresa requerida' });

  const { data: company } = await supabase
    .from('companies').select('id').eq('id', targetCompany).single();
  if (!company) return res.status(404).json({ error: 'Empresa no encontrada' });

  const { data: dupUser } = await supabase
    .from('users').select('id').eq('username', username.toLowerCase().trim()).limit(1);
  if (dupUser?.length) return res.status(409).json({ error: 'Ese nombre de usuario ya existe' });

  if (email) {
    const { data: dupEmail } = await supabase
      .from('users').select('id').eq('email', email.toLowerCase().trim()).limit(1);
    if (dupEmail?.length) return res.status(409).json({ error: 'Ese correo ya está registrado' });
  }

  if (role === 'company_admin') {
    const { data: existing } = await supabase
      .from('users').select('id').eq('company_id', targetCompany).eq('role', 'company_admin').limit(1);
    if (existing?.length) return res.status(409).json({ error: 'Esta empresa ya tiene un administrador asignado' });
  }

  if (role === 'company_agent') {
    const { data: existing } = await supabase
      .from('users').select('id').eq('company_id', targetCompany).eq('role', 'company_agent');
    if ((existing?.length || 0) >= 10)
      return res.status(409).json({ error: 'Esta empresa ya tiene el máximo de 10 agentes' });
  }

  const { data, error } = await supabase
    .from('users')
    .insert({
      username:   username.toLowerCase().trim(),
      email:      email ? email.toLowerCase().trim() : null,
      password:   await bcrypt.hash(password, 10),
      role,
      company_id: targetCompany,
      active:     true,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  const { password: _, ...clean } = data;
  res.status(201).json(clean);
});

// Restablecer contraseña — super_admin cualquiera, company_admin solo sus agentes
router.put('/:id/password', authMiddleware, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6)
    return res.status(400).json({ error: 'Mínimo 6 caracteres' });

  const { data: user } = await supabase
    .from('users').select('id, company_id, role').eq('id', req.params.id).single();
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (req.user.role === 'company_admin') {
    if (user.company_id !== req.user.company_id || user.role !== 'company_agent')
      return res.status(403).json({ error: 'Sin permiso' });
  } else if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Sin permiso' });
  }

  await supabase
    .from('users')
    .update({ password: await bcrypt.hash(password, 10) })
    .eq('id', req.params.id);

  res.json({ success: true });
});

// Activar/desactivar — super_admin cualquiera, company_admin solo sus agentes
router.put('/:id/toggle', authMiddleware, async (req, res) => {
  const { data: user } = await supabase
    .from('users').select('active, company_id, role').eq('id', req.params.id).single();
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (req.user.role === 'company_admin') {
    if (user.company_id !== req.user.company_id || user.role !== 'company_agent')
      return res.status(403).json({ error: 'Sin permiso' });
  } else if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Sin permiso' });
  }

  const newActive = !user.active;
  await supabase.from('users').update({ active: newActive }).eq('id', req.params.id);
  res.json({ id: req.params.id, active: newActive });
});

// Eliminar — super_admin cualquiera, company_admin solo sus agentes
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.params.id === req.user.id)
    return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });

  const { data: user } = await supabase
    .from('users').select('company_id, role').eq('id', req.params.id).single();
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (req.user.role === 'company_admin') {
    if (user.company_id !== req.user.company_id || user.role !== 'company_agent')
      return res.status(403).json({ error: 'Sin permiso' });
  } else if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Sin permiso' });
  }

  const { error } = await supabase.from('users').delete().eq('id', req.params.id);
  if (error) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ success: true });
});

// ── Disponibilidad del agente (cualquier rol) ─────────────────────────────────
router.put('/me/availability', authMiddleware, async (req, res) => {
  const { status } = req.body; // null = desconectado
  await supabase.from('users')
    .update({ availability_status: status || null })
    .eq('id', req.user.id);
  res.json({ ok: true, availability_status: status || null });
});

// ── CRUD de estados de disponibilidad (company_admin) ─────────────────────────
const DEFAULT_STATUSES = [
  { id: '__online', name: 'En línea', color: '#22c55e', sort_order: 0 },
  { id: '__busy',   name: 'Ocupado',  color: '#f59e0b', sort_order: 1 },
  { id: '__away',   name: 'Ausente',  color: '#ef4444', sort_order: 2 },
];

router.get('/availability-statuses', authMiddleware, async (req, res) => {
  const companyId = req.query.company_id || req.user.company_id;
  if (!companyId) return res.status(400).json({ error: 'company_id requerido' });

  const { data, error } = await supabase
    .from('availability_statuses')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data?.length ? data : DEFAULT_STATUSES);
});

router.post('/availability-statuses', authMiddleware, requireCompanyAdmin, async (req, res) => {
  const { name, color, sort_order } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });

  const { data, error } = await supabase
    .from('availability_statuses')
    .insert({ company_id: req.user.company_id, name: name.trim(), color: color || '#22c55e', sort_order: sort_order || 0 })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/availability-statuses/:id', authMiddleware, requireCompanyAdmin, async (req, res) => {
  const { name, color, sort_order } = req.body;

  const { data, error } = await supabase
    .from('availability_statuses')
    .update({ name: name?.trim(), color, sort_order })
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/availability-statuses/:id', authMiddleware, requireCompanyAdmin, async (req, res) => {
  await supabase.from('availability_statuses')
    .delete()
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id);
  res.json({ success: true });
});

module.exports = router;
