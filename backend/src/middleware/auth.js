const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'botbuilder_secret_2024';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  // Acepta token en header (normal) o query param (para SSE/EventSource)
  const token = (header?.startsWith('Bearer ') ? header.split(' ')[1] : null) || req.query.token;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Solo el super admin puede hacer esto' });
  }
  next();
}

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '8h' });
}

module.exports = { authMiddleware, requireSuperAdmin, signToken };
