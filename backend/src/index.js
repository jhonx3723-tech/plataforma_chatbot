require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./database');
const { authMiddleware } = require('./middleware/auth');

const authRouter          = require('./routes/auth');
const companiesRouter     = require('./routes/companies');
const flowsRouter         = require('./routes/flows');
const webhookRouter       = require('./routes/webhook');
const usersRouter         = require('./routes/users');
const conversationsRouter = require('./routes/conversations');
const eventsRouter        = require('./routes/events');
const dashboardRouter     = require('./routes/dashboard');
const contactsRouter      = require('./routes/contacts');
const templatesRouter     = require('./routes/templates');
const labelsRouter        = require('./routes/labels');
const reportsRouter       = require('./routes/reports');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────────────────
// ALLOWED_ORIGINS en producción: "https://tu-app.netlify.app"
// En local se permite todo para facilitar el desarrollo.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : null;

app.use(cors({
  origin: (origin, cb) => {
    if (!allowedOrigins) return cb(null, true);
    if (!origin)         return cb(null, true);
    if (allowedOrigins.includes('*')) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origen no permitido → ${origin}`));
  },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rutas públicas ─────────────────────────────────────────────────────────────
app.use('/api/auth',    authRouter);
app.use('/webhook',     webhookRouter);

// ── Rutas protegidas ──────────────────────────────────────────────────────────
app.use('/api/companies',     authMiddleware, companiesRouter);
app.use('/api/flows',         authMiddleware, flowsRouter);
app.use('/api/users',         usersRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/events',        eventsRouter);
app.use('/api/dashboard',     dashboardRouter);
app.use('/api/contacts',      contactsRouter);
app.use('/api/templates',     templatesRouter);
app.use('/api/labels',        labelsRouter);
app.use('/api/reports',       reportsRouter);

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── Arranque ──────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✓ Servidor en http://localhost:${PORT}`);
  });
});
