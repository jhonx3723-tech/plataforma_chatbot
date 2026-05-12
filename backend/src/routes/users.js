const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../supabase');
const { authMiddleware, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

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

router.post('/', authMiddleware, requireSuperAdmin, async (req, res) => {
  const { username, email, password, company_id, role = 'client' } = req.body;

  if (!username || !password || !company_id)
    return res.status(400).json({ error: 'Usuario, contraseña y empresa son requeridos' });
  if (password.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  if (!['client', 'company_agent'].includes(role))
    return res.status(400).json({ error: 'Rol inválido' });
  if (role === 'client' && !email)
    return res.status(400).json({ error: 'El correo es requerido para clientes' });

  const { data: company } = await supabase
    .from('companies').select('id').eq('id', company_id).single();
  if (!company) return res.status(404).json({ error: 'Empresa no encontrada' });

  const { data: dupUser } = await supabase
    .from('users').select('id').eq('username', username.toLowerCase().trim()).limit(1);
  if (dupUser?.length) return res.status(409).json({ error: 'Ese nombre de usuario ya existe' });

  if (email) {
    const { data: dupEmail } = await supabase
      .from('users').select('id').eq('email', email.toLowerCase().trim()).limit(1);
    if (dupEmail?.length) return res.status(409).json({ error: 'Ese correo ya está registrado' });
  }

  if (role === 'client') {
    const { data: existing } = await supabase
      .from('users').select('id').eq('company_id', company_id).eq('role', 'client').limit(1);
    if (existing?.length) return res.status(409).json({ error: 'Esta empresa ya tiene un cliente asignado' });
  }

  if (role === 'company_agent') {
    const { data: existing } = await supabase
      .from('users').select('id').eq('company_id', company_id).eq('role', 'company_agent').limit(1);
    if (existing?.length) return res.status(409).json({ error: 'Esta empresa ya tiene un agente asignado' });
  }

  const { data, error } = await supabase
    .from('users')
    .insert({
      username:   username.toLowerCase().trim(),
      email:      email ? email.toLowerCase().trim() : null,
      password:   await bcrypt.hash(password, 10),
      role,
      company_id,
      active:     true,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const { password: _, ...clean } = data;
  res.status(201).json(clean);
});

router.put('/:id/password', authMiddleware, requireSuperAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6)
    return res.status(400).json({ error: 'Mínimo 6 caracteres' });

  const { data: user } = await supabase
    .from('users').select('id').eq('id', req.params.id).single();
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  await supabase
    .from('users')
    .update({ password: await bcrypt.hash(password, 10) })
    .eq('id', req.params.id);

  res.json({ success: true });
});

router.put('/:id/toggle', authMiddleware, requireSuperAdmin, async (req, res) => {
  const { data: user } = await supabase
    .from('users').select('active').eq('id', req.params.id).single();
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const newActive = !user.active;
  await supabase.from('users').update({ active: newActive }).eq('id', req.params.id);
  res.json({ id: req.params.id, active: newActive });
});

router.delete('/:id', authMiddleware, requireSuperAdmin, async (req, res) => {
  if (req.params.id === req.user.id)
    return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });

  const { error } = await supabase.from('users').delete().eq('id', req.params.id);
  if (error) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ success: true });
});

module.exports = router;
