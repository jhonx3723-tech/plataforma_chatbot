const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../supabase');
const { signToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Usuario/correo y contraseña requeridos' });

  const key = username.toLowerCase().trim();

  // Buscar por username primero, luego por email
  let user = null;
  const { data: byUsername } = await supabase
    .from('users').select('*').eq('username', key).limit(1);
  user = byUsername?.[0];

  if (!user) {
    const { data: byEmail } = await supabase
      .from('users').select('*').eq('email', key).limit(1);
    user = byEmail?.[0];
  }

  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });

  if (user.active === false)
    return res.status(403).json({ error: 'Cuenta desactivada. Contacta al administrador.' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

  const payload = {
    id:                  user.id,
    username:            user.username,
    email:               user.email               || null,
    role:                user.role,
    company_id:          user.company_id          || null,
    availability_status: user.availability_status || null,
  };

  res.json({ token: signToken(payload), user: payload });
});

router.put('/password', authMiddleware, async (req, res) => {
  const { current, newPassword } = req.body;
  if (!current || !newPassword)  return res.status(400).json({ error: 'Datos incompletos' });
  if (newPassword.length < 6)    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  const { data: users } = await supabase
    .from('users').select('password').eq('id', req.user.id).limit(1);
  const user = users?.[0];
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const valid = await bcrypt.compare(current, user.password);
  if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

  await supabase
    .from('users')
    .update({ password: await bcrypt.hash(newPassword, 10) })
    .eq('id', req.user.id);

  res.json({ success: true });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
